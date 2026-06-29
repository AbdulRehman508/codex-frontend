import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, FormGroup } from '@angular/forms';
import { commonIcons } from '../../../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';

import { StaffApiService } from '../staff.api';
import { CreateStaffDto } from '../staff.model';
import { RolesApiService, Role } from '../../roles.api';
import { OfficeApiService } from '../../office/office.api';
import { OfficeListRow } from '../../office/office.model';

@Component({
  selector: 'app-add-edit-staff',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, NgSelectModule, InputNumber],
  templateUrl: './add-edit-staff.html',
  styleUrl: './add-edit-staff.scss',
})
export class AddEditStaff {
  staffForm: FormGroup = new FormGroup({});
  private _router = inject(Router);
  private _activeRoute = inject(ActivatedRoute);
  private _formBuilder = inject(FormBuilder);
  private api = inject(StaffApiService);
  private rolesApi = inject(RolesApiService);
  private officeApi = inject(OfficeApiService);
  private toast = inject(MessageService);

  commonIcon = commonIcons;
  submitted = false;
  saving = signal(false);
  pageTitle = 'Add Staff';
  staffId: string | null = null;

  hideShowPassword = false;
  validation_error: string[] = [];

  roleList = signal<Role[]>([]);
  officeList = signal<OfficeListRow[]>([]);

  // profile photo state
  profilePhoto = signal<string | null>(null); // URL (edit) or base64 (new) for preview
  private photoBase64: string | null = null; // set only when a new file is picked
  private photoChanged = false;

  // server-side field errors: { field: ['msg', ...] }
  serverErrors = signal<Record<string, string[]>>({});

  ngOnInit() {
    this.staffForm = this._formBuilder.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      mobile_no: ['', Validators.required],
      cnic_no: ['', [Validators.required, Validators.pattern(/^\d{5}-\d{7}-\d$/)]],
      office_ids: [[], Validators.required],
      role_id: [null, Validators.required],
      address: ['', Validators.required],
      salary: [null, [Validators.required, Validators.min(0)]],
      biography: [''],
      staff_status: ['active'],
    });

    this.loadOffices();

    // roles are office-scoped: reload them whenever the chosen offices change
    this.staffForm.controls['office_ids'].valueChanges.subscribe((officeIds: string[]) => {
      this.staffForm.controls['role_id'].setValue(null);
      this.roleList.set([]);
      if (officeIds?.length) this.loadRoles(officeIds);
    });

    this._activeRoute.params.subscribe((params) => {
      this.staffId = params['id'] ?? null;
      this.pageTitle = this.staffId ? 'Edit Staff' : 'Add Staff';
      if (this.staffId) {
        // password optional on edit (empty = keep existing)
        this.staffForm.controls['password'].clearValidators();
        this.staffForm.controls['password'].updateValueAndValidity();
        this.loadStaff(this.staffId);
      }
    });
  }

  private loadRoles(officeIds: string[]) {
    this.rolesApi.listRoles(officeIds).subscribe({
      next: (roles) => this.roleList.set(roles),
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load roles' }),
    });
  }

  private loadOffices() {
    // pull a large page so the dropdown holds every office
    this.officeApi.listOffices({ limit: 1000, sort: 'office_name', order: 'asc' }).subscribe({
      next: (res) => this.officeList.set(res.data),
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load offices' }),
    });
  }

  private loadStaff(id: string) {
    this.api.getStaff(id).subscribe({
      next: (staff) => {
        this.staffForm.patchValue({
          first_name: staff.first_name,
          last_name: staff.last_name,
          email: staff.email,
          password: '',
          mobile_no: staff.mobile_no,
          cnic_no: staff.cnic_no,
          office_ids: staff.office_ids,
          role_id: staff.role_id,
          address: staff.address,
          salary: staff.salary,
          biography: staff.biography ?? '',
          staff_status: staff.staff_status,
        });
        this.profilePhoto.set(staff.profile_photo); // existing URL, not changed
        this.photoChanged = false;
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load staff' }),
    });
  }

  /** server error for a control, if any */
  fieldError(name: string): string | null {
    const errs = this.serverErrors()[name];
    return errs?.length ? errs[0] : null;
  }

  createCustomer() {
    this.submitted = true;
    this.serverErrors.set({});

    // run password strength check when a password was entered
    const password = this.staffForm.controls['password'].value;
    if (password && this.passwordCriteria().length) {
      return;
    }

    if (this.staffForm.invalid) return;

    const body: CreateStaffDto = { ...this.staffForm.value };

    // on edit, drop empty password to keep existing
    if (this.staffId && !body.password) {
      delete body.password;
    }

    // only send photo when a new one was picked; omit to keep existing on edit
    if (this.photoChanged && this.photoBase64) {
      body.profile_photo = this.photoBase64;
    } else {
      delete body.profile_photo;
    }

    this.saving.set(true);
    const req$ = this.staffId
      ? this.api.updateStaff(this.staffId, body)
      : this.api.createStaff(body);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `Staff ${this.staffId ? 'updated' : 'created'}` });
        this._router.navigateByUrl('/user-management/staff');
      },
      error: (err) => {
        this.saving.set(false);
        const e = err?.error;
        if (e?.errors) this.serverErrors.set(e.errors);
        this.toast.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Save failed' });
      },
    });
  }

  closeCustomer() {
    this.staffForm.reset();
    this._router.navigateByUrl('/user-management/staff');
  }

  get strengthLevel(): 'Weak' | 'Medium' | 'Strong' {
    if (this.validation_error?.length === 3 || this.validation_error?.length === 4) return 'Weak';
    if (this.validation_error?.length === 1 || this.validation_error?.length === 2) return 'Medium';
    return 'Strong';
  }

  passwordCriteria() {
    this.validation_error = [];
    const password = this.staffForm.controls['password'].value;
    if (password?.length < 12) {
      this.validation_error.push('Password must be at least 12 characters long');
    }
    if (!/[A-Z]/.test(password || '')) {
      this.validation_error.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password || '')) {
      this.validation_error.push('Password must contain at least one numeric character');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password || '')) {
      this.validation_error.push('Password must contain at least one special character');
    }
    return this.validation_error;
  }

  onSelectFileLR(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length) {
      const file = target.files[0];
      const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
      if (!allowed.includes(file.type)) {
        this.toast.add({ severity: 'warn', summary: 'Invalid file', detail: 'Allowed: png, jpg, jpeg, webp, gif' });
        target.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        this.toast.add({ severity: 'warn', summary: 'Too large', detail: 'Max size 2 MB' });
        target.value = '';
        return;
      }
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = (e: any) => {
        const base64 = e.target.result as string;
        this.profilePhoto.set(base64);
        this.photoBase64 = base64;
        this.photoChanged = true;
      };
    }
    target.value = '';
  }

  removePhoto() {
    this.profilePhoto.set(null);
    this.photoBase64 = null;
    this.photoChanged = false; // null = keep existing per API contract
  }
}
