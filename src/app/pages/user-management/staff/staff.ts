import { Component, computed, inject, signal } from '@angular/core';
import { commonIcons } from '../../../core/icon-images/common-icon';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { StaffApiService } from './staff.api';
import { StaffListQuery, StaffListRow, StaffStatus } from './staff.model';
import { RolesApiService, Role } from '../roles.api';

@Component({
  selector: 'app-staff',
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule],
  templateUrl: './staff.html',
  styleUrl: './staff.scss',
})
export class Staff {
  private api = inject(StaffApiService);
  private rolesApi = inject(RolesApiService);
  private toast = inject(MessageService);
  private search$ = new Subject<string>();

  commonIcon = commonIcons;

  rows = signal<StaffListRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(10);
  loading = signal(false);

  roleList = signal<Role[]>([]);
  searchByKeyword = '';
  searchByRole: number | null = null;
  sort = signal<StaffListQuery['sort']>('created_at');
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
        this.getStaffList();
      });
    this.loadRoles();
    this.getStaffList();
  }

  private loadRoles() {
    this.rolesApi.listRoles().subscribe({
      next: (roles) => this.roleList.set(roles),
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load roles' }),
    });
  }

  getStaffList() {
    this.loading.set(true);
    this.api
      .listStaff({
        page: this.page(),
        limit: this.limit(),
        search: this.searchByKeyword,
        role_id: this.searchByRole ?? undefined,
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
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load staff' });
        },
      });
  }

  filterRecord() {
    this.search$.next(this.searchByKeyword);
  }

  onRoleFilterChange() {
    this.page.set(1);
    this.getStaffList();
  }

  clearSearch() {
    this.searchByKeyword = '';
    this.searchByRole = null;
    this.sort.set('created_at');
    this.order.set('desc');
    this.page.set(1);
    this.getStaffList();
  }

  changeSort(field: NonNullable<StaffListQuery['sort']>) {
    if (this.sort() === field) {
      this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(field);
      this.order.set('asc');
    }
    this.getStaffList();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.getStaffList();
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
  toggleStatus(row: StaffListRow) {
    const next: StaffStatus = row.staff_status === 'active' ? 'inactive' : 'active';
    this.api.patchStaff(row.id, { staff_status: next }).subscribe({
      next: (updated) => {
        this.rows.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, staff_status: updated.staff_status } : r)));
        this.toast.add({ severity: 'success', summary: 'Updated', detail: `Status set to ${next}` });
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Update failed' }),
    });
  }

  // ---- delete ----
  deleteOne(row: StaffListRow) {
    if (!confirm(`Delete staff "${row.full_name}"?`)) return;
    this.api.deleteStaff(row.id).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Staff deleted' });
        this.afterDelete([row.id]);
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Delete failed' }),
    });
  }

  bulkDelete() {
    const ids = [...this.selectedIds()];
    if (!ids.length) {
      this.toast.add({ severity: 'warn', summary: 'No selection', detail: 'Select at least one staff member' });
      return;
    }
    if (!confirm(`Delete ${ids.length} selected staff member(s)?`)) return;
    this.api.bulkDeleteStaff(ids).subscribe({
      next: (res) => {
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: `${res.deleted_count} staff member(s) deleted` });
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
    this.getStaffList();
  }
}
