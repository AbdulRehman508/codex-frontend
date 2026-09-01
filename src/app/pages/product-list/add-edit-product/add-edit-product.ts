import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';

import { commonIcons } from '../../../core/icon-images/common-icon';
import { OfficeContextService } from '../../../core/services/office-context.service';
import { LocationApiService } from '../../location/location.api';
import {
  ColumnOption,
  RackListRow,
  RackLocationBin,
  RowOption,
} from '../../location/location.model';
import { ProductApiService } from '../product.api';
import { CreateProductDto, Product, ProductStatus } from '../product.model';

@Component({
  selector: 'app-add-edit-product',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, NgSelectModule],
  templateUrl: './add-edit-product.html',
  styleUrl: './add-edit-product.scss',
})
export class AddEditProduct {
  private _router = inject(Router);
  private _activeRoute = inject(ActivatedRoute);
  private _formBuilder = inject(FormBuilder);
  private api = inject(ProductApiService);
  private locationApi = inject(LocationApiService);
  private ctx = inject(OfficeContextService);
  private toast = inject(MessageService);

  commonIcon = commonIcons;
  productForm: FormGroup = new FormGroup({});
  submitted = false;
  saving = signal(false);
  pageTitle = 'Add Product';
  productId: string | null = null;
  statusList: ProductStatus[] = ['active', 'inactive'];

  // dependent dropdown data: rack -> row -> column -> bin
  rackList = signal<RackListRow[]>([]);
  rowList = signal<RowOption[]>([]);
  columnList = signal<ColumnOption[]>([]);
  binList = signal<RackLocationBin[]>([]);
  loadingChain = signal(false);

  /** true when a rack is picked but the chain isn't finished */
  incompleteLocation = signal(false);

  // server-side field errors: { field: ['msg', ...] }
  serverErrors = signal<Record<string, string[]>>({});

  ngOnInit() {
    this.productForm = this._formBuilder.group({
      name: ['', Validators.required],
      sku: ['', Validators.required],
      barcode: [''],
      // held as a formatted string ("1,499.99"); parsed back to a number on save
      price: ['0', priceValidator],
      quantity: [0, [Validators.required, Validators.min(0)]],
      description: [''],
      status: ['active'],
      // location chain — only rack_location_id is persisted
      rack_id: [null],
      row_no: [null],
      column_no: [null],
      rack_location_id: [null],
    });

    this.loadRacks();

    this._activeRoute.params.subscribe((params) => {
      this.productId = params['id'] ?? null;
      this.pageTitle = this.productId ? 'Edit Product' : 'Add Product';
      if (this.productId) {
        this.loadProduct(this.productId);
      }
    });
  }

  private get officeId(): string | undefined {
    return this.ctx.selectedOfficeId() ?? undefined;
  }

  private loadRacks() {
    const officeId = this.officeId;
    if (!officeId) {
      this.rackList.set([]);
      return;
    }
    this.locationApi
      .listLocations({ office_id: officeId, limit: 200, sort: 'name', order: 'asc' })
      .subscribe({
        next: (res) => this.rackList.set(res.data),
        error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load racks' }),
      });
  }

  private loadProduct(id: string) {
    this.api.getProduct(id, this.officeId).subscribe({
      next: (product) => {
        this.productForm.patchValue({
          name: product.name,
          sku: product.sku,
          barcode: product.barcode ?? '',
          price: formatPrice(product.price),
          quantity: product.quantity,
          description: product.description ?? '',
          status: product.status,
          rack_id: product.rack_id,
          row_no: product.row_no,
          column_no: product.column_no,
          rack_location_id: product.rack_location_id,
        });
        this.restoreLocationChain(product);
      },
      error: (err) =>
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load product' }),
    });
  }

  /** refill the row/column/bin dropdowns for an already assigned product */
  private restoreLocationChain(product: Product) {
    if (!product.rack_id) return;
    this.loadingChain.set(true);
    this.locationApi.listRows(product.rack_id, this.officeId).subscribe({
      next: (rows) => {
        this.rowList.set(rows);
        if (product.row_no === null) {
          this.loadingChain.set(false);
          return;
        }
        this.locationApi
          .listColumns(product.rack_id!, product.row_no, this.officeId)
          .subscribe({
            next: (columns) => {
              this.columnList.set(columns);
              if (product.column_no === null) {
                this.loadingChain.set(false);
                return;
              }
              this.locationApi
                .listBins(product.rack_id!, product.row_no!, product.column_no, this.officeId)
                .subscribe({
                  next: (bins) => {
                    this.binList.set(bins);
                    this.loadingChain.set(false);
                  },
                  error: () => this.loadingChain.set(false),
                });
            },
            error: () => this.loadingChain.set(false),
          });
      },
      error: () => this.loadingChain.set(false),
    });
  }

  // ---- dependent dropdowns: every parent change resets its children ----

