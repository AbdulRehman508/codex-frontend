import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { commonIcons } from '../../../core/icon-images/common-icon';
import { ConfirmService } from '../../../core/services/confirm.service';
import { OfficeContextService } from '../../../core/services/office-context.service';
import { PermissionService } from '../../../core/services/permission.service';
import { CustomerApiService } from './customer.api';
import {
  CustomerListQuery,
  CustomerListRow,
  CustomerStatus,
} from './customer.model';

@Component({
  selector: 'app-customer',
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule],
  templateUrl: './customer.html',
  styleUrl: './customer.scss',
})
export class Customer {
  private api = inject(CustomerApiService);
  private ctx = inject(OfficeContextService);
  private confirm = inject(ConfirmService);
  private toast = inject(MessageService);
  perm = inject(PermissionService);
  private search$ = new Subject<string>();

  // module this list is gated by (create/edit/delete checks in the template)
  readonly module = 'customer';

  constructor() {
    // reload when the header office changes (skip the initial run)
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      // untracked: the reload reads page/limit/sort and the response writes
      // them back, which would otherwise re-trigger this effect forever
      untracked(() => {
        if (first) {
          first = false;
          return;
        }
        this.page.set(1);
        this.getCustomerList();
      });
    });
  }

  commonIcon = commonIcons;

  rows = signal<CustomerListRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(10);
  loading = signal(false);

  statusList: CustomerStatus[] = ['active', 'inactive'];
  searchByKeyword = '';
  searchByStatus: CustomerStatus | null = null;
  sort = signal<CustomerListQuery['sort']>('created_at');
  order = signal<'asc' | 'desc'>('desc');

  selectedIds = signal<Set<string>>(new Set());
  isTableHeaderChecked = false;

  hasOffice = computed(() => !!this.ctx.selectedOfficeId());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));

  ngOnInit() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchByKeyword = term;
        this.page.set(1);
        this.getCustomerList();
      });
    this.getCustomerList();
  }

  getCustomerList() {
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
      .listCustomers({
        page: this.page(),
        limit: this.limit(),
        search: this.searchByKeyword,
        customer_status: this.searchByStatus ?? undefined,
        office_id: officeId,
        sort: this.sort(),
        order: this.order(),
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data);
          this.total.set(res.total);
          this.page.set(res.page);
          this.limit.set(res.limit);
          this.syncHeaderCheckbox();
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load customers' });
        },
      });
  }

  filterRecord() {
    this.search$.next(this.searchByKeyword);
  }

  onStatusFilterChange() {
    this.page.set(1);
    this.getCustomerList();
  }

  clearSearch() {
    this.searchByKeyword = '';
    this.searchByStatus = null;
    this.sort.set('created_at');
    this.order.set('desc');
    this.page.set(1);
    this.getCustomerList();
  }

  changeSort(field: NonNullable<CustomerListQuery['sort']>) {
    if (this.sort() === field) {
      this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(field);
      this.order.set('asc');
    }
    this.getCustomerList();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.getCustomerList();
  }

  // ---- selection ----
  isSelected(id: string) {
    return this.selectedIds().has(id);
  }

  toggleRow(id: string) {
    const next = new Set(this.selectedIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedIds.set(next);
    this.syncHeaderCheckbox();
  }

  checkAll() {
    const next = new Set(this.selectedIds());
    if (this.isTableHeaderChecked) {
      this.rows().forEach((r) => next.add(r.id));
    } else {
      this.rows().forEach((r) => next.delete(r.id));
    }
    this.selectedIds.set(next);
  }

  private syncHeaderCheckbox() {
    const rows = this.rows();
    this.isTableHeaderChecked = rows.length > 0 && rows.every((r) => this.selectedIds().has(r.id));
  }

  // ---- status toggle (PATCH) ----
  toggleStatus(row: CustomerListRow) {
    if (!this.perm.can(this.module, 'edit')) return;
    const next: CustomerStatus = row.customer_status === 'active' ? 'inactive' : 'active';
    this.api.patchCustomer(row.id, { customer_status: next }).subscribe({
      next: (updated) => {
        this.rows.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, customer_status: updated.customer_status } : r)));
        this.toast.add({ severity: 'success', summary: 'Updated', detail: `Status set to ${next}` });
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Update failed' }),
    });
  }

  // ---- delete ----
  async deleteOne(row: CustomerListRow) {
    if (!(await this.confirm.delete(`customer "${row.full_name}"`))) return;
    this.api.deleteCustomer(row.id).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Customer deleted' });
        this.afterDelete([row.id]);
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Delete failed' }),
    });
  }

  async bulkDelete() {
    const ids = [...this.selectedIds()];
    if (!ids.length) {
      this.toast.add({ severity: 'warn', summary: 'No selection', detail: 'Select at least one customer' });
      return;
    }
    if (!(await this.confirm.delete(`${ids.length} selected customer(s)`))) return;
    this.api.bulkDeleteCustomers(ids).subscribe({
      next: (res) => {
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: `${res.deleted_count} customer(s) deleted` });
        this.afterDelete(ids);
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Bulk delete failed' }),
    });
  }

  private afterDelete(ids: string[]) {
    const next = new Set(this.selectedIds());
    ids.forEach((id) => next.delete(id));
    this.selectedIds.set(next);
    // step back a page if the current one is now empty
    if (this.rows().length === ids.length && this.page() > 1) {
      this.page.update((p) => p - 1);
    }
    this.getCustomerList();
  }
}
