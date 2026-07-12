import { Component, computed, effect, inject, signal } from '@angular/core';
import { commonIcons } from '../../../core/icon-images/common-icon';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { RoleApiService } from './role.api';
import { RoleListQuery, RoleListRow } from './role.model';
import { OfficeContextService } from '../../../core/services/office-context.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { PermissionService } from '../../../core/services/permission.service';

@Component({
  selector: 'app-role',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './role.html',
  styleUrl: './role.scss',
})
export class Role {
  private api = inject(RoleApiService);
  private ctx = inject(OfficeContextService);
  private confirm = inject(ConfirmService);
  private toast = inject(MessageService);
  perm = inject(PermissionService);
  private search$ = new Subject<string>();

  // module this list is gated by (create/edit/delete checks in the template)
  readonly module = 'role';

  commonIcon = commonIcons;

  rows = signal<RoleListRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(10);
  loading = signal(false);

  searchByKeyword = '';

  sort = signal<RoleListQuery['sort']>('id');
  order = signal<'asc' | 'desc'>('desc');

  selectedIds = signal<Set<number>>(new Set());
  isTableHeaderChecked = false;

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));

  constructor() {
    // reload when the header office changes (skip the initial run)
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      if (first) {
        first = false;
        return;
      }
      this.page.set(1);
      this.getRoleList();
    });
  }

  ngOnInit() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchByKeyword = term;
        this.page.set(1);
        this.getRoleList();
      });
    this.getRoleList();
  }

  getRoleList() {
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
      .listRoles({
        page: this.page(),
        limit: this.limit(),
        search: this.searchByKeyword,
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
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load roles' });
        },
      });
  }

  filterRecord() {
    this.search$.next(this.searchByKeyword);
  }

  clearSearch() {
    this.searchByKeyword = '';
    this.sort.set('id');
    this.order.set('desc');
    this.page.set(1);
    this.getRoleList();
  }

  changeSort(field: NonNullable<RoleListQuery['sort']>) {
    if (this.sort() === field) {
      this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(field);
      this.order.set('asc');
    }
    this.getRoleList();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.getRoleList();
  }

  // ---- selection ----
  isSelected(id: number) {
    return this.selectedIds().has(id);
  }

  toggleRow(id: number) {
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

  // ---- delete ----
  async deleteOne(row: RoleListRow) {
    if (!(await this.confirm.delete(`role "${row.role}"`))) return;
    this.api.deleteRole(row.id).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Role deleted' });
        this.afterDelete([row.id]);
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Delete failed' }),
    });
  }

  async bulkDelete() {
    const ids = [...this.selectedIds()];
    if (!ids.length) {
      this.toast.add({ severity: 'warn', summary: 'No selection', detail: 'Select at least one role' });
      return;
    }
    if (!(await this.confirm.delete(`${ids.length} selected role(s)`))) return;
    this.api.bulkDeleteRoles(ids).subscribe({
      next: (res) => {
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: `${res.deleted_count} role(s) deleted` });
        this.afterDelete(ids);
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Bulk delete failed' }),
    });
  }

  private afterDelete(ids: number[]) {
    const next = new Set(this.selectedIds());
    ids.forEach((id) => next.delete(id));
    this.selectedIds.set(next);
    // step back a page if the current one is now empty
    if (this.rows().length === ids.length && this.page() > 1) {
      this.page.update((p) => p - 1);
    }
    this.getRoleList();
  }
}
