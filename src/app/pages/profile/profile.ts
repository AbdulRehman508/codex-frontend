import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, FormGroup } from '@angular/forms';
import { commonIcons } from '../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';

import { ProfileApiService } from './profile.api';
import { UpdateProfileDto } from './profile.model';
import { TokenService } from '../../core/services/token.service';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  profileForm: FormGroup = new FormGroup({});
  private _formBuilder = inject(FormBuilder);
  private api = inject(ProfileApiService);
  private token = inject(TokenService);
  private toast = inject(MessageService);

  commonIcon = commonIcons;
  pageTitle = 'My Profile';
  submitted = false;
  saving = signal(false);
  loading = signal(true);

  // read-only display fields (admin-controlled, not editable here)
  email = signal('');
  officeName = signal<string | null>(null);
  roleName = signal<string | null>(null);
  staffStatus = signal<string>('');

  // photo state
  profilePhoto = signal<string | null>(null);
  private photoBase64: string | null = null;
  private photoChanged = false;

  serverErrors = signal<Record<string, string[]>>({});

  ngOnInit() {
    this.profileForm = this._formBuilder.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      mobile_no: ['', Validators.required],
      cnic_no: ['', [Validators.required, Validators.pattern(/^\d{5}-\d{7}-\d$/)]],
      address: ['', Validators.required],
      biography: [''],
    });
    this.loadProfile();
  }

  private loadProfile() {
    this.loading.set(true);
    this.api.getProfile().subscribe({
      next: (p) => {
        this.profileForm.patchValue({
          first_name: p.first_name,
          last_name: p.last_name,
          mobile_no: p.mobile_no,
          cnic_no: p.cnic_no,
          address: p.address,
          biography: p.biography ?? '',
        });
        this.email.set(p.email);
        this.officeName.set(p.offices?.length ? p.offices.join(', ') : null);
        this.roleName.set(p.role);
        this.staffStatus.set(p.staff_status);
        this.profilePhoto.set(p.profile_photo);
        this.photoChanged = false;
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load profile' });
      },
    });
  }

  fieldError(name: string): string | null {
    const errs = this.serverErrors()[name];
    return errs?.length ? errs[0] : null;
  }

  saveProfile() {
    this.submitted = true;
    this.serverErrors.set({});
    if (this.profileForm.invalid) return;

    const body: UpdateProfileDto = { ...this.profileForm.value };
    if (this.photoChanged && this.photoBase64) {
      body.profile_photo = this.photoBase64;
    } else {
      delete body.profile_photo;
    }

    this.saving.set(true);
    this.api.updateProfile(body).subscribe({
      next: (p) => {
        this.saving.set(false);
        this.profilePhoto.set(p.profile_photo);
        this.photoChanged = false;
        // keep header (stored user) in sync with the edited name/photo
        const user = this.token.getUser();
        if (user) {
          this.token.setUser({ ...user, first_name: p.first_name, last_name: p.last_name, profile_photo: p.profile_photo });
        }
        this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Profile updated' });
      },
      error: (err) => {
        this.saving.set(false);
        const e = err?.error;
        if (e?.errors) this.serverErrors.set(e.errors);
        this.toast.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Save failed' });
      },
    });
  }

  resetProfile() {
    this.submitted = false;
    this.serverErrors.set({});
    this.loadProfile();
  }

  onSelectFile(event: Event) {
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