  onRackChange() {
    this.productForm.patchValue({ row_no: null, column_no: null, rack_location_id: null });
    this.rowList.set([]);
    this.columnList.set([]);
    this.binList.set([]);
    const rackId = this.productForm.value.rack_id;
    if (!rackId) return;
    this.loadingChain.set(true);
    this.locationApi.listRows(rackId, this.officeId).subscribe({
      next: (rows) => {
        this.rowList.set(rows);
        this.loadingChain.set(false);
      },
      error: (err) => {
        this.loadingChain.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load rows' });
      },
    });
  }

  onRowChange() {
    this.productForm.patchValue({ column_no: null, rack_location_id: null });
    this.columnList.set([]);
    this.binList.set([]);
    const { rack_id, row_no } = this.productForm.value;
    if (!rack_id || row_no === null || row_no === undefined) return;
    this.loadingChain.set(true);
    this.locationApi.listColumns(rack_id, row_no, this.officeId).subscribe({
      next: (columns) => {
        this.columnList.set(columns);
        this.loadingChain.set(false);
      },
      error: (err) => {
        this.loadingChain.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load columns' });
      },
    });
  }

  onColumnChange() {
    this.productForm.patchValue({ rack_location_id: null });
    this.binList.set([]);
    const { rack_id, row_no, column_no } = this.productForm.value;
    if (!rack_id || row_no == null || column_no == null) return;
    this.loadingChain.set(true);
    this.locationApi.listBins(rack_id, row_no, column_no, this.officeId).subscribe({
      next: (bins) => {
        this.binList.set(bins);
        this.loadingChain.set(false);
      },
      error: (err) => {
        this.loadingChain.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load bins' });
      },
    });
  }

  /**
   * Keep the price readable while typing: digits + at most 2 decimals, with
   * thousand separators. The raw number is recovered on save.
   */
  onPriceInput(value: string) {
    const cleaned = (value ?? '').replace(/[^\d.]/g, '');
    const [intPart, ...rest] = cleaned.split('.');
    const decimals = rest.length ? `.${rest.join('').slice(0, 2)}` : '';
    const grouped = intPart ? Number(intPart).toLocaleString('en-US') : '';
    this.productForm.patchValue(
      { price: `${grouped}${decimals}` },
      { emitEvent: false },
    );
  }

  /** label shown for the currently selected bin */
  selectedLocationCode(): string | null {
    const id = this.productForm.value.rack_location_id;
    return this.binList().find((b) => b.id === id)?.location_code ?? null;
  }

  /** server error for a control, if any */
  fieldError(name: string): string | null {
    const errs = this.serverErrors()[name];
    return errs?.length ? errs[0] : null;
  }

  saveProduct() {
    this.submitted = true;
    this.serverErrors.set({});

    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.toast.add({ severity: 'warn', summary: 'No office', detail: 'Select an office in the header first' });
      return;
    }

    const v = this.productForm.value;
    // a partially picked location is not a location — finish it or clear the rack
    const chainStarted = !!v.rack_id;
    const chainComplete = !!v.rack_location_id;
    this.incompleteLocation.set(chainStarted && !chainComplete);
    if (this.productForm.invalid || this.incompleteLocation()) return;

    const body: CreateProductDto = {
      office_id: officeId,
      name: v.name,
      sku: (v.sku ?? '').toString().trim().toUpperCase(),
      barcode: v.barcode ? v.barcode.toString().trim() : null,
      price: parsePrice(v.price),
      quantity: Number(v.quantity) || 0,
      description: v.description || undefined,
      status: v.status,
      rack_location_id: v.rack_location_id ?? null,
    };

    this.saving.set(true);
    const req$ = this.productId
      ? this.api.updateProduct(this.productId, body)
      : this.api.createProduct(body);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `Product ${this.productId ? 'updated' : 'created'}` });
        this._router.navigateByUrl('/product');
      },
      error: (err) => {
        this.saving.set(false);
        const e = err?.error;
        if (e?.errors) this.serverErrors.set(e.errors);
        this.toast.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Save failed' });
      },
    });
  }

  clearLocation() {
    this.productForm.patchValue({
      rack_id: null,
      row_no: null,
      column_no: null,
      rack_location_id: null,
    });
    this.rowList.set([]);
    this.columnList.set([]);
    this.binList.set([]);
    this.incompleteLocation.set(false);
  }

  closeProduct() {
    this._router.navigateByUrl('/product');
  }
}

/** "1,499.99" -> 1499.99 */
function parsePrice(value: unknown): number {
  return Number(String(value ?? '').replace(/,/g, '').trim());
}

/** 1499.99 -> "1,499.99" */
function formatPrice(value: number): string {
  return (value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** required + a non-negative number once the separators are stripped */
function priceValidator(control: AbstractControl): ValidationErrors | null {
  const raw = String(control.value ?? '').replace(/,/g, '').trim();
  if (!raw) return { required: true };
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? null : { invalidPrice: true };
}
