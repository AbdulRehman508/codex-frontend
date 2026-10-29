import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { ActivatedRoute } from '@angular/router';

import { ConfirmService } from '../../../core/services/confirm.service';
import { OfficeContextService } from '../../../core/services/office-context.service';
import { PermissionService } from '../../../core/services/permission.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { OfficeApiService } from '../../user-management/office/office.api';
import { OfficePick } from '../../user-management/office/office.model';
import { RequestApiService } from './request.api';
import {
  AvailableProduct,
  RequestDirection,
  RequestRow,
  StockRequest,
  StockRequestStatus,
} from './request.model';

/** one line being put together in the dialog */
interface DraftLine {
  product_id: string;
  name: string;
  sku: string;
  unit: string;
  available: number;
  quantity: number;
}

@Component({
  selector: 'app-stock-requests',
  imports: [CommonModule, FormsModule, NgSelectModule, TranslatePipe],
  templateUrl: './requests.html',
  styleUrl: './requests.scss',
})
export class StockRequests {
  private api = inject(RequestApiService);
  private officeApi = inject(OfficeApiService);
  private i18n = inject(TranslationService);
  private ctx = inject(OfficeContextService);
  private confirm = inject(ConfirmService);
  private toast = inject(MessageService);
  private realtime = inject(RealtimeService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  perm = inject(PermissionService);

  private search$ = new Subject<string>();
  private productSearch$ = new Subject<string>();

  // the same access key as the rest of the stock ledger
  readonly module = 'stock';

  constructor() {
    // follow the office in the header, and re-point the event stream with it
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      untracked(() => {
        this.realtime.ensureConnected();
        if (first) {
          first = false;
          return;
        }
        this.page.set(1);
        this.closeDialog();
        this.load();
      });
    });

