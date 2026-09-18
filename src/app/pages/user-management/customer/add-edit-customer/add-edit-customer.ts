import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { switchMap } from 'rxjs/operators';

import { commonIcons } from '../../../../core/icon-images/common-icon';
import { OfficeContextService } from '../../../../core/services/office-context.service';
import { CustomerApiService } from '../customer.api';
import { CreateCustomerDto, CustomerStatus } from '../customer.model';

@Component({
  selector: 'app-add-edit-customer',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, NgSelectModule],
  templateUrl: './add-edit-customer.html',
  styleUrl: './add-edit-customer.scss',
})
export class AddEditCustomer {
  private _router = inject(Router);
  private _activeRoute = inject(ActivatedRoute);
  private _formBuilder = inject(FormBuilder);
  private api = inject(CustomerApiService);
  private ctx = inject(OfficeContextService);
  private toast = inject(MessageService);

  customerForm: FormGroup = new FormGroup({});
  commonIcon = commonIcons;
  submitted = false;
  saving = signal(false);
  pageTitle = 'Add Customer';
  customerId: string | null = null;
  statusList: CustomerStatus[] = ['active', 'inactive'];

  // photo state
  profilePhoto = signal<string | null>(null); // URL (edit) or base64 (new) for preview
  private photoBase64: string | null = null; // set only when a new file is picked
  private photoChanged = false;

  // server-side field errors: { field: ['msg', ...] }
  serverErrors = signal<Record<string, string[]>>({});

  // ---- borrow repayment (edit only) ----
  /** balance the customer owes right now */
  borrowAmount = signal(0);
  /** what they are paying back in this save */
  payAmount = signal<number | null>(null);
  /** borrow - pay, never negative */
  remainingBorrow = computed(() =>
    Math.max(0, round2(this.borrowAmount() - (Number(this.payAmount()) || 0))),
  );
  /** paying more than they owe */
  overPaying = computed(() => (Number(this.payAmount()) || 0) > this.borrowAmount());
  /** share of the balance this payment clears, for the progress bar */
  clearedPct = computed(() => {
    const owed = this.borrowAmount();
    if (!owed) return 0;
    return Math.min(100, Math.max(0, ((Number(this.payAmount()) || 0) / owed) * 100));
  });

  /** settle the whole balance in one go */
  payFull() {
    this.payAmount.set(this.borrowAmount());
  }

  ngOnInit() {
    this.customerForm = this._formBuilder.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      // email and CNIC are optional; email is only format-checked when filled
      email: ['', Validators.email],
      mobile_no: ['', Validators.required],
      cnic_no: [''],
      address: [''],
      biography: [''],
      customer_status: ['active'],
    });

    this._activeRoute.params.subscribe((params) => {
      this.customerId = params['id'] ?? null;
      this.pageTitle = this.customerId ? 'Edit Customer' : 'Add Customer';
      if (this.customerId) {
        this.loadCustomer(this.customerId);
      }
    });
  }

  private loadCustomer(id: string) {
    this.api.getCustomer(id, this.ctx.selectedOfficeId() ?? undefined).subscribe({
      next: (customer) => {
        this.customerForm.patchValue({
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email ?? '',
          mobile_no: customer.mobile_no,
          cnic_no: customer.cnic_no ?? '',
          address: customer.address ?? '',
          biography: customer.biography ?? '',
          customer_status: customer.customer_status,
        });
        this.profilePhoto.set(customer.profile_photo); // existing URL, not changed
        this.photoChanged = false;
        this.borrowAmount.set(customer.borrow_amount ?? 0);
        this.payAmount.set(null);
      },
      error: (err) =>
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load customer' }),
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

    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.toast.add({ severity: 'warn', summary: 'No office', detail: 'Select an office in the header first' });
      return;
    }
    if (this.customerForm.invalid) return;

    const v = this.customerForm.value;
    const body: CreateCustomerDto = {
      office_id: officeId,
      first_name: v.first_name,
      last_name: v.last_name,
      // blank means "no email / no CNIC", not an empty string
      email: v.email?.trim() ? v.email.trim() : null,
      mobile_no: v.mobile_no,
      cnic_no: v.cnic_no?.trim() ? v.cnic_no.trim() : null,
      address: v.address ?? '',
      biography: v.biography || undefined,
      customer_status: v.customer_status,
    };
    // only send the photo when a new one was picked; omit to keep existing
    if (this.photoChanged && this.photoBase64) {
      body.profile_photo = this.photoBase64;
    }

    const pay = round2(Number(this.payAmount()) || 0);
    if (this.overPaying()) {
      this.toast.add({ severity: 'warn', summary: 'Check payment', detail: 'Pay amount is more than the borrow balance' });
      return;
    }

    this.saving.set(true);
    const save$ = this.customerId
      ? this.api.updateCustomer(this.customerId, body)
      : this.api.createCustomer(body);

    // profile first; a repayment (edit only) is recorded once that succeeded
    const req$ =
      this.customerId && pay > 0
        ? save$.pipe(switchMap((c) => this.api.receivePayment(c.id, pay)))
        : save$;

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        const detail = pay > 0
          ? `Customer updated, ${pay.toLocaleString('en-US', { minimumFractionDigits: 2 })} received`
          : `Customer ${this.customerId ? 'updated' : 'created'}`;
        this.toast.add({ severity: 'success', summary: 'Saved', detail });
        this._router.navigateByUrl('/user-management/customer');
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
    this._router.navigateByUrl('/user-management/customer');
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
    this.photoChanged = false; // omitted = keep existing per API contract
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
