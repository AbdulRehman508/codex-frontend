import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { OfficeContextService } from '../../core/services/office-context.service';
import { PermissionService } from '../../core/services/permission.service';
import { ReportApiService } from './report.api';
import { ReportKey, ReportQuery, ReportRow } from './report.model';

/** How one column is read out of a row, rendered, exported and printed. */
interface Column {
  key: string;
  label: string;
  type: 'text' | 'num' | 'money' | 'date' | 'badge' | 'capital' | 'percent';
  /** sort key the API accepts; omitted = not sortable */
  sort?: string;
  /** right-align numbers */
  right?: boolean;
}

interface Tab {
  key: ReportKey;
  label: string;
  icon: string;
  /** stock is a snapshot — a date range means nothing for it */
  periodic: boolean;
  columns: Column[];
  /** summary tiles: which keys to show and how */
  tiles: {
    key: string;
    label: string;
    money?: boolean;
    percent?: boolean;
    tone?: string;
  }[];
  /** small print under the heading, where the figures need a caveat */
  note?: string;
}

const TABS: Tab[] = [
  {
    key: 'sales',
    label: 'Sales',
    icon: 'pi pi-receipt',
    periodic: true,
    columns: [
      { key: 'invoice_no', label: 'Invoice', type: 'text', sort: 'invoice_no' },
      { key: 'created_at', label: 'Date', type: 'date', sort: 'created_at' },
      { key: 'customer_name', label: 'Customer', type: 'text', sort: 'customer_name' },
      { key: 'items_count', label: 'Items', type: 'num', sort: 'items_count', right: true },
      { key: 'payment_method', label: 'Payment', type: 'capital' },
      { key: 'total', label: 'Total', type: 'money', sort: 'total', right: true },
      { key: 'paid_amount', label: 'Paid', type: 'money', sort: 'paid_amount', right: true },
      { key: 'borrow_amount', label: 'Borrow', type: 'money', sort: 'borrow_amount', right: true },
      { key: 'status', label: 'Status', type: 'badge', sort: 'status' },
    ],
    tiles: [
      { key: 'orders', label: 'Orders' },
      { key: 'net', label: 'Net Sales', money: true, tone: 'primary' },
      { key: 'paid', label: 'Received', money: true },
      { key: 'borrow', label: 'On Credit', money: true, tone: 'info' },
      { key: 'discount', label: 'Discount', money: true },
      { key: 'refunded', label: 'Refunded', money: true, tone: 'danger' },
      { key: 'average_order', label: 'Avg. Order', money: true },
    ],
  },
  {
    key: 'products',
    label: 'Item-wise Sales',
    icon: 'pi pi-box',
    periodic: true,
    columns: [
      { key: 'name', label: 'Product', type: 'text', sort: 'name' },
      { key: 'sku', label: 'SKU', type: 'text' },
      { key: 'quantity', label: 'Units Sold', type: 'num', sort: 'quantity', right: true },
      { key: 'average_price', label: 'Avg. Price', type: 'money', right: true },
      { key: 'revenue', label: 'Revenue', type: 'money', sort: 'revenue', right: true },
      { key: 'cost', label: 'Cost', type: 'money', sort: 'cost', right: true },
      { key: 'profit', label: 'Profit', type: 'money', sort: 'profit', right: true },
      { key: 'margin', label: 'Margin', type: 'percent', right: true },
      { key: 'orders', label: 'Orders', type: 'num', sort: 'orders', right: true },
    ],
    tiles: [
      { key: 'products', label: 'Products Sold' },
      { key: 'quantity', label: 'Units Sold' },
      { key: 'revenue', label: 'Revenue', money: true, tone: 'primary' },
      { key: 'cost', label: 'Cost of Goods', money: true },
      { key: 'profit', label: 'Gross Profit', money: true, tone: 'green' },
      { key: 'margin', label: 'Margin', percent: true, tone: 'info' },
    ],
    // margin is costed at each product's latest landed cost
    note: 'Cost and profit use each product’s latest purchase cost.',
  },
  {
    key: 'stock',
    label: 'Stock on Hand',
    icon: 'pi pi-database',
    periodic: false,
    columns: [
      { key: 'name', label: 'Product', type: 'text', sort: 'name' },
      { key: 'sku', label: 'SKU', type: 'text', sort: 'sku' },
      { key: 'location_code', label: 'Location', type: 'text' },
      { key: 'quantity', label: 'In Stock', type: 'num', sort: 'quantity', right: true },
      { key: 'price', label: 'Price', type: 'money', sort: 'price', right: true },
      { key: 'stock_value', label: 'Stock Value', type: 'money', sort: 'stock_value', right: true },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    tiles: [
      { key: 'products', label: 'Products' },
      { key: 'units', label: 'Units' },
      { key: 'stock_value', label: 'Stock Value', money: true, tone: 'primary' },
      { key: 'low_stock', label: 'Low Stock', tone: 'info' },
      { key: 'out_of_stock', label: 'Out of Stock', tone: 'danger' },
    ],
  },
  {
    key: 'receivables',
    label: 'Receivables',
    icon: 'pi pi-wallet',
    periodic: true,
    columns: [
      { key: 'name', label: 'Customer', type: 'text', sort: 'name' },
      { key: 'mobile_no', label: 'Mobile', type: 'text' },
      { key: 'borrowed_in_period', label: 'Borrowed', type: 'money', sort: 'borrowed_in_period', right: true },
      { key: 'paid_in_period', label: 'Repaid', type: 'money', sort: 'paid_in_period', right: true },
      { key: 'borrow_amount', label: 'Outstanding', type: 'money', sort: 'borrow_amount', right: true },
    ],
    tiles: [
      { key: 'customers', label: 'Customers' },
      { key: 'borrowed_in_period', label: 'Borrowed', money: true },
      { key: 'paid_in_period', label: 'Repaid', money: true },
      { key: 'outstanding', label: 'Outstanding Now', money: true, tone: 'info' },
    ],
  },
  {
    key: 'payables',
    label: 'Payables',
    icon: 'pi pi-truck',
    periodic: true,
    columns: [
      { key: 'name', label: 'Supplier', type: 'text', sort: 'name' },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'mobile_no', label: 'Mobile', type: 'text' },
      { key: 'purchased_in_period', label: 'Purchased', type: 'money', sort: 'purchased_in_period', right: true },
      { key: 'paid_in_period', label: 'Paid', type: 'money', sort: 'paid_in_period', right: true },
      { key: 'payable_amount', label: 'Outstanding', type: 'money', sort: 'payable_amount', right: true },
    ],
    tiles: [
      { key: 'suppliers', label: 'Suppliers' },
      { key: 'purchased_in_period', label: 'Purchased', money: true },
      { key: 'paid_in_period', label: 'Paid', money: true },
      { key: 'outstanding', label: 'Outstanding Now', money: true, tone: 'danger' },
    ],
  },
];

