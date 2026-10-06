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

import { OfficeContextService } from '../../../../core/services/office-context.service';
import { PurchaseApiService } from '../../purchase.api';
import { CreateSupplierDto, SupplierStatus } from '../../purchase.model';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Component({
  selector: 'app-add-edit-supplier',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, NgSelectModule],
  templateUrl: './add-edit-supplier.html',
  styleUrl: './add-edit-supplier.scss',
})
export class AddEditSupplier {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private api = inject(PurchaseApiService);
  private ctx = inject(OfficeContextService);
  private toast = inject(MessageService);

  supplierForm: FormGroup = new FormGroup({});
  submitted = false;
  saving = signal(false);
  pageTitle = 'Add Supplier';
  supplierId: string | null = null;
  statusList: SupplierStatus[] = ['active', 'inactive'];

  // server-side field errors: { field: ['msg', ...] }
  serverErrors = signal<Record<string, string[]>>({});

  // ---- payable settlement (edit only) ----
  /** what this branch still owes the supplier */
  payableAmount = signal(0);
  /** what is being paid in this save */
  payAmount = signal<number | null>(null);
  /** payable - pay, never negative */
  remainingPayable = computed(() =>
    Math.max(0, round2(this.payableAmount() - (Number(this.payAmount()) || 0))),
  );
  /** paying more than is owed */
  overPaying = computed(() => (Number(this.payAmount()) || 0) > this.payableAmount());
  /** share of the balance this payment clears, for the progress bar */
  clearedPct = computed(() => {
    const owed = this.payableAmount();
    if (!owed) return 0;
    return Math.min(100, Math.max(0, ((Number(this.payAmount()) || 0) / owed) * 100));
  });

  /** settle the whole balance in one go */
  payFull() {
    this.payAmount.set(this.payableAmount());
  }

  ngOnInit() {
    this.supplierForm = this.fb.group({
      name: ['', Validators.required],
      company: [''],
      mobile_no: ['', Validators.required],
      // optional; only format-checked when filled
      email: ['', Validators.email],
      address: [''],
      notes: [''],
      status: ['active'],
    });

    this.route.params.subscribe((params) => {
      this.supplierId = params['id'] ?? null;
      this.pageTitle = this.supplierId ? 'Edit Supplier' : 'Add Supplier';
      if (this.supplierId) this.loadSupplier(this.supplierId);
    });
  }

  private loadSupplier(id: string) {
    this.api.getSupplier(id, this.ctx.selectedOfficeId() ?? undefined).subscribe({
      next: (s) => {
        this.supplierForm.patchValue({
          name: s.name,
          company: s.company ?? '',
          mobile_no: s.mobile_no,
          email: s.email ?? '',
          address: s.address ?? '',
          notes: s.notes ?? '',
          status: s.status,
        });
        this.payableAmount.set(s.payable_amount ?? 0);
        this.payAmount.set(null);
      },
      error: (err) =>
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load supplier' }),
    });
  }

  /** server error for a control, if any */
  fieldError(name: string): string | null {
    const errs = this.serverErrors()[name];
    return errs?.length ? errs[0] : null;
  }

  saveSupplier() {
    this.submitted = true;
    this.serverErrors.set({});

    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.toast.add({ severity: 'warn', summary: 'No office', detail: 'Select an office in the header first' });
      return;
    }
    if (this.supplierForm.invalid) return;
    if (this.overPaying()) {
      this.toast.add({ severity: 'warn', summary: 'Check payment', detail: 'Pay amount is more than the payable balance' });
      return;
    }

    const v = this.supplierForm.value;
    const body: CreateSupplierDto = {
      office_id: officeId,
      name: v.name,
      company: v.company ?? '',
      mobile_no: v.mobile_no,
      // blank means "no email", not an empty string
      email: v.email?.trim() ? v.email.trim() : null,
      address: v.address ?? '',
      notes: v.notes ?? '',
      status: v.status,
    };

    const pay = round2(Number(this.payAmount()) || 0);
    this.saving.set(true);

    const save$ = this.supplierId
      ? this.api.updateSupplier(this.supplierId, body)
      : this.api.createSupplier(body);

    // profile first; a payment (edit only) is recorded once that succeeded
    const req$ =
      this.supplierId && pay > 0
        ? save$.pipe(switchMap((s) => this.api.paySupplier(s.id, pay)))
        : save$;

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        const detail =
          pay > 0
            ? `Supplier updated, ${pay.toLocaleString('en-US', { minimumFractionDigits: 2 })} paid`
            : `Supplier ${this.supplierId ? 'updated' : 'created'}`;
        this.toast.add({ severity: 'success', summary: 'Saved', detail });
        this.router.navigateByUrl('/purchase/suppliers');
      },
      error: (err) => {
        this.saving.set(false);
        const e = err?.error;
        if (e?.errors) this.serverErrors.set(e.errors);
        this.toast.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Save failed' });
      },
    });
  }

  close() {
    this.router.navigateByUrl('/purchase/suppliers');
  }
}
