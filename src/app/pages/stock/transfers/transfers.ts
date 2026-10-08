import { CommonModule } from '@angular/common';
import {
  Component,
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
import { DatePickerModule } from 'primeng/datepicker';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { ConfirmService } from '../../../core/services/confirm.service';
import { OfficeContextService } from '../../../core/services/office-context.service';
import { PermissionService } from '../../../core/services/permission.service';
import { TokenService } from '../../../core/services/token.service';
import { ProductApiService } from '../../product-list/product.api';
import { ProductListRow } from '../../product-list/product.model';
import { OfficeApiService } from '../../user-management/office/office.api';
import { OfficeListRow } from '../../user-management/office/office.model';
import { StockApiService } from '../stock.api';
import {
  CreateTransferDto,
  StockTransfer,
  TransferListQuery,
  TransferRow,
} from '../stock.model';

/** one line being put together in the dialog */
interface DraftLine {
  product_id: string;
  name: string;
  sku: string;
  available: number;
  unit: string;
  quantity: number;
}

interface TransferStat {
  label: string;
  value: string;
  icon: string;
  tone: 'primary' | 'green' | 'danger' | 'info';
}

@Component({
  selector: 'app-stock-transfers',
  imports: [CommonModule, FormsModule, NgSelectModule, DatePickerModule],
  templateUrl: './transfers.html',
  styleUrl: './transfers.scss',
})
export class StockTransfers {
  private api = inject(StockApiService);
  private productApi = inject(ProductApiService);
  private officeApi = inject(OfficeApiService);
  private ctx = inject(OfficeContextService);
  private token = inject(TokenService);
  private confirm = inject(ConfirmService);
  private toast = inject(MessageService);
  perm = inject(PermissionService);
  private search$ = new Subject<string>();
  private productSearch$ = new Subject<string>();

  // same access key as the adjustments ledger
  readonly module = 'stock';

  constructor() {
    // reload when the header office changes (skip the initial run); untracked
    // because the reload reads page/limit/sort that the response writes back
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      untracked(() => {
        if (first) {
          first = false;
          return;
        }
        this.page.set(1);
        this.getTransfers();
      });
    });

    this.productSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          this.searchingProduct.set(true);
          return this.productApi.listProducts({
            // you can only send what the branch on screen actually holds
            office_id: this.ctx.selectedOfficeId() ?? undefined,
            search: term,
            status: 'active',
            limit: 8,
            sort: 'name',
            order: 'asc',
          });
        }),
      )
      .subscribe({
        next: (res) => {
          this.suggestions.set(res.data);
          this.searchingProduct.set(false);
        },
        error: () => {
          this.suggestions.set([]);
          this.searchingProduct.set(false);
        },
      });
  }

  rows = signal<TransferRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(10);
  loading = signal(false);

  statTransfers = signal(0);
  statUnits = signal(0);

  // filters
  searchTerm = '';
  directionFilter: 'in' | 'out' | null = null;
  includeReversed = false;
  dateRange: Date[] | null = null;
  readonly today = new Date();
  private dateFrom = '';
  private dateTo = '';

  directionList: { label: string; value: 'in' | 'out' }[] = [
    { label: 'Sent out', value: 'out' },
    { label: 'Received', value: 'in' },
  ];

  sort = signal<TransferListQuery['sort']>('created_at');
  order = signal<'asc' | 'desc'>('desc');

  // ---- the "send stock" dialog ----
  dialogOpen = signal(false);
  saving = signal(false);
  toOfficeId: string | null = null;
  note = '';
  draft = signal<DraftLine[]>([]);
  offices = signal<OfficeListRow[]>([]);

  productTerm = '';
  picked = signal<ProductListRow | null>(null);
  pickedUnit = signal('pcs');
  draftQty = 1;
  suggestions = signal<ProductListRow[]>([]);
  suggestOpen = signal(false);
  activeSuggestion = signal(0);
  searchingProduct = signal(false);
  serverErrors = signal<Record<string, string[]>>({});

  @ViewChild('productInput') productInput?: ElementRef<HTMLInputElement>;
  @ViewChild('qtyInput') qtyInput?: ElementRef<HTMLInputElement>;

  hasOffice = computed(() => !!this.ctx.selectedOfficeId());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
  draftUnits = computed(() =>
    this.draft().reduce((sum, l) => sum + (Number(l.quantity) || 0), 0),
  );
  /** offices this user may send to — never the one they are sending from */
  destinations = computed(() =>
    this.offices().filter((o) => o.id !== this.ctx.selectedOfficeId()),
  );

  stats = computed<TransferStat[]>(() => [
    { label: 'Transfers', value: String(this.statTransfers()), icon: 'pi pi-arrow-right-arrow-left', tone: 'primary' },
    { label: 'Units Moved', value: this.statUnits().toLocaleString('en-US'), icon: 'pi pi-box', tone: 'info' },
  ]);

  ngOnInit() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchTerm = term;
        this.page.set(1);
        this.getTransfers();
      });
    this.loadOffices();
    this.getTransfers();
  }

  /** destination dropdown: every office this user is allowed to see */
  private loadOffices() {
    this.officeApi.listOffices({ limit: 200, sort: 'office_name', order: 'asc' }).subscribe({
      next: (res) => this.offices.set(this.token.filterOfficesForUser(res.data)),
      // the dialog warns when the list is empty; the grid still works
      error: () => this.offices.set([]),
    });
  }

  // ---------- list ----------

  getTransfers() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.rows.set([]);
      this.total.set(0);
      this.statTransfers.set(0);
      this.statUnits.set(0);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.api
      .listTransfers({
        page: this.page(),
        limit: this.limit(),
        search: this.searchTerm,
        office_id: officeId,
        direction: this.directionFilter ?? undefined,
        include_deleted: this.includeReversed || undefined,
        date_from: this.dateFrom || undefined,
        date_to: this.dateTo || undefined,
        sort: this.sort(),
        order: this.order(),
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data);
          this.total.set(res.total);
          this.page.set(res.page);
          this.limit.set(res.limit);
          this.statTransfers.set(res.summary?.transfers ?? 0);
          this.statUnits.set(res.summary?.units ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load transfers' });
        },
      });
  }

  filterRecord() {
    this.search$.next(this.searchTerm);
  }

  onFilterChange() {
    this.page.set(1);
    this.getTransfers();
  }

  /** the picker fires on the first click too — wait for a full range */
  onDateRangeChange() {
    const [from, to] = this.dateRange ?? [];
    if (from && !to) return;
    this.dateFrom = from ? asDate(from) : '';
    this.dateTo = to ? asDate(to) : '';
    this.onFilterChange();
  }

  clearSearch() {
    this.searchTerm = '';
    this.directionFilter = null;
    this.includeReversed = false;
    this.dateRange = null;
    this.dateFrom = '';
    this.dateTo = '';
    this.sort.set('created_at');
    this.order.set('desc');
    this.page.set(1);
    this.getTransfers();
  }

  changeSort(field: NonNullable<TransferListQuery['sort']>) {
    if (this.sort() === field) {
      this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(field);
      this.order.set('asc');
    }
    this.getTransfers();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.getTransfers();
  }

  /** seen from the branch on screen: did these units leave or arrive? */
  rowDirection(row: TransferRow): 'in' | 'out' {
    return row.to_office_id === this.ctx.selectedOfficeId() ? 'in' : 'out';
  }

  async reverse(row: TransferRow) {
    const ok = await this.confirm.confirm({
      header: 'Send back',
      message: `Reverse ${row.transfer_no}? The ${row.units} unit(s) go back to ${row.from_office_name}.`,
      acceptLabel: 'Reverse',
      danger: true,
    });
    if (!ok) return;
    this.api.reverseTransfer(row.id).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Reversed', detail: `${row.transfer_no} sent back` });
        this.getTransfers();
      },
      error: (err) =>
        this.toast.add({
          severity: 'error',
          summary: 'Cannot reverse',
          // refused when the far branch has already sold the stock on
          detail: err?.error?.message ?? 'Reversal failed',
        }),
    });
  }

  // ---------- dialog ----------

  openDialog() {
    if (!this.hasOffice()) {
      this.toast.add({ severity: 'warn', summary: 'No office', detail: 'Select an office in the header first' });
      return;
    }
    if (!this.destinations().length) {
      this.toast.add({ severity: 'warn', summary: 'Nowhere to send', detail: 'You have access to only one office' });
      return;
    }
    this.toOfficeId = null;
    this.note = '';
    this.draft.set([]);
    this.resetPick();
    this.serverErrors.set({});
    this.dialogOpen.set(true);
    setTimeout(() => this.productInput?.nativeElement.focus());
  }

  closeDialog() {
    this.dialogOpen.set(false);
    this.closeSuggestions();
  }

  onProductInput(term: string) {
    // typing again detaches from the previously picked product
    this.picked.set(null);
    this.suggestOpen.set(true);
    this.activeSuggestion.set(0);
    if (!term.trim()) {
      this.suggestions.set([]);
      return;
    }
    this.productSearch$.next(term.trim());
  }

  pickProduct(product: ProductListRow) {
    this.picked.set(product);
    this.productTerm = product.name;
    this.draftQty = Math.min(1, product.quantity) || 1;
    this.closeSuggestions();
    // the list row is slim; the unit label comes from the detail
    this.productApi
      .getProduct(product.id, this.ctx.selectedOfficeId() ?? undefined)
      .subscribe({
        next: (full) => {
          if (this.picked()?.id === product.id) this.pickedUnit.set(full.unit ?? 'pcs');
        },
        error: () => this.pickedUnit.set('pcs'),
      });
    setTimeout(() => {
      this.qtyInput?.nativeElement.focus();
      this.qtyInput?.nativeElement.select();
    });
  }

  /** ↑/↓ walk the list, Enter picks, Esc closes */
  onProductKeydown(event: KeyboardEvent) {
    const list = this.suggestions();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!this.suggestOpen() || !list.length) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.activeSuggestion.set(
        (this.activeSuggestion() + step + list.length) % list.length,
      );
      return;
    }
    if (event.key === 'Escape') {
      this.closeSuggestions();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const highlighted = this.suggestOpen() ? list[this.activeSuggestion()] : undefined;
    if (highlighted) this.pickProduct(highlighted);
  }

  onQtyKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.addLine();
  }

  /** Put the picked product on the transfer; adding it twice tops it up. */
  addLine() {
    const product = this.picked();
    if (!product) {
      this.toast.add({ severity: 'warn', summary: 'Pick a product', detail: 'Choose a product from the suggestions first' });
      this.productInput?.nativeElement.focus();
      return;
    }
    const qty = Number(this.draftQty) || 0;
    if (qty < 1) {
      this.toast.add({ severity: 'warn', summary: 'Quantity', detail: 'Enter a quantity of 1 or more' });
      return;
    }
    const list = [...this.draft()];
    const existing = list.find((l) => l.product_id === product.id);
    const wanted = (existing?.quantity ?? 0) + qty;
    if (wanted > product.quantity) {
      this.toast.add({
        severity: 'warn',
        summary: 'Not enough stock',
        detail: `"${product.name}" has only ${product.quantity} here`,
      });
      return;
    }
    if (existing) {
      existing.quantity = wanted;
    } else {
      list.push({
        product_id: product.id,
        name: product.name,
        sku: '',
        available: product.quantity,
        unit: this.pickedUnit(),
        quantity: qty,
      });
    }
    this.draft.set(list);
    this.resetPick();
    setTimeout(() => this.productInput?.nativeElement.focus());
  }

  removeLine(index: number) {
    this.draft.update((list) => list.filter((_, i) => i !== index));
  }

  updateLineQty(index: number, quantity: number) {
    this.draft.update((list) =>
      list.map((l, i) => (i === index ? { ...l, quantity } : l)),
    );
  }

  overStock(line: DraftLine): boolean {
    return (Number(line.quantity) || 0) > line.available;
  }

  /** delayed so a click on a suggestion still registers before it hides */
  onProductBlur() {
    setTimeout(() => this.closeSuggestions(), 150);
  }

  private closeSuggestions() {
    this.suggestOpen.set(false);
    this.suggestions.set([]);
    this.activeSuggestion.set(0);
  }

  private resetPick() {
    this.productTerm = '';
    this.draftQty = 1;
    this.picked.set(null);
    this.pickedUnit.set('pcs');
    this.closeSuggestions();
  }

  fieldError(name: string): string | null {
    const errs = this.serverErrors()[name];
    return errs?.length ? errs[0] : null;
  }

  send() {
    this.serverErrors.set({});
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) return;
    if (!this.toOfficeId) {
      this.toast.add({ severity: 'warn', summary: 'Destination', detail: 'Choose the branch to send to' });
      return;
    }
    const lines = this.draft();
    if (!lines.length) {
      this.toast.add({ severity: 'warn', summary: 'No items', detail: 'Add at least one product' });
      return;
    }
    if (lines.some((l) => this.overStock(l))) {
      this.toast.add({ severity: 'warn', summary: 'Not enough stock', detail: 'One of the lines is over what this branch holds' });
      return;
    }

    const body: CreateTransferDto = {
      office_id: officeId,
      to_office_id: this.toOfficeId,
      lines: lines.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity) || 0 })),
      note: this.note?.trim() || undefined,
    };

    this.saving.set(true);
    this.api.createTransfer(body).subscribe({
      next: (transfer: StockTransfer) => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.toast.add({
          severity: 'success',
          summary: 'Stock sent',
          detail: `${transfer.transfer_no}: ${transfer.units} unit(s) to ${transfer.to_office_name}`,
        });
        this.page.set(1);
        this.getTransfers();
      },
      error: (err) => {
        this.saving.set(false);
        const e = err?.error;
        if (e?.errors) this.serverErrors.set(e.errors);
        this.toast.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Transfer failed' });
      },
    });
  }
}

/** local yyyy-MM-dd — toISOString() would shift the day by the UTC offset */
function asDate(d: Date): string {
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
