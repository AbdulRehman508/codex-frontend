import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';

import { commonIcons } from '../../../core/icon-images/common-icon';
import { OfficeContextService } from '../../../core/services/office-context.service';
import { PermissionService } from '../../../core/services/permission.service';
import { RolesApiService, Role } from '../../user-management/roles.api';
import { AccessApiService } from './access.api';
import { AccessPermission } from './access.model';

type PermissionKey = 'view' | 'create' | 'edit' | 'delete';

@Component({
  selector: 'app-access',
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule],
  templateUrl: './access.html',
  styleUrl: './access.scss',
})
export class Access {
  private accessApi = inject(AccessApiService);
  private rolesApi = inject(RolesApiService);
  private ctx = inject(OfficeContextService);
  private perm = inject(PermissionService);
  private toast = inject(MessageService);

  commonIcon = commonIcons;

  // may the current user change this matrix? (view-only users see it read-only)
  canEdit = computed(() => this.perm.can('access_control', 'edit'));

  /**
   * Modules only an admin may hand out. Their rows stay in `accessList` (so a
   * non-admin's save never wipes what an admin granted) but are hidden from
   * the grid and skipped by the bulk toggles.
   */
  private readonly adminOnlyModules = ['office'];

  private isVisibleModule(module: string): boolean {
    return this.perm.isAdmin() || !this.adminOnlyModules.includes(module);
  }

  /** rows this user is allowed to see and change */
  visibleList = computed(() =>
    this.accessList().filter((p) => this.isVisibleModule(p.module)),
  );

  // CRUD permission columns rendered in the matrix
  permissionColumns: { key: PermissionKey; label: string }[] = [
    { key: 'view', label: 'View' },
    { key: 'create', label: 'Create' },
    { key: 'edit', label: 'Edit' },
    { key: 'delete', label: 'Delete' },
  ];

  // roles are office-scoped: the header office drives which roles show here
  roleList = signal<Role[]>([]);
  selectedRoleId = signal<number | null>(null);
  searchByKeyword = signal<string>('');
  accessList = signal<AccessPermission[]>([]);
  loading = signal(false);
  saving = signal(false);

  hasOffice = computed(() => !!this.ctx.selectedOfficeId());

  // Apply keyword filter over the visible permissions
  filteredList = computed(() => {
    const keyword = this.searchByKeyword().trim().toLowerCase();
    const list = this.visibleList();
    if (!keyword) return list;
    return list.filter((p) => p.module_label.toLowerCase().includes(keyword));
  });

  // Cluster the filtered rows into ordered sections (catalog keeps same-group
  // entries contiguous, so a single pass groups them correctly).
  sections = computed(() => {
    const out: { group: string | null; rows: AccessPermission[] }[] = [];
    for (const p of this.filteredList()) {
      const g = p.module_group ?? null;
      const last = out[out.length - 1];
      if (last && last.group === g) {
        last.rows.push(p);
      } else {
        out.push({ group: g, rows: [p] });
      }
    }
    return out;
  });

  constructor() {
    // reload roles when the header office changes (skip the initial run)
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      if (first) {
        first = false;
        return;
      }
      this.loadRoles();
    });
  }

  ngOnInit() {
    this.loadRoles();
  }

  // Load the roles for the active office, then the matrix for the first role.
  private loadRoles() {
    const officeId = this.ctx.selectedOfficeId();
    this.searchByKeyword.set('');
    if (!officeId) {
      this.roleList.set([]);
      this.selectedRoleId.set(null);
      this.accessList.set([]);
      return;
    }
    this.rolesApi.listRoles([officeId]).subscribe({
      next: (roles) => {
        this.roleList.set(roles);
        const firstId = roles[0]?.id ?? null;
        this.selectedRoleId.set(firstId);
        if (firstId != null) {
          this.loadAccess();
        } else {
          this.accessList.set([]);
        }
      },
      error: (err) => {
        this.roleList.set([]);
        this.selectedRoleId.set(null);
        this.accessList.set([]);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load roles' });
      },
    });
  }

  // READ — pull the permission set for the active role
  loadAccess() {
    const roleId = this.selectedRoleId();
    if (roleId == null) {
      this.accessList.set([]);
      return;
    }
    this.loading.set(true);
    this.accessApi.getAccess(roleId).subscribe({
      next: (res) => {
        this.accessList.set(res.permissions);
        this.loading.set(false);
      },
      error: (err) => {
        this.accessList.set([]);
        this.loading.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load access' });
      },
    });
  }

  onRoleChange() {
    this.searchByKeyword.set('');
    this.loadAccess();
  }

  clearSearch() {
    this.searchByKeyword.set('');
  }

  // CREATE/UPDATE — toggle a single permission cell
  togglePermission(module: string, key: PermissionKey) {
    if (!this.isVisibleModule(module)) return;
    this.accessList.update((list) =>
      list.map((p) => (p.module === module ? { ...p, [key]: !p[key] } : p)),
    );
  }

  // Toggle every permission for one module row
  isRowAllChecked(p: AccessPermission): boolean {
    return p.view && p.create && p.edit && p.delete;
  }

  toggleRow(module: string, checked: boolean) {
    if (!this.isVisibleModule(module)) return;
    this.accessList.update((list) =>
      list.map((p) =>
        p.module === module
          ? { ...p, view: checked, create: checked, edit: checked, delete: checked }
          : p,
      ),
    );
  }

  // Toggle full access for every module in a section
  isGroupAllChecked(group: string | null): boolean {
    const rows = this.visibleList().filter((p) => (p.module_group ?? null) === group);
    return rows.length > 0 && rows.every((p) => this.isRowAllChecked(p));
  }

  toggleGroup(group: string | null, checked: boolean) {
    this.accessList.update((list) =>
      list.map((p) =>
        (p.module_group ?? null) === group && this.isVisibleModule(p.module)
          ? { ...p, view: checked, create: checked, edit: checked, delete: checked }
          : p,
      ),
    );
  }

  // Toggle one permission across all modules
  isColumnAllChecked(key: PermissionKey): boolean {
    const list = this.visibleList();
    return list.length > 0 && list.every((p) => p[key]);
  }

  toggleColumn(key: PermissionKey, checked: boolean) {
    this.accessList.update((list) =>
      list.map((p) =>
        this.isVisibleModule(p.module) ? { ...p, [key]: checked } : p,
      ),
    );
  }

  // Master toggle — grant/revoke everything for the role
  isAllChecked(): boolean {
    const list = this.visibleList();
    return list.length > 0 && list.every((p) => this.isRowAllChecked(p));
  }

  toggleAll(checked: boolean) {
    this.accessList.update((list) =>
      list.map((p) =>
        this.isVisibleModule(p.module)
          ? { ...p, view: checked, create: checked, edit: checked, delete: checked }
          : p,
      ),
    );
  }

  // UPDATE — persist the matrix for the active role
  saveAccess() {
    if (!this.canEdit()) return;
    const roleId = this.selectedRoleId();
    if (roleId == null) {
      this.toast.add({ severity: 'warn', summary: 'No role', detail: 'Select a role first' });
      return;
    }
    const permissions = this.accessList().map((p) => ({
      module: p.module,
      view: p.view,
      create: p.create,
      edit: p.edit,
      delete: p.delete,
    }));

    this.saving.set(true);
    this.accessApi.saveAccess(roleId, permissions).subscribe({
      next: (res) => {
        this.accessList.set(res.permissions);
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Access updated' });
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Save failed' });
      },
    });
  }

  // Discard local edits — reload the persisted matrix
  resetAccess() {
    this.loadAccess();
  }
}
