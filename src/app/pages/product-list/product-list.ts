import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { commonIcons } from '../../core/icon-images/common-icon';
import { ConfirmService } from '../../core/services/confirm.service';
import { OfficeContextService } from '../../core/services/office-context.service';
import { PermissionService } from '../../core/services/permission.service';
import { LocationApiService } from '../location/location.api';
import { RackListRow } from '../location/location.model';
import { ProductApiService } from './product.api';
import { ProductListQuery, ProductListRow, ProductStatus } from './product.model';

@Component({
  selector: 'app-product-list',
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  private api = inject(ProductApiService);
  private locationApi = inject(LocationApiService);
  private ctx = inject(OfficeContextService);
  private confirm = inject(ConfirmService);
  private toast = inject(MessageService);
  perm = inject(PermissionService);
  private search$ = new Subject<string>();

  // module this list is gated by (create/edit/delete checks in the template)
  readonly module = 'products';

  constructor() {
    // reload when the header office changes (skip the initial run)
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      if (first) {
        first = false;
        return;
      }
      this.searchByRack = null;
      this.page.set(1);
      this.loadRacks();
      this.getProductList();
    });
  }

  commonIcon = commonIcons;

  rows = signal<ProductListRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(10);
  loading = signal(false);

  rackList = signal<RackListRow[]>([]);
  searchByKeyword = '';
  searchByRack: string | null = null;
  sort = signal<ProductListQuery['sort']>('created_at');
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
        this.getProductList();
      });
    this.loadRacks();
    this.getProductList();
  }

  /** racks of the selected office, used by the "filter by rack" dropdown */
  private loadRacks() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.rackList.set([]);
      return;
    }
    this.locationApi
      .listLocations({ office_id: officeId, limit: 200, sort: 'name', order: 'asc' })
      .subscribe({
        next: (res) => this.rackList.set(res.data),
        error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load racks' }),
      });
  }

  getProductList() {
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
      .listProducts({
        page: this.page(),
        limit: this.limit(),
        search: this.searchByKeyword,
        rack_id: this.searchByRack ?? undefined,
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
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load products' });
        },
      });
  }

  filterRecord() {
    this.search$.next(this.searchByKeyword);
  }

  onRackFilterChange() {
    this.page.set(1);
    this.getProductList();
  }

  clearSearch() {
    this.searchByKeyword = '';
    this.searchByRack = null;
    this.sort.set('created_at');
    this.order.set('desc');
    this.page.set(1);
    this.getProductList();
  }

  changeSort(field: NonNullable<ProductListQuery['sort']>) {
    if (this.sort() === field) {
      this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(field);
      this.order.set('asc');
    }
    this.getProductList();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.getProductList();
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
  toggleStatus(row: ProductListRow) {
    if (!this.perm.can(this.module, 'edit')) return;
    const next: ProductStatus = row.status === 'active' ? 'inactive' : 'active';
    this.api.patchProduct(row.id, { status: next }).subscribe({
      next: (updated) => {
        this.rows.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, status: updated.status } : r)));
        this.toast.add({ severity: 'success', summary: 'Updated', detail: `Status set to ${next}` });
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Update failed' }),
    });
  }

  // ---- delete ----
  async deleteOne(row: ProductListRow) {
    if (!(await this.confirm.delete(`product "${row.name}"`))) return;
    this.api.deleteProduct(row.id).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Product deleted' });
        this.afterDelete([row.id]);
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Delete failed' }),
    });
  }

  async bulkDelete() {
    const ids = [...this.selectedIds()];
    if (!ids.length) {
      this.toast.add({ severity: 'warn', summary: 'No selection', detail: 'Select at least one product' });
      return;
    }
    if (!(await this.confirm.delete(`${ids.length} selected product(s)`))) return;
    this.api.bulkDeleteProducts(ids).subscribe({
      next: (res) => {
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: `${res.deleted_count} product(s) deleted` });
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
    this.getProductList();
  }
}
