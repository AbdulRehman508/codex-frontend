import { CommonModule } from '@angular/common';
import {
  Component,
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
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ConfirmService } from '../../core/services/confirm.service';
import { OfficeContextService } from '../../core/services/office-context.service';
import { PermissionService } from '../../core/services/permission.service';
import { NewSale } from './new-sale/new-sale';
import { SalesApiService } from './sales.api';
import {
  PaymentMethod,
  Sale,
  SaleListQuery,
  SaleListRow,
  SaleStatus,
} from './sales.model';

interface SaleStat {
  label: string;
  value: string;
  icon: string;
  tone: 'primary' | 'info' | 'green';
}

@Component({
  selector: 'app-sales',
  imports: [CommonModule, FormsModule, NgSelectModule, DatePickerModule, NewSale],
  templateUrl: './sales.html',
  styleUrl: './sales.scss',
})
export class Sales {
  private api = inject(SalesApiService);
  private ctx = inject(OfficeContextService);
  private confirm = inject(ConfirmService);
  private toast = inject(MessageService);
  perm = inject(PermissionService);
  private search$ = new Subject<string>();

  // module this page is gated by
  readonly module = 'sales';

  @ViewChild(NewSale) newSalePopup!: NewSale;

  constructor() {
    // reload when the header office changes (skip the initial run).
    // The reload runs untracked: it reads page/limit/sort and the responses
    // write them back, which would otherwise re-trigger this effect forever.
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      untracked(() => {
        if (first) {
          first = false;
          return;
        }
        this.page.set(1);
        this.loadAll();
      });
    });
  }

  rows = signal<SaleListRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(10);
  loading = signal(false);

  todayTotal = signal(0);
  transactions = signal(0);
  averageOrder = signal(0);
  borrowTotal = signal(0);
  cashTotal = signal(0);
  onlineTotal = signal(0);
  isToday = signal(true);

  searchTerm = '';
  statusFilter: SaleStatus | null = null;
  paymentFilter: PaymentMethod | null = null;
  /** PrimeNG range picker value: [from] or [from, to] */
  dateRange: Date[] | null = null;
  readonly today = new Date();
  private dateFrom = '';
  private dateTo = '';
  statusList: SaleStatus[] = ['completed', 'pending', 'refunded'];
  paymentList: { label: string; value: PaymentMethod }[] = [
    { label: 'Cash', value: 'cash' },
    { label: 'Online', value: 'online' },
  ];
  sort = signal<SaleListQuery['sort']>('created_at');
  order = signal<'asc' | 'desc'>('desc');
  showNewSale = signal(false);

  /** sale currently rendered into the hidden print area */
  printSaleData = signal<Sale | null>(null);

  hasOffice = computed(() => !!this.ctx.selectedOfficeId());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));

  stats = computed<SaleStat[]>(() => [
    {
      label: this.isToday() ? "Today's Sales" : 'Filtered Sales',
      value: this.money(this.todayTotal()),
      icon: 'pi pi-dollar',
      tone: 'primary',
    },
    { label: 'Transactions', value: String(this.transactions()), icon: 'pi pi-receipt', tone: 'info' },
    { label: 'Avg. Order', value: this.money(this.averageOrder()), icon: 'pi pi-chart-line', tone: 'green' },
    { label: 'Borrow Amount', value: this.money(this.borrowTotal()), icon: 'pi pi-wallet', tone: 'info' },
    {
      label: 'Cash / Online',
      value: `${this.money(this.cashTotal())} / ${this.money(this.onlineTotal())}`,
      icon: 'pi pi-credit-card',
      tone: 'green',
    },
  ]);

  /** filters shared by the grid and the stat widgets */
  private filters(officeId: string): SaleListQuery {
    return {
      search: this.searchTerm,
      status: this.statusFilter ?? undefined,
      payment_method: this.paymentFilter ?? undefined,
      date_from: this.dateFrom || undefined,
      date_to: this.dateTo || undefined,
      office_id: officeId,
    };
  }

  ngOnInit() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchTerm = term;
        this.page.set(1);
        this.loadAll();
      });
    this.loadAll();
  }

  private loadAll() {
    this.getSales();
    this.getStats();
  }

  getSales() {
    const officeId = this.ctx.selectedOfficeId();
    // office-scoped: no office selected => nothing to show
    if (!officeId) {
      this.rows.set([]);
      this.total.set(0);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.api
      .listSales({
        ...this.filters(officeId),
        page: this.page(),
        limit: this.limit(),
        sort: this.sort(),
        order: this.order(),
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data);
          this.total.set(res.total);
          this.page.set(res.page);
          this.limit.set(res.limit);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load sales' });
        },
      });
  }

  private getStats() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.todayTotal.set(0);
      this.transactions.set(0);
      this.averageOrder.set(0);
      this.borrowTotal.set(0);
      this.cashTotal.set(0);
      this.onlineTotal.set(0);
      return;
    }
    // same filters as the grid, so the widgets always match what is listed
    this.api.getStats(this.filters(officeId)).subscribe({
      next: (s) => {
        this.todayTotal.set(s.today_total);
        this.transactions.set(s.transactions);
        this.averageOrder.set(s.average_order);
        this.borrowTotal.set(s.borrow_total);
        this.cashTotal.set(s.cash_total);
        this.onlineTotal.set(s.online_total);
        this.isToday.set(s.is_today);
      },
      error: () => {
        // chips are informational — a failure must not block the grid
      },
    });
  }

  filterRecord() {
    this.search$.next(this.searchTerm);
  }

  /** any dropdown / date change reloads both the grid and the widgets */
  onFilterChange() {
    this.page.set(1);
    this.loadAll();
  }

  /**
   * Range picker -> the API's date_from / date_to. Reload only once the range
   * is complete (the picker emits after the first click too) or fully cleared.
   */
  onDateRangeChange() {
    const [from, to] = this.dateRange ?? [];
    if (from && !to) return; // half-picked range: wait for the second click
    this.dateFrom = from ? this.asDate(from) : '';
    this.dateTo = to ? this.asDate(to) : '';
    this.onFilterChange();
  }

  /** local yyyy-MM-dd — toISOString() would shift the day by the UTC offset */
  private asDate(d: Date): string {
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  clearSearch() {
    this.searchTerm = '';
    this.statusFilter = null;
    this.paymentFilter = null;
    this.dateRange = null;
    this.dateFrom = '';
    this.dateTo = '';
    this.sort.set('created_at');
    this.order.set('desc');
    this.page.set(1);
    this.loadAll();
  }

  changeSort(field: NonNullable<SaleListQuery['sort']>) {
    if (this.sort() === field) {
      this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(field);
      this.order.set('asc');
    }
    this.getSales();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.getSales();
  }

  // ---- new / edit ----

  newSale() {
    if (!this.hasOffice()) {
      this.toast.add({ severity: 'warn', summary: 'No office', detail: 'Select an office in the header first' });
      return;
    }
    this.showNewSale.set(true);
  }

  editSale(row: SaleListRow) {
    this.api.getSale(row.id, this.ctx.selectedOfficeId() ?? undefined).subscribe({
      next: (sale) => {
        this.showNewSale.set(true);
        this.newSalePopup.loadOrder(sale);
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load sale' }),
    });
  }

  onOrderSaved() {
    this.loadAll();
  }

  // ---- refund / delete ----

  async refund(row: SaleListRow) {
    if (row.status === 'refunded') return;
    const ok = await this.confirm.confirm({
      header: 'Refund',
      message: `Refund ${row.invoice_no}? The items go back into stock.`,
      acceptLabel: 'Refund',
      danger: true,
    });
    if (!ok) return;
    this.api.patchSale(row.id, { status: 'refunded' }).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Refunded', detail: `${row.invoice_no} refunded` });
        this.loadAll();
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Refund failed' }),
    });
  }

  async deleteSale(row: SaleListRow) {
    if (!(await this.confirm.delete(`sale ${row.invoice_no}`))) return;
    this.api.deleteSale(row.id).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Sale deleted' });
        if (this.rows().length === 1 && this.page() > 1) {
          this.page.update((p) => p - 1);
        }
        this.loadAll();
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Delete failed' }),
    });
  }

  // ---- print ----

  /** Load the full sale, render the receipt, then hand it to the browser. */
  print(row: SaleListRow) {
    this.api.getSale(row.id, this.ctx.selectedOfficeId() ?? undefined).subscribe({
      next: (sale) => {
        this.printSaleData.set(sale);
        // let the receipt render before the print dialog freezes the page
        setTimeout(() => {
          window.print();
          this.printSaleData.set(null);
        }, 100);
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load receipt' }),
    });
  }

  private money(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