/** rows pulled in one go for export / print */
const EXPORT_LIMIT = 5000;

@Component({
  selector: 'app-report',
  imports: [CommonModule, FormsModule, NgSelectModule, DatePickerModule],
  templateUrl: './report.html',
  styleUrl: './report.scss',
})
export class Report {
  private api = inject(ReportApiService);
  private ctx = inject(OfficeContextService);
  private toast = inject(MessageService);
  perm = inject(PermissionService);
  private search$ = new Subject<string>();

  readonly module = 'reports';
  readonly tabs = TABS;

  tab = signal<Tab>(TABS[0]);
  rows = signal<ReportRow[]>([]);
  summary = signal<Record<string, number>>({});
  total = signal(0);
  page = signal(1);
  limit = signal(25);
  loading = signal(false);
  busy = signal(false);

  // filters
  dateRange: Date[] | null = null;
  readonly today = new Date();
  searchTerm = '';
  statusFilter: string | null = null;
  paymentFilter: string | null = null;
  borrowOnly = false;
  lowOnly = false;
  sort = signal<string | null>(null);
  order = signal<'asc' | 'desc'>('desc');

  statusList = ['completed', 'pending', 'refunded'];
  paymentList = [
    { label: 'Cash', value: 'cash' },
    { label: 'Online', value: 'online' },
  ];

  /** rows rendered into the hidden print sheet */
  printRows = signal<ReportRow[]>([]);
  printedAt = signal<Date | null>(null);

  hasOffice = computed(() => !!this.ctx.selectedOfficeId());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
  periodLabel = computed(() => {
    const [from, to] = this.dateRange ?? [];
    if (!from) return 'All time';
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return to ? `${fmt(from)} — ${fmt(to)}` : fmt(from);
  });

