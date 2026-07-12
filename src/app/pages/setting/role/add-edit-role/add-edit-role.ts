
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, FormGroup } from '@angular/forms';
import { commonIcons } from '../../../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';

import { RoleApiService } from '../role.api';
import { CreateRoleDto } from '../role.model';
import { OfficeApiService } from '../../../user-management/office/office.api';
import { OfficeListRow } from '../../../user-management/office/office.model';
import { TokenService } from '../../../../core/services/token.service';
import { OfficeContextService } from '../../../../core/services/office-context.service';

@Component({
  selector: 'app-add-edit-role',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, NgSelectModule],
  templateUrl: './add-edit-role.html',
  styleUrl: './add-edit-role.scss',
})
export class AddEditRole {
  roleForm: FormGroup = new FormGroup({});
  private _router = inject(Router);
  private _activeRoute = inject(ActivatedRoute);
  private _formBuilder = inject(FormBuilder);
  private api = inject(RoleApiService);
  private officeApi = inject(OfficeApiService);
  private token = inject(TokenService);
  private ctx = inject(OfficeContextService);
  private toast = inject(MessageService);

  commonIcon = commonIcons;
  submitted = false;
  saving = signal(false);
  pageTitle = 'Add Role';
  roleId: number | null = null;

  officeList = signal<OfficeListRow[]>([]);

  // server-side field errors: { field: ['msg', ...] }
  serverErrors = signal<Record<string, string[]>>({});

  ngOnInit() {
    this.roleForm = this._formBuilder.group({
      role_name: ['', Validators.required],
      office_id: [null, Validators.required],
      description: [''],
    });

    this.loadOffices();

    this._activeRoute.params.subscribe((params) => {
      const id = params['id'];
      this.roleId = id ? Number(id) : null;
      this.pageTitle = this.roleId ? 'Edit Role' : 'Add Role';
      if (this.roleId) {
        this.loadRole(this.roleId);
      } else {
        // new role belongs to the office selected in the header by default
        this.roleForm.patchValue({ office_id: this.ctx.selectedOfficeId() });
      }
    });
  }

  private loadOffices() {
    this.officeApi.listOffices({ limit: 1000, sort: 'office_name', order: 'asc' }).subscribe({
      next: (res) => this.officeList.set(this.token.filterOfficesForUser(res.data)),
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load offices' }),
    });
  }

  private loadRole(id: number) {
    this.api.getRole(id).subscribe({
      next: (role) => {
        this.roleForm.patchValue({
          role_name: role.role,
          office_id: role.office_id,
          description: role.description ?? '',
        });
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load role' }),
    });
  }

  /** server error for a control, if any */
  fieldError(name: string): string | null {
    const errs = this.serverErrors()[name];
    return errs?.length ? errs[0] : null;
  }

  createRole() {
    this.submitted = true;
    this.serverErrors.set({});
    if (this.roleForm.invalid) return;

    const v = this.roleForm.value;
    const body: CreateRoleDto = {
      role: v.role_name,
      office_id: v.office_id,
      description: v.description || undefined,
    };

    this.saving.set(true);
    const req$ = this.roleId
      ? this.api.updateRole(this.roleId, body)
      : this.api.createRole(body);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `Role ${this.roleId ? 'updated' : 'created'}` });
        this._router.navigateByUrl('/setting/role');
      },
      error: (err) => {
        this.saving.set(false);
        const e = err?.error;
        if (e?.errors) this.serverErrors.set(e.errors);
        this.toast.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Save failed' });
      },
    });
  }

  closeRole() {
    this.roleForm.reset();
    this._router.navigateByUrl('/setting/role');
  }
}