    this.productSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          this.searchingProduct.set(true);
          // the shelf being asked about is the other branch's, not ours
          return this.api.available(this.sourceOfficeId ?? '', term, 8);
        }),
      )
      .subscribe({
        next: (rows) => {
          this.suggestions.set(rows);
          this.searchingProduct.set(false);
        },
        error: () => {
          this.suggestions.set([]);
          this.searchingProduct.set(false);
        },
      });
  }

  // ---------- list ----------

  rows = signal<RequestRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(10);
  loading = signal(false);
  pendingIncoming = signal(0);
  pendingOutgoing = signal(0);
  /** the row whose lines are open */
  openRow = signal<string | null>(null);
  openDetail = signal<StockRequest | null>(null);

  direction = signal<RequestDirection>('incoming');
  statusFilter: StockRequestStatus | null = null;
  searchTerm = '';

  statusList = computed(() => [
    { label: this.i18n.t('request.pending'), value: 'pending' },
    { label: this.i18n.t('request.approved'), value: 'approved' },
    { label: this.i18n.t('request.declined'), value: 'declined' },
    { label: this.i18n.t('request.cancelled'), value: 'cancelled' },
  ]);

  hasOffice = computed(() => !!this.ctx.selectedOfficeId());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));

  /** a request the bell sent us to, opened once its row has loaded */
  private focusId: string | null = null;

  ngOnInit() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchTerm = term;
        this.page.set(1);
        this.load();
      });

    // arriving from a notification: it says which side the request is on and
    // which one it is, so the screen opens on the right tab with that request
    // already unfolded
    const params = this.route.snapshot.queryParamMap;
    const side = params.get('side');
    if (side === 'incoming' || side === 'outgoing') {
      this.direction.set(side);
    }
    this.focusId = params.get('id');

    this.loadOffices();
    this.load();
    this.listenForAnswers();
  }

  /**
   * Unfold the request the bell pointed at. It is cleared either way: a
   * request that is not on this page (an old one, or one already answered)
   * must not keep re-opening on every later load.
   */
  private openRequested() {
    const id = this.focusId;
    if (!id) return;
    this.focusId = null;

    const row = this.rows().find((r) => r.id === id);
    if (!row) return;
    this.openRow.set(row.id);
    this.openDetail.set(null);
    this.api.getOne(row.id, this.ctx.selectedOfficeId() ?? undefined).subscribe({
      next: (doc) => this.openDetail.set(doc),
      error: () => this.openDetail.set(null),
    });
  }

  /**
   * The whole point of the module: an answer lands on the other branch's
   * screen without anybody reaching for refresh.
   */
  private listenForAnswers() {
    const refresh = (summary: string, detail: string) => {
      this.load();
      this.toast.add({ severity: 'info', summary, detail });
    };

    this.realtime.onWithCleanup(
      'stock-request.created',
      (e) => {
        // only the branch being asked cares about a new one
        if (e.payload['source_office_id'] !== this.ctx.selectedOfficeId()) return;
        refresh(
          this.i18n.t('request.newIncoming'),
          `${e.payload['request_no']} — ${e.payload['requesting_office_name']}`,
        );
      },
      this.destroyRef,
    );

    for (const [type, key] of [
      ['stock-request.approved', 'request.toastApproved'],
      ['stock-request.declined', 'request.toastDeclined'],
      ['stock-request.cancelled', 'request.toastCancelled'],
    ] as const) {
      this.realtime.onWithCleanup(
        type,
        (e) => refresh(this.i18n.t(key), String(e.payload['request_no'] ?? '')),
        this.destroyRef,
      );
    }
  }

  setDirection(direction: RequestDirection) {
    if (direction === this.direction()) return;
    this.direction.set(direction);
    this.openRow.set(null);
    this.page.set(1);
    this.load();
  }

  load() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.rows.set([]);
      this.total.set(0);
      return;
    }
    this.loading.set(true);
    this.api
      .list({
        office_id: officeId,
        direction: this.direction(),
        status: this.statusFilter ?? undefined,
        search: this.searchTerm || undefined,
        page: this.page(),
        limit: this.limit(),
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data);
          this.total.set(res.total);
          this.pendingIncoming.set(res.summary.pending_incoming);
          this.pendingOutgoing.set(res.summary.pending_outgoing);
          this.loading.set(false);
          this.openRequested();
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message ?? 'Failed to load stock requests',
          });
        },
      });
  }

  onSearch(term: string) {
    this.search$.next(term ?? '');
  }

  onFilterChange() {
    this.page.set(1);
    this.load();
  }

  reset() {
    this.searchTerm = '';
    this.statusFilter = null;
    this.page.set(1);
    this.load();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.load();
  }

  /** open the lines of one request, closing whatever was open */
  toggleRow(row: RequestRow) {
    if (this.openRow() === row.id) {
      this.openRow.set(null);
      this.openDetail.set(null);
      return;
    }
    this.openRow.set(row.id);
    this.openDetail.set(null);
    this.api.getOne(row.id, this.ctx.selectedOfficeId() ?? undefined).subscribe({
      next: (doc) => this.openDetail.set(doc),
      error: () => this.openDetail.set(null),
    });
  }

  // ---------- answering ----------

  canAnswer(row: RequestRow): boolean {
    return (
      row.status === 'pending' &&
      row.source_office_id === this.ctx.selectedOfficeId() &&
      this.perm.can(this.module, 'edit')
    );
  }

  canCancel(row: RequestRow): boolean {
    return (
      row.status === 'pending' &&
      row.requesting_office_id === this.ctx.selectedOfficeId() &&
      this.perm.can(this.module, 'create')
    );
  }

  async approve(row: RequestRow) {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) return;
    const yes = await this.confirm.confirm({
      message: `${this.i18n.t('request.confirmApprove')} (${row.request_no})`,
      acceptLabel: this.i18n.t('request.approve'),
    });
    if (!yes) return;

    this.api.approve(row.id, officeId).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: this.i18n.t('request.approved'),
          detail: row.request_no,
        });
        this.load();
      },
      error: (err) =>
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Could not approve the request',
        }),
    });
  }

  // ---- the decline dialog: a "no" has to carry a reason
  declineFor = signal<RequestRow | null>(null);
  declineReason = '';
  declining = signal(false);

  openDecline(row: RequestRow) {
    this.declineReason = '';
    this.declineFor.set(row);
  }

  closeDecline() {
    this.declineFor.set(null);
    this.declineReason = '';
    this.declining.set(false);
  }

  submitDecline() {
    const row = this.declineFor();
    const officeId = this.ctx.selectedOfficeId();
    if (!row || !officeId) return;
    const reason = this.declineReason.trim();
    if (reason.length < 3) {
      this.toast.add({
        severity: 'warn',
        summary: this.i18n.t('request.reasonNeeded'),
        detail: this.i18n.t('request.reasonHint'),
      });
      return;
    }

    this.declining.set(true);
    this.api.decline(row.id, officeId, reason).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: this.i18n.t('request.declined'),
          detail: row.request_no,
        });
        this.closeDecline();
        this.load();
      },
      error: (err) => {
        this.declining.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Could not decline the request',
        });
      },
    });
  }

  async cancel(row: RequestRow) {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) return;
    const yes = await this.confirm.confirm({
      message: `${this.i18n.t('request.confirmCancel')} (${row.request_no})`,
      acceptLabel: this.i18n.t('request.cancelRequest'),
    });
    if (!yes) return;

    this.api.cancel(row.id, officeId).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: this.i18n.t('request.cancelled'),
          detail: row.request_no,
        });
        this.load();
      },
      error: (err) =>
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Could not cancel the request',
        }),
    });
  }

  // ---------- asking ----------

  dialogOpen = signal(false);
  saving = signal(false);
  sourceOfficeId: string | null = null;
  note = '';
  draft = signal<DraftLine[]>([]);
  offices = signal<OfficePick[]>([]);
  serverErrors = signal<Record<string, string[]>>({});

  productTerm = '';
  picked = signal<AvailableProduct | null>(null);
  draftQty = 1;
  suggestions = signal<AvailableProduct[]>([]);
  suggestOpen = signal(false);
  activeSuggestion = signal(0);
  searchingProduct = signal(false);

  @ViewChild('productInput') productInput?: ElementRef<HTMLInputElement>;
  @ViewChild('qtyInput') qtyInput?: ElementRef<HTMLInputElement>;

  /** branches we can ask — never our own */
  sources = computed(() =>
    this.offices().filter((o) => o.id !== this.ctx.selectedOfficeId()),
  );
  draftUnits = computed(() =>
    this.draft().reduce((sum, l) => sum + (Number(l.quantity) || 0), 0),
  );

  private loadOffices() {
    this.officeApi.listMyOffices().subscribe({
      next: (offices) => this.offices.set(offices),
      // the dialog says so when the list is empty; the grid still works
      error: () => this.offices.set([]),
    });
  }

  openDialog() {
    this.sourceOfficeId = null;
    this.note = '';
    this.draft.set([]);
    this.resetPicker();
    this.serverErrors.set({});
    this.dialogOpen.set(true);
  }

  closeDialog() {
    this.dialogOpen.set(false);
    this.saving.set(false);
  }

  /** a different branch means a different shelf: the draft cannot carry over */
  onSourceChange() {
    this.draft.set([]);
    this.resetPicker();
  }

  private resetPicker() {
    this.productTerm = '';
    this.picked.set(null);
    this.draftQty = 1;
    this.suggestions.set([]);
    this.suggestOpen.set(false);
    this.activeSuggestion.set(0);
  }

  onProductInput(term: string) {
    this.picked.set(null);
    if (!this.sourceOfficeId) {
      this.suggestOpen.set(false);
      return;
    }
    this.suggestOpen.set(true);
    this.activeSuggestion.set(0);
    this.productSearch$.next(term ?? '');
  }

  onProductBlur() {
    // let a click on the list land first
    setTimeout(() => this.suggestOpen.set(false), 150);
  }

  onProductKeydown(event: KeyboardEvent) {
    const list = this.suggestions();
    if (!this.suggestOpen() || !list.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeSuggestion.set((this.activeSuggestion() + 1) % list.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeSuggestion.set(
        (this.activeSuggestion() - 1 + list.length) % list.length,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.pickProduct(list[this.activeSuggestion()]);
    } else if (event.key === 'Escape') {
      this.suggestOpen.set(false);
    }
  }

  pickProduct(product: AvailableProduct) {
    this.picked.set(product);
    this.productTerm = product.name;
    this.suggestOpen.set(false);
    this.draftQty = 1;
    setTimeout(() => this.qtyInput?.nativeElement.select(), 0);
  }

  onQtyKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addLine();
    }
  }

  addLine() {
    const product = this.picked();
    if (!product) return;
    const quantity = Number(this.draftQty);
    if (!quantity || quantity < 1) return;

    if (quantity > product.quantity) {
      this.toast.add({
        severity: 'warn',
        summary: this.i18n.t('request.tooMany'),
        detail: `${product.name}: ${product.quantity}`,
      });
      return;
    }

    const existing = this.draft().find((l) => l.product_id === product.product_id);
    if (existing) {
      // asking twice for the same thing is one line, not two
      const merged = existing.quantity + quantity;
      if (merged > product.quantity) {
        this.toast.add({
          severity: 'warn',
          summary: this.i18n.t('request.tooMany'),
          detail: `${product.name}: ${product.quantity}`,
        });
        return;
      }
      this.draft.update((lines) =>
        lines.map((l) =>
          l.product_id === product.product_id ? { ...l, quantity: merged } : l,
        ),
      );
    } else {
      this.draft.update((lines) => [
        ...lines,
        {
          product_id: product.product_id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          available: product.quantity,
          quantity,
        },
      ]);
    }

    this.resetPicker();
    setTimeout(() => this.productInput?.nativeElement.focus(), 0);
  }

  removeLine(index: number) {
    this.draft.update((lines) => lines.filter((_, i) => i !== index));
  }

  overAsked(line: DraftLine): boolean {
    return Number(line.quantity) > line.available;
  }

  submit() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId || !this.sourceOfficeId || !this.draft().length) return;
    if (this.draft().some((l) => this.overAsked(l))) {
      this.toast.add({
        severity: 'warn',
        summary: this.i18n.t('request.tooMany'),
        detail: this.i18n.t('request.tooManyHint'),
      });
      return;
    }

    this.saving.set(true);
    this.serverErrors.set({});
    this.api
      .create({
        office_id: officeId,
        source_office_id: this.sourceOfficeId,
        lines: this.draft().map((l) => ({
          product_id: l.product_id,
          quantity: Number(l.quantity),
        })),
        note: this.note.trim() || undefined,
      })
      .subscribe({
        next: (doc) => {
          this.toast.add({
            severity: 'success',
            summary: this.i18n.t('request.sent'),
            detail: `${doc.request_no} — ${doc.source_office_name}`,
          });
          this.closeDialog();
          this.direction.set('outgoing');
          this.page.set(1);
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.serverErrors.set(err?.error?.errors ?? {});
          this.toast.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message ?? 'Could not send the request',
          });
        },
      });
  }

  fieldError(field: string): string | null {
    return this.serverErrors()[field]?.[0] ?? null;
  }

  // ---------- display ----------

  /** the branch on the other side of this request */
  counterparty(row: RequestRow): string {
    return this.direction() === 'incoming'
      ? row.requesting_office_name
      : row.source_office_name;
  }

  statusKey(status: StockRequestStatus): string {
    return `request.${status}`;
  }
}
