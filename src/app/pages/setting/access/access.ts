import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { commonIcons } from '../../../core/icon-images/common-icon';

type PermissionKey = 'view' | 'create' | 'edit' | 'delete';

interface AccessPermission {
  moduleId: number;
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

@Component({
  selector: 'app-access',
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule],
  templateUrl: './access.html',
  styleUrl: './access.scss',
})
export class Access {

  commonIcon = commonIcons;

  // CRUD permission columns rendered in the matrix
  permissionColumns: { key: PermissionKey; label: string }[] = [
    { key: 'view', label: 'View' },
    { key: 'create', label: 'Create' },
    { key: 'edit', label: 'Edit' },
    { key: 'delete', label: 'Delete' },
  ];

  // Roles to scope access against (mock until API is wired)
  roleList: { id: number; role: string }[] = [
    { id: 1, role: 'Admin' },
    { id: 2, role: 'Manager' },
    { id: 3, role: 'Staff' },
  ];

  // Modules whose access is controlled per role
  private readonly modules: { id: number; name: string }[] = [
    { id: 1, name: 'Dashboard' },
    { id: 2, name: 'Sales' },
    { id: 3, name: 'Stock' },
    { id: 4, name: 'Products' },
    { id: 5, name: 'Reports' },
    { id: 6, name: 'User Management' },
    { id: 7, name: 'Settings' },
  ];

  selectedRoleId = signal<number | null>(null);
  searchByKeyword = signal<string>('');
  accessList = signal<AccessPermission[]>([]);

  // Apply keyword filter over loaded permissions
  filteredList = computed(() => {
    const keyword = this.searchByKeyword().trim().toLowerCase();
    const list = this.accessList();
    if (!keyword) return list;
    return list.filter(p => p.module.toLowerCase().includes(keyword));
  });

  ngOnInit() {
    this.selectedRoleId.set(this.roleList[0]?.id ?? null);
    this.loadAccess();
  }

  // READ — pull the permission set for the active role
  loadAccess() {
    const roleId = this.selectedRoleId();
    if (roleId == null) {
      this.accessList.set([]);
      return;
    }
    // Admin gets full access by default; others start blank (replace with API call)
    const fullAccess = roleId === 1;
    this.accessList.set(
      this.modules.map(m => ({
        moduleId: m.id,
        module: m.name,
        view: fullAccess,
        create: fullAccess,
        edit: fullAccess,
        delete: fullAccess,
      }))
    );
  }

  onRoleChange() {
    this.searchByKeyword.set('');
    this.loadAccess();
  }

  filterRecord() {
    // computed filteredList reacts to searchByKeyword automatically
  }

  clearSearch() {
    this.searchByKeyword.set('');
  }

  // CREATE/UPDATE — toggle a single permission cell
  togglePermission(moduleId: number, key: PermissionKey) {
    this.accessList.update(list =>
      list.map(p => (p.moduleId === moduleId ? { ...p, [key]: !p[key] } : p))
    );
  }

  // Toggle every permission for one module row
  isRowAllChecked(p: AccessPermission): boolean {
    return p.view && p.create && p.edit && p.delete;
  }

  toggleRow(moduleId: number, checked: boolean) {
    this.accessList.update(list =>
      list.map(p =>
        p.moduleId === moduleId
          ? { ...p, view: checked, create: checked, edit: checked, delete: checked }
          : p
      )
    );
  }

  // Toggle one permission across all modules
  isColumnAllChecked(key: PermissionKey): boolean {
    const list = this.accessList();
    return list.length > 0 && list.every(p => p[key]);
  }

  toggleColumn(key: PermissionKey, checked: boolean) {
    this.accessList.update(list => list.map(p => ({ ...p, [key]: checked })));
  }

  // Master toggle — grant/revoke everything for the role
  isAllChecked(): boolean {
    const list = this.accessList();
    return list.length > 0 && list.every(p => this.isRowAllChecked(p));
  }

  toggleAll(checked: boolean) {
    this.accessList.update(list =>
      list.map(p => ({ ...p, view: checked, create: checked, edit: checked, delete: checked }))
    );
  }

  // UPDATE — persist the matrix for the active role
  saveAccess() {
    const payload = {
      roleId: this.selectedRoleId(),
      permissions: this.accessList(),
    };
    console.log('saveAccess >>:', payload);
  }

  // DELETE/RESET — revoke all permissions for the role
  resetAccess() {
    this.loadAccess();
  }
}
