import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';

import { commonIcons } from '../../../../core/icon-images/common-icon';
import { StaffApiService } from '../staff.api';
import { Staff } from '../staff.model';
import { RolesApiService, Role } from '../../roles.api';
import { OfficeApiService } from '../../office/office.api';
import { OfficeListRow } from '../../office/office.model';

@Component({
  selector: 'app-staff-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './staff-detail.html',
  styleUrl: './staff-detail.scss',
})
export class StaffDetail {
  private _activeRoute = inject(ActivatedRoute);
  private _router = inject(Router);
  private api = inject(StaffApiService);
  private rolesApi = inject(RolesApiService);
  private officeApi = inject(OfficeApiService);
  private toast = inject(MessageService);

  commonIcon = commonIcons;
  staff = signal<Staff | null>(null);
  loading = signal(true);

  private roles = signal<Role[]>([]);
  private offices = signal<OfficeListRow[]>([]);

  roleName = computed(() => this.roles().find((r) => r.id === this.staff()?.role_id)?.role ?? '-');
  officeName = computed(() => {
    const ids = this.staff()?.office_ids ?? [];
    const names = this.offices()
      .filter((o) => ids.includes(o.id))
      .map((o) => o.office_name);
    return names.length ? names.join(', ') : '-';
  });

  ngOnInit() {
    const id = this._activeRoute.snapshot.params['id'];
    if (!id) {
      this._router.navigateByUrl('/user-management/staff');
      return;
    }
    forkJoin({
      staff: this.api.getStaff(id),
      roles: this.rolesApi.listRoles(),
      offices: this.officeApi.listOffices({ limit: 1000 }),
    }).subscribe({
      next: ({ staff, roles, offices }) => {
        this.staff.set(staff);
        this.roles.set(roles);
        this.offices.set(offices.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load staff' });
      },
    });
  }

  toggleStatus() {
    const s = this.staff();
    if (!s) return;
    const next = s.staff_status === 'active' ? 'inactive' : 'active';
    this.api.patchStaff(s.id, { staff_status: next }).subscribe({
      next: (updated) => {
        this.staff.set(updated);
        this.toast.add({ severity: 'success', summary: 'Updated', detail: `Status: ${updated.staff_status}` });
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Update failed' }),
    });
  }

  back() {
    this._router.navigateByUrl('/user-management/staff');
  }
}
