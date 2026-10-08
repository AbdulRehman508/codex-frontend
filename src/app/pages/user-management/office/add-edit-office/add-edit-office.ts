import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormArray, FormBuilder, Validators, FormsModule, FormGroup } from '@angular/forms';
import { commonIcons } from '../../../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { membershipList, membershipType } from '../../contant.json';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { debounceTime } from 'rxjs/operators';

import { QrService } from '../../../../core/services/qr.service';
import { OfficeApiService } from '../office.api';
import { CreateOfficeDto, OfficePaymentMethod } from '../office.model';

/** common Pakistani online payment rails; the dropdown also takes custom text */
const PAYMENT_PROVIDERS = ['JazzCash', 'Easypaisa', 'Raast', 'Bank Transfer', 'SadaPay', 'NayaPay'];
const MAX_PAYMENT_METHODS = 10;

@Component({
  selector: 'app-add-edit-office',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, NgSelectModule],
  templateUrl: './add-edit-office.html',
  styleUrl: './add-edit-office.scss',
})
export class AddEditOffice {
  officeForm: FormGroup = new FormGroup({});
  private _router = inject(Router);
  private _activeRoute = inject(ActivatedRoute);
  private _formBuilder = inject(FormBuilder);
  private api = inject(OfficeApiService);
  private toast = inject(MessageService);
  private qr = inject(QrService);

  readonly providers = PAYMENT_PROVIDERS;
  readonly maxPaymentMethods = MAX_PAYMENT_METHODS;
  /** QR shown next to each payment row: its uploaded image or a generated one */
  qrPreviews = signal<(string | null)[]>([]);

  commonIcon = commonIcons;
  submitted = false;
  saving = signal(false);
  pageTitle = 'Add Office';
  officeId: string | null = null;

  membershipList: any[] = membershipList;
  membershipType: any[] = membershipType;

  // logo state
  officeLogo = signal<string | null>(null); // URL (edit) or base64 (new) for preview
  private logoBase64: string | null = null; // set only when a new file is picked
  private logoChanged = false;

  // server-side field errors: { field: ['msg', ...] }
  serverErrors = signal<Record<string, string[]>>({});

  ngOnInit() {
    this.officeForm = this._formBuilder.group({
      office_name: ['', Validators.required],
      office_email: ['', [Validators.required, Validators.email]],
      office_mobile_no: ['', Validators.required],
      // membership_level: [null, Validators.required],
      // membership_type: [null, Validators.required],
      licence_no: [''],
      approved: [false],
      is_main: [false],
      office_status: ['active'],
      office_address: ['', Validators.required],
      biography: [''],
      // sales tax, per branch
      tax_enabled: [false],
      tax_name: ['GST'],
      tax_rate: [0],
      tax_inclusive: [false],
      tax_number: [''],
      payment_methods: this._formBuilder.array([]),
    });

    // keep the QR previews in step with what is typed
    this.paymentMethods.valueChanges
      .pipe(debounceTime(250))
      .subscribe(() => this.refreshQrPreviews());

    this._activeRoute.params.subscribe((params) => {
      this.officeId = params['id'] ?? null;
      this.pageTitle = this.officeId ? 'Edit Office' : 'Add Office';
      if (this.officeId) {
        this.loadOffice(this.officeId);
      }
    });
  }

