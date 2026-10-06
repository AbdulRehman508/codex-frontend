import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ConfirmService } from '../../../core/services/confirm.service';
import { OfficeContextService } from '../../../core/services/office-context.service';
import { PermissionService } from '../../../core/services/permission.service';
import { PurchaseApiService } from '../purchase.api';
import {
  PurchaseListQuery,
  PurchaseListRow,
  PurchaseStatus,
  SupplierListRow,
} from '../purchase.model';

interface PurchaseStat {
  label: string;
  value: string;
  icon: string;
  tone: 'primary' | 'info' | 'green' | 'danger';
}

@Component({
  selector: 'app-purchases',
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule, DatePickerModule],
  templateUrl: './purchases.html',
  styleUrl: './purchases.scss',
})
export class Purchases {
  private api = inject(PurchaseApiService);
  private ctx = inject(OfficeContextService);
  private confirm = inject(ConfirmService);
  private toast = inject(MessageService);
  perm = inject(PermissionService);
  private search$ = new Subject<string>();

  // module this page is gated by
  readonly module = 'purchase';

  constructor() {
    // reload when the header office changes (skip the initial run). The
    // reload runs untracked: it reads page/limit/sort and the response writes
    // them back, which would otherwise re-trigger this effect forever.
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      untracked(() => {
        if (first) {
          first = false;
          return;
        }
        this.page.set(1);
        this.supplierFilter = null;
        this.loadSuppliers();
        this.getPurchases();
      });
    });
  }

  rows = signal<PurchaseListRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(10);
  loading = signal(false);

  // summary for the widgets — comes back with the same filters as the grid
  statPurchases = signal(0);
  statTotal = signal(0);
  statPaid = signal(0);
  statDue = signal(0);

  // filters
  searchTerm = '';
  statusFilter: PurchaseStatus | null = null;
  supplierFilter: string | null = null;
  dueOnly = false;
  /** PrimeNG range picker value: [from] or [from, to] */
  dateRange: Date[] | null = null;
  readonly today = new Date();
  private dateFrom = '';
  private dateTo = '';

  statusList: { label: string; value: PurchaseStatus }[] = [
    { label: 'Received', value: 'received' },
    { label: 'Ordered', value: 'ordered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];
  suppliers = signal<SupplierListRow[]>([]);

  sort = signal<PurchaseListQuery['sort']>('created_at');
  order = signal<'asc' | 'desc'>('desc');

  hasOffice = computed(() => !!this.ctx.selectedOfficeId());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));

  stats = computed<PurchaseStat[]>(() => [
    { label: 'Purchases', value: String(this.statPurchases()), icon: 'pi pi-shopping-bag', tone: 'primary' },
    { label: 'Purchase Value', value: this.money(this.statTotal()), icon: 'pi pi-dollar', tone: 'info' },
    { label: 'Paid', value: this.money(this.statPaid()), icon: 'pi pi-check-circle', tone: 'green' },
    { label: 'Payable', value: this.money(this.statDue()), icon: 'pi pi-wallet', tone: 'danger' },
  ]);

  ngOnInit() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchTerm = term;
        this.page.set(1);
        this.getPurchases();
      });
    this.loadSuppliers();
    this.getPurchases();
  }

  /** supplier dropdown for the filter bar */
  private loadSuppliers() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.suppliers.set([]);
      return;
    }
    this.api
      .listSuppliers({ office_id: officeId, limit: 200, sort: 'name', order: 'asc' })
      .subscribe({
        next: (res) => this.suppliers.set(res.data),
        // the filter is a convenience — a failure must not block the grid
        error: () => this.suppliers.set([]),
      });
  }

  getPurchases() {
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
      .listPurchases({
        page: this.page(),
        limit: this.limit(),
        search: this.searchTerm,
        office_id: officeId,
        supplier_id: this.supplierFilter ?? undefined,
        status: this.statusFilter ?? undefined,
        due_only: this.dueOnly || undefined,
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
          this.statPurchases.set(res.summary?.purchases ?? 0);
          this.statTotal.set(res.summary?.total ?? 0);
          this.statPaid.set(res.summary?.paid ?? 0);
          this.statDue.set(res.summary?.due ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load purchases' });
        },
      });
  }

  filterRecord() {
    this.search$.next(this.searchTerm);
  }

  /** any dropdown / date change reloads the grid and the widgets with it */
  onFilterChange() {
    this.page.set(1);
    this.getPurchases();
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
    this.supplierFilter = null;
    this.dueOnly = false;
    this.dateRange = null;
    this.dateFrom = '';
    this.dateTo = '';
    this.sort.set('created_at');
    this.order.set('desc');
    this.page.set(1);
    this.getPurchases();
  }

  changeSort(field: NonNullable<PurchaseListQuery['sort']>) {
    if (this.sort() === field) {
      this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(field);
      this.order.set('asc');
    }
    this.getPurchases();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.getPurchases();
  }

  async deletePurchase(row: PurchaseListRow) {
    const ok = await this.confirm.confirm({
      header: 'Delete purchase',
      message: `Delete ${row.purchase_no}? The received stock and the supplier payable are both reversed.`,
      acceptLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.api.deletePurchase(row.id).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: `${row.purchase_no} deleted` });
        if (this.rows().length === 1 && this.page() > 1) {
          this.page.update((p) => p - 1);
        }
        this.getPurchases();
      },
      error: (err) =>
        this.toast.add({
          severity: 'error',
          summary: 'Cannot delete',
          // the API refuses when the received stock has already been sold on
          detail: err?.error?.message ?? 'Delete failed',
        }),
    });
  }

  private resetStats() {
    this.statPurchases.set(0);
    this.statTotal.set(0);
    this.statPaid.set(0);
    this.statDue.set(0);
  }

  private money(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
