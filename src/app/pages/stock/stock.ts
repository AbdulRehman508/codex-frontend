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

import { OfficeContextService } from '../../core/services/office-context.service';
import { PermissionService } from '../../core/services/permission.service';
import { ProductApiService } from '../product-list/product.api';
import { ProductListRow } from '../product-list/product.model';
import { StockApiService } from './stock.api';
import {
  AdjustmentListQuery,
  AdjustmentReason,
  AdjustmentRow,
  AdjustmentType,
  CreateAdjustmentDto,
} from './stock.model';

interface StockStat {
  label: string;
  value: string;
  icon: string;
  tone: 'primary' | 'green' | 'danger' | 'info';
}

@Component({
  selector: 'app-stock',
  imports: [CommonModule, FormsModule, NgSelectModule, DatePickerModule],
  templateUrl: './stock.html',
  styleUrl: './stock.scss',
})
export class Stock {
  private api = inject(StockApiService);
  private productApi = inject(ProductApiService);
  private ctx = inject(OfficeContextService);
  private toast = inject(MessageService);
  perm = inject(PermissionService);
  private search$ = new Subject<string>();
  private productSearch$ = new Subject<string>();

  // module this page is gated by
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
        this.getAdjustments();
      });
    });

    this.productSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          this.searchingProduct.set(true);
          return this.productApi.listProducts({
            office_id: this.ctx.selectedOfficeId() ?? undefined,
            search: term,
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

  rows = signal<AdjustmentRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(10);
  loading = signal(false);

  statEntries = signal(0);
  statIn = signal(0);
  statOut = signal(0);
  statNet = signal(0);

  // filters
  searchTerm = '';
  typeFilter: AdjustmentType | null = null;
  reasonFilter: AdjustmentReason | null = null;
  /** PrimeNG range picker value: [from] or [from, to] */
  dateRange: Date[] | null = null;
  readonly today = new Date();
  private dateFrom = '';
  private dateTo = '';

  typeList: { label: string; value: AdjustmentType }[] = [
    { label: 'Stock In', value: 'increase' },
    { label: 'Stock Out', value: 'decrease' },
    { label: 'Recount', value: 'recount' },
  ];
  reasonList: { label: string; value: AdjustmentReason }[] = [
    { label: 'Damaged', value: 'damaged' },
    { label: 'Lost / Stolen', value: 'lost' },
    { label: 'Expired', value: 'expired' },
    { label: 'Found', value: 'found' },
    { label: 'Customer Return', value: 'return' },
    { label: 'Correction', value: 'correction' },
    { label: 'Other', value: 'other' },
  ];

  sort = signal<AdjustmentListQuery['sort']>('created_at');
  order = signal<'asc' | 'desc'>('desc');

  // ---- the "adjust stock" dialog ----
  dialogOpen = signal(false);
  saving = signal(false);
  form = emptyForm();
  /** the product picked in the dialog, with the count on file */
  picked = signal<ProductListRow | null>(null);
  suggestions = signal<ProductListRow[]>([]);
  suggestOpen = signal(false);
  activeSuggestion = signal(0);
  searchingProduct = signal(false);
  serverErrors = signal<Record<string, string[]>>({});

  @ViewChild('productInput') productInput?: ElementRef<HTMLInputElement>;
  @ViewChild('qtyInput') qtyInput?: ElementRef<HTMLInputElement>;

  hasOffice = computed(() => !!this.ctx.selectedOfficeId());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));

  stats = computed<StockStat[]>(() => [
    { label: 'Entries', value: String(this.statEntries()), icon: 'pi pi-list', tone: 'primary' },
    { label: 'Units In', value: units(this.statIn()), icon: 'pi pi-arrow-up', tone: 'green' },
    { label: 'Units Out', value: units(this.statOut()), icon: 'pi pi-arrow-down', tone: 'danger' },
    {
      label: 'Net Change',
      value: `${this.statNet() > 0 ? '+' : ''}${units(this.statNet())}`,
      icon: 'pi pi-sync',
      tone: 'info',
    },
  ]);

  /** what the count becomes once the dialog is saved */
  resultingQty = computed(() => {
    const p = this.picked();
    if (!p) return null;
    const qty = Number(this.form.quantity) || 0;
    if (this.form.type === 'recount') return qty;
    return this.form.type === 'increase' ? p.quantity + qty : p.quantity - qty;
  });

  /** removing more than the shelf holds */
  overDraw = computed(() => {
    const result = this.resultingQty();
    return result !== null && result < 0;
  });

  /** a recount that changes nothing is a no-op the API refuses */
  noChange = computed(() => {
    const p = this.picked();
    if (!p || this.form.type !== 'recount') return false;
    return (Number(this.form.quantity) || 0) === p.quantity;
  });

  ngOnInit() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchTerm = term;
        this.page.set(1);
        this.getAdjustments();
      });
    this.getAdjustments();
  }

  // ---------- list ----------

  getAdjustments() {
    const officeId = this.ctx.selectedOfficeId();
    // office-scoped: no office selected => nothing to show
    if (!officeId) {
      this.rows.set([]);
      this.total.set(0);
      this.resetStats();
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.api
      .listAdjustments({
        page: this.page(),
        limit: this.limit(),
        search: this.searchTerm,
        office_id: officeId,
        type: this.typeFilter ?? undefined,
        reason: this.reasonFilter ?? undefined,
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
          this.statEntries.set(res.summary?.entries ?? 0);
          this.statIn.set(res.summary?.units_in ?? 0);
          this.statOut.set(res.summary?.units_out ?? 0);
          this.statNet.set(res.summary?.net_units ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load stock history' });
        },
      });
  }

  filterRecord() {
    this.search$.next(this.searchTerm);
  }

  onFilterChange() {
    this.page.set(1);
    this.getAdjustments();
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
    this.typeFilter = null;
    this.reasonFilter = null;
    this.dateRange = null;
    this.dateFrom = '';
    this.dateTo = '';
    this.sort.set('created_at');
    this.order.set('desc');
    this.page.set(1);
    this.getAdjustments();
  }

  changeSort(field: NonNullable<AdjustmentListQuery['sort']>) {
    if (this.sort() === field) {
      this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(field);
      this.order.set('asc');
    }
    this.getAdjustments();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.getAdjustments();
  }

  /** the badge class for a row: in, out or a recount */
  rowDirection(row: AdjustmentRow): 'in' | 'out' {
    return row.after_quantity >= row.before_quantity ? 'in' : 'out';
  }

  reasonLabel(value: string): string {
    return this.reasonList.find((r) => r.value === value)?.label ?? value;
  }

  typeLabel(value: string): string {
    return this.typeList.find((t) => t.value === value)?.label ?? value;
  }

  // ---------- dialog ----------

  openDialog() {
    if (!this.hasOffice()) {
      this.toast.add({ severity: 'warn', summary: 'No office', detail: 'Select an office in the header first' });
      return;
    }
    this.form = emptyForm();
    this.picked.set(null);
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
    this.form.product = product.name;
    this.closeSuggestions();
    // a recount starts from what is on file, so the user edits one number
    if (this.form.type === 'recount') this.form.quantity = product.quantity;
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

  /** delayed so a click on a suggestion still registers before it hides */
  onProductBlur() {
    setTimeout(() => this.closeSuggestions(), 150);
  }

  private closeSuggestions() {
    this.suggestOpen.set(false);
    this.suggestions.set([]);
    this.activeSuggestion.set(0);
  }

  onTypeChange() {
    const p = this.picked();
    // switching to a recount: start from the figure on file
    if (this.form.type === 'recount' && p) {
      this.form.quantity = p.quantity;
    } else if (this.form.type !== 'recount' && p && this.form.quantity === p.quantity) {
      this.form.quantity = 1;
    }
  }

  fieldError(name: string): string | null {
    const errs = this.serverErrors()[name];
    return errs?.length ? errs[0] : null;
  }

  save() {
    this.serverErrors.set({});
    const officeId = this.ctx.selectedOfficeId();
    const product = this.picked();
    if (!officeId) {
      this.toast.add({ severity: 'warn', summary: 'No office', detail: 'Select an office in the header first' });
      return;
    }
    if (!product) {
      this.toast.add({ severity: 'warn', summary: 'Pick a product', detail: 'Choose a product from the suggestions first' });
      return;
    }
    const qty = Number(this.form.quantity);
    if (!Number.isFinite(qty) || qty < 0 || (this.form.type !== 'recount' && qty < 1)) {
      this.toast.add({ severity: 'warn', summary: 'Quantity', detail: 'Enter a valid quantity' });
      return;
    }
    if (this.overDraw()) {
      this.toast.add({ severity: 'warn', summary: 'Not enough stock', detail: `Only ${product.quantity} in stock` });
      return;
    }
    if (this.noChange()) {
      this.toast.add({ severity: 'warn', summary: 'Nothing to change', detail: 'The counted total already matches the figure on file' });
      return;
    }

    const body: CreateAdjustmentDto = {
      office_id: officeId,
      product_id: product.id,
      type: this.form.type,
      reason: this.form.reason,
      quantity: qty,
      note: this.form.note?.trim() || undefined,
    };

    this.saving.set(true);
    this.api.createAdjustment(body).subscribe({
      next: (entry) => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.toast.add({
          severity: 'success',
          summary: 'Stock adjusted',
          detail: `"${entry.product_name}" is now ${entry.after_quantity} in stock`,
        });
        this.page.set(1);
        this.getAdjustments();
      },
      error: (err) => {
        this.saving.set(false);
        const e = err?.error;
        if (e?.errors) this.serverErrors.set(e.errors);
        this.toast.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Adjustment failed' });
      },
    });
  }

  private resetStats() {
    this.statEntries.set(0);
    this.statIn.set(0);
    this.statOut.set(0);
    this.statNet.set(0);
  }
}

interface AdjustForm {
  product: string;
  type: AdjustmentType;
  reason: AdjustmentReason;
  quantity: number;
  note: string;
}

function emptyForm(): AdjustForm {
  return { product: '', type: 'decrease', reason: 'damaged', quantity: 1, note: '' };
}

function units(n: number): string {
  return (n ?? 0).toLocaleString('en-US');
}

/** local yyyy-MM-dd — toISOString() would shift the day by the UTC offset */
function asDate(d: Date): string {
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
