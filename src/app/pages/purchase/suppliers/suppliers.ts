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
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ConfirmService } from '../../../core/services/confirm.service';
import { OfficeContextService } from '../../../core/services/office-context.service';
import { PermissionService } from '../../../core/services/permission.service';
import { PurchaseApiService } from '../purchase.api';
import {
  SupplierListQuery,
  SupplierListRow,
  SupplierStatus,
} from '../purchase.model';

@Component({
  selector: 'app-suppliers',
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule],
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.scss',
})
export class Suppliers {
  private api = inject(PurchaseApiService);
  private ctx = inject(OfficeContextService);
  private confirm = inject(ConfirmService);
  private toast = inject(MessageService);
  perm = inject(PermissionService);
  private search$ = new Subject<string>();

  // module this list is gated by
  readonly module = 'supplier';

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
        this.getSuppliers();
      });
    });
  }

  rows = signal<SupplierListRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(10);
  loading = signal(false);

  searchTerm = '';
  statusFilter: SupplierStatus | null = null;
  statusList: SupplierStatus[] = ['active', 'inactive'];
  sort = signal<SupplierListQuery['sort']>('created_at');
  order = signal<'asc' | 'desc'>('desc');

  hasOffice = computed(() => !!this.ctx.selectedOfficeId());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
  /** what this page's suppliers are owed — a running figure, not a grand total */
  pagePayable = computed(() =>
    this.rows().reduce((sum, r) => sum + (r.payable_amount ?? 0), 0),
  );

  ngOnInit() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchTerm = term;
        this.page.set(1);
        this.getSuppliers();
      });
    this.getSuppliers();
  }

  getSuppliers() {
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
      .listSuppliers({
        page: this.page(),
        limit: this.limit(),
        search: this.searchTerm,
        office_id: officeId,
        status: this.statusFilter ?? undefined,
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
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load suppliers' });
        },
      });
  }

  filterRecord() {
    this.search$.next(this.searchTerm);
  }

  onFilterChange() {
    this.page.set(1);
    this.getSuppliers();
  }

  clearSearch() {
    this.searchTerm = '';
    this.statusFilter = null;
    this.sort.set('created_at');
    this.order.set('desc');
    this.page.set(1);
    this.getSuppliers();
  }

  changeSort(field: NonNullable<SupplierListQuery['sort']>) {
    if (this.sort() === field) {
      this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(field);
      this.order.set('asc');
    }
    this.getSuppliers();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.getSuppliers();
  }

  toggleStatus(row: SupplierListRow) {
    if (!this.perm.can(this.module, 'edit')) return;
    const next: SupplierStatus = row.status === 'active' ? 'inactive' : 'active';
    this.api.patchSupplier(row.id, { status: next }).subscribe({
      next: (updated) => {
        this.rows.update((rows) =>
          rows.map((r) => (r.id === row.id ? { ...r, status: updated.status } : r)),
        );
        this.toast.add({ severity: 'success', summary: 'Updated', detail: `Status set to ${next}` });
      },
      error: (err) =>
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Update failed' }),
    });
  }

  async deleteOne(row: SupplierListRow) {
    if (!(await this.confirm.delete(`supplier "${row.name}"`))) return;
    this.api.deleteSupplier(row.id).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Supplier deleted' });
        if (this.rows().length === 1 && this.page() > 1) {
          this.page.update((p) => p - 1);
        }
        this.getSuppliers();
      },
      error: (err) =>
        this.toast.add({
          severity: 'error',
          summary: 'Cannot delete',
          // the API refuses while there is still a balance owed
          detail: err?.error?.message ?? 'Delete failed',
        }),
    });
  }
}