  constructor() {
    // reload when the header office changes (skip the first run). Untracked:
    // loading reads and writes signals that must not become dependencies.
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      untracked(() => {
        if (first) {
          first = false;
          return;
        }
        this.page.set(1);
        this.load();
      });
    });
  }

  ngOnInit() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchTerm = term;
        this.page.set(1);
        this.load();
      });
    this.load();
  }

  // ---------- data ----------

  /** query shared by the grid, the CSV export and the printed sheet */
  private query(extra: Partial<ReportQuery> = {}): ReportQuery {
    const t = this.tab();
    const [from, to] = this.dateRange ?? [];
    const q: ReportQuery = {
      office_id: this.ctx.selectedOfficeId() ?? undefined,
      search: this.searchTerm || undefined,
      sort: this.sort() ?? undefined,
      order: this.order(),
      page: this.page(),
      limit: this.limit(),
      ...extra,
    };
    // a date range only means something for period reports
    if (t.periodic && from) {
      q.date_from = startOfDay(from).toISOString();
      q.date_to = endOfDay(to ?? from).toISOString();
    }
    if (t.key === 'sales') {
      q.status = this.statusFilter ?? undefined;
      q.payment_method = this.paymentFilter ?? undefined;
      if (this.borrowOnly) q.borrow_only = true;
    }
    if (t.key === 'stock' && this.lowOnly) {
      q.low_only = true;
    }
    return q;
  }

  load() {
    if (!this.hasOffice()) {
      this.rows.set([]);
      this.summary.set({});
      this.total.set(0);
      return;
    }
    this.loading.set(true);
    this.api.getReport(this.tab().key, this.query()).subscribe({
      next: (res) => {
        this.rows.set(res.data);
        this.summary.set(res.summary ?? {});
        this.total.set(res.total);
        this.page.set(res.page);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load the report' });
      },
    });
  }

  // ---------- filters ----------

  selectTab(t: Tab) {
    if (t.key === this.tab().key) return;
    this.tab.set(t);
    // each report sorts by its own best column
    this.sort.set(null);
    this.order.set('desc');
    this.page.set(1);
    this.statusFilter = null;
    this.paymentFilter = null;
    this.borrowOnly = false;
    this.lowOnly = false;
    this.load();
  }

  filterRecord() {
    this.search$.next(this.searchTerm);
  }

  onFilterChange() {
    this.page.set(1);
    this.load();
  }

  /** the picker fires on the first click too — wait for a full range */
  onDateRangeChange() {
    const [from, to] = this.dateRange ?? [];
    if (from && !to) return;
    this.onFilterChange();
  }

  setPreset(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    this.dateRange = [startOfDay(from), to];
    this.onFilterChange();
  }

  clearFilters() {
    this.dateRange = null;
    this.searchTerm = '';
    this.statusFilter = null;
    this.paymentFilter = null;
    this.borrowOnly = false;
    this.lowOnly = false;
    this.sort.set(null);
    this.order.set('desc');
    this.page.set(1);
    this.load();
  }

  changeSort(col: Column) {
    if (!col.sort) return;
    if (this.sort() === col.sort) {
      this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(col.sort);
      this.order.set('desc');
    }
    this.load();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.load();
  }

  // ---------- cell rendering ----------

  /** the display string for one cell — also what CSV and print use */
  cell(row: ReportRow, col: Column): string {
    // rows are a union of the four report shapes; the column config is what
    // guarantees the key exists on the row being rendered
    const value = (row as unknown as Record<string, unknown>)[col.key];
    if (value === null || value === undefined || value === '') return '—';
    switch (col.type) {
      case 'money':
        return money(Number(value));
      case 'percent':
        return `${Number(value).toFixed(1)}%`;
      case 'num':
        return Number(value).toLocaleString('en-US');
      case 'date':
        return new Date(String(value)).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      default:
        return String(value);
    }
  }

  tileValue(tile: { key: string; money?: boolean; percent?: boolean }): string {
    const v = this.summary()[tile.key] ?? 0;
    if (tile.percent) return `${v.toFixed(1)}%`;
    return tile.money ? money(v) : v.toLocaleString('en-US');
  }

  // ---------- export & print ----------

  /** Pull every row the current filters match, not just the page on screen. */
  private allRows(): Promise<ReportRow[]> {
    return new Promise((resolve, reject) => {
      this.api
        .getReport(this.tab().key, this.query({ page: 1, limit: EXPORT_LIMIT }))
        .subscribe({ next: (res) => resolve(res.data), error: reject });
    });
  }

  async exportCsv() {
    if (!this.hasOffice() || this.busy()) return;
    this.busy.set(true);
    try {
      const rows = await this.allRows();
      if (!rows.length) {
        this.toast.add({ severity: 'warn', summary: 'Nothing to export', detail: 'This report has no rows' });
        return;
      }
      const cols = this.tab().columns;
      const lines = [
        cols.map((c) => csvCell(c.label)).join(','),
        ...rows.map((r) => cols.map((c) => csvCell(this.cell(r, c))).join(',')),
      ];
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`${this.tab().key}-report-${stamp}.csv`, lines.join('\r\n'));
    } catch (err: any) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Export failed' });
    } finally {
      this.busy.set(false);
    }
  }

  async print() {
    if (!this.hasOffice() || this.busy()) return;
    this.busy.set(true);
    try {
      const rows = await this.allRows();
      this.printRows.set(rows);
      this.printedAt.set(new Date());
      // let the sheet render before the dialog freezes the page
      setTimeout(() => {
        window.print();
        this.printRows.set([]);
      }, 150);
    } catch (err: any) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Could not build the printout' });
    } finally {
      this.busy.set(false);
    }
  }
}

// ---------- pure helpers ----------

function money(n: number): string {
  return (n ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** quote for Excel; a leading =/+/-/@ is prefixed so it is never a formula */
function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, body: string) {
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob([`﻿${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
