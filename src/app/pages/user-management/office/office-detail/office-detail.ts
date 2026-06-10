import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';

import { commonIcons } from '../../../../core/icon-images/common-icon';
import { OfficeApiService } from '../office.api';
import { Office } from '../office.model';

@Component({
  selector: 'app-office-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './office-detail.html',
  styleUrl: './office-detail.scss',
})
export class OfficeDetail {
  private _activeRoute = inject(ActivatedRoute);
  private _router = inject(Router);
  private api = inject(OfficeApiService);
  private toast = inject(MessageService);

  commonIcon = commonIcons;
  office = signal<Office | null>(null);
  loading = signal(true);

  ngOnInit() {
    const id = this._activeRoute.snapshot.params['id'];
    if (!id) {
      this._router.navigateByUrl('/user-management/office');
      return;
    }
    this.api.getOffice(id).subscribe({
      next: (office) => {
        this.office.set(office);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load office' });
      },
    });
  }

  toggleApproved() {
    const o = this.office();
    if (!o) return;
    this.api.patchOffice(o.id, { approved: !o.approved }).subscribe({
      next: (updated) => {
        this.office.set(updated);
        this.toast.add({ severity: 'success', summary: 'Updated', detail: `Approved: ${updated.approved}` });
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Update failed' }),
    });
  }

  toggleStatus() {
    const o = this.office();
    if (!o) return;
    const next = o.office_status === 'active' ? 'inactive' : 'active';
    this.api.patchOffice(o.id, { office_status: next }).subscribe({
      next: (updated) => {
        this.office.set(updated);
        this.toast.add({ severity: 'success', summary: 'Updated', detail: `Status: ${updated.office_status}` });
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Update failed' }),
    });
  }

  back() {
    this._router.navigateByUrl('/user-management/office');
  }
}