  private loadOffice(id: string) {
    this.api.getOffice(id).subscribe({
      next: (office) => {
        this.officeForm.patchValue({
          office_name: office.office_name,
          office_email: office.office_email,
          office_mobile_no: office.office_mobile_no,
          membership_level: office.membership_level,
          membership_type: office.membership_type,
          licence_no: office.licence_no ?? '',
          approved: office.approved,
          is_main: office.is_main,
          office_status: office.office_status,
          office_address: office.office_address,
          biography: office.biography ?? '',
          tax_enabled: office.tax_enabled ?? false,
          tax_name: office.tax_name || 'GST',
          tax_rate: office.tax_rate ?? 0,
          tax_inclusive: office.tax_inclusive ?? false,
          tax_number: office.tax_number ?? '',
        });
        this.officeLogo.set(office.office_logo); // existing URL, not changed
        this.logoChanged = false;

        this.paymentMethods.clear();
        (office.payment_methods ?? []).forEach((m) => this.addPaymentMethod(m));
        this.refreshQrPreviews();
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load office' }),
    });
  }

  /** server error for a control, if any */
  fieldError(name: string): string | null {
    const errs = this.serverErrors()[name];
    return errs?.length ? errs[0] : null;
  }

  // ---- online payment methods ----

  get paymentMethods(): FormArray {
    return this.officeForm.get('payment_methods') as FormArray;
  }

  addPaymentMethod(m?: OfficePaymentMethod) {
    if (this.paymentMethods.length >= MAX_PAYMENT_METHODS) return;
    this.paymentMethods.push(
      this._formBuilder.group({
        provider: [m?.provider ?? null, Validators.required],
        account_title: [m?.account_title ?? '', Validators.required],
        account_number: [m?.account_number ?? '', Validators.required],
        // stored URL, a freshly picked base64 image, or null
        qr_image: [m?.qr_image ?? null],
      }),
    );
  }

  removePaymentMethod(i: number) {
    this.paymentMethods.removeAt(i);
  }

  /** attach the provider's official merchant QR to a row */
  onPickQr(i: number, event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.toast.add({ severity: 'warn', summary: 'Invalid file', detail: 'Allowed: png, jpg, jpeg, webp' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toast.add({ severity: 'warn', summary: 'Too large', detail: 'Max size 2 MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => this.paymentMethods.at(i).patchValue({ qr_image: e.target.result as string });
    reader.readAsDataURL(file);
  }

  /** drop the uploaded QR — the row falls back to a generated one */
  removeQr(i: number) {
    this.paymentMethods.at(i).patchValue({ qr_image: null });
  }

  hasUploadedQr(i: number): boolean {
    return !!this.paymentMethods.at(i)?.value?.qr_image;
  }

  /** uploaded image when present, else a QR generated from the details */
  private async refreshQrPreviews() {
    const rows = this.paymentMethods.value as OfficePaymentMethod[];
    const previews = await Promise.all(
      rows.map(async (m) => {
        if (m.qr_image) return m.qr_image;
        if (!m.provider || !m.account_title?.trim() || !m.account_number?.trim()) return null;
        try {
          return await this.qr.toDataUrl(this.qr.payload(m));
        } catch {
          return null;
        }
      }),
    );
    this.qrPreviews.set(previews);
  }

  createCustomer() {
    this.submitted = true;
    this.serverErrors.set({});
    if (this.paymentMethods.invalid) {
      this.toast.add({ severity: 'warn', summary: 'Payment method', detail: 'Fill provider, account title and number for every payment method' });
      return;
    }
    if (this.officeForm.invalid) return;

    const body: CreateOfficeDto = { ...this.officeForm.value };
    // a rate only means something while the tax is switched on
    body.tax_rate = Number(body.tax_rate) || 0;
    // only send logo when a new one was picked; omit to keep existing on edit
    if (this.logoChanged && this.logoBase64) {
      body.office_logo = this.logoBase64;
    } else {
      delete body.office_logo;
    }

    this.saving.set(true);
    const req$ = this.officeId
      ? this.api.updateOffice(this.officeId, body)
      : this.api.createOffice(body);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `Office ${this.officeId ? 'updated' : 'created'}` });
        this._router.navigateByUrl('/user-management/office');
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
    this.officeForm.reset();
    this._router.navigateByUrl('/user-management/office');
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
        this.officeLogo.set(base64);
        this.logoBase64 = base64;
        this.logoChanged = true;
      };
    }
    target.value = '';
  }

  removeLogo() {
    this.officeLogo.set(null);
    this.logoBase64 = null;
    this.logoChanged = false; // null = keep existing per API contract
  }
}
