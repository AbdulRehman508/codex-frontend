import { Component, computed, inject, signal } from '@angular/core';
import { commonIcons } from '../../../core/icon-images/common-icon';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { OfficeApiService } from './office.api';
import { OfficeListQuery, OfficeListRow, OfficeStatus } from './office.model';

@Component({
  selector: 'app-office',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './office.html',
  styleUrl: './office.scss',
})
export class Office {
  private api = inject(OfficeApiService);
  private toast = inject(MessageService);
  private search$ = new Subject<string>();

  commonIcon = commonIcons;

  rows = signal<OfficeListRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(10);
  loading = signal(false);

  searchByKeyword = '';
  sort = signal<OfficeListQuery['sort']>('created_at');
  order = signal<'asc' | 'desc'>('desc');

  selectedIds = signal<Set<string>>(new Set());
  isTableHeaderChecked = false;

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));

  ngOnInit() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchByKeyword = term;
        this.page.set(1);
        this.getOfficeList();
      });
    this.getOfficeList();
  }

  getOfficeList() {
    this.loading.set(true);
    this.api
      .listOffices({
        page: this.page(),
        limit: this.limit(),
        search: this.searchByKeyword,
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
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load offices' });
        },
      });
  }

  filterRecord() {
    this.search$.next(this.searchByKeyword);
  }

  clearSearch() {
    this.searchByKeyword = '';
    this.sort.set('created_at');
    this.order.set('desc');
    this.page.set(1);
    this.getOfficeList();
  }

  changeSort(field: NonNullable<OfficeListQuery['sort']>) {
    if (this.sort() === field) {
      this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(field);
      this.order.set('asc');
    }
    this.getOfficeList();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.getOfficeList();
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
  toggleStatus(row: OfficeListRow) {
    const next: OfficeStatus = row.office_status === 'active' ? 'inactive' : 'active';
    this.api.patchOffice(row.id, { office_status: next }).subscribe({
      next: (updated) => {
        this.rows.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, office_status: updated.office_status } : r)));
        this.toast.add({ severity: 'success', summary: 'Updated', detail: `Status set to ${next}` });
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Update failed' }),
    });
  }

  // ---- delete ----
  deleteOne(row: OfficeListRow) {
    if (!confirm(`Delete office "${row.office_name}"?`)) return;
    this.api.deleteOffice(row.id).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Office deleted' });
        this.afterDelete([row.id]);
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Delete failed' }),
    });
  }

  bulkDelete() {
    const ids = [...this.selectedIds()];
    if (!ids.length) {
      this.toast.add({ severity: 'warn', summary: 'No selection', detail: 'Select at least one office' });
      return;
    }
    if (!confirm(`Delete ${ids.length} selected office(s)?`)) return;
    this.api.bulkDeleteOffices(ids).subscribe({
      next: (res) => {
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: `${res.deleted_count} office(s) deleted` });
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
    this.getOfficeList();
  }
}
