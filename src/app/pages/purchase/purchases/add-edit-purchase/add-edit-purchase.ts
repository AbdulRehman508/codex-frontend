import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { OfficeContextService } from '../../../../core/services/office-context.service';
import { ProductApiService } from '../../../product-list/product.api';
import { ProductListRow } from '../../../product-list/product.model';
import { PurchaseApiService } from '../../purchase.api';
import {
  CreatePurchaseDto,
  PurchaseStatus,
  SupplierListRow,
} from '../../purchase.model';

/** one editable row on the bill */
interface FormLine {
  product_id: string;
  name: string;
  sku: string;
  qty: number;
  cost: number;
}

/** the quick-add row above the table */
interface QuickAdd {
  product_id: string | null;
  product: string;
  sku: string;
  qty: number;
  cost: number;
}

function emptyQuickAdd(): QuickAdd {
  return { product_id: null, product: '', sku: '', qty: 1, cost: 0 };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Component({
  selector: 'app-add-edit-purchase',
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule],
  templateUrl: './add-edit-purchase.html',
  styleUrl: './add-edit-purchase.scss',
})
export class AddEditPurchase {
  private api = inject(PurchaseApiService);
  private productApi = inject(ProductApiService);
  private ctx = inject(OfficeContextService);
  private toast = inject(MessageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private search$ = new Subject<string>();

  purchaseId: string | null = null;
  pageTitle = 'New Purchase';
  purchaseNo = signal<string>('');
  saving = signal(false);
  loading = signal(false);

  // ---- header fields ----
  supplierId: string | null = null;
  supplierInvoiceNo = '';
  status: PurchaseStatus = 'received';
  notes = '';
  discount = 0;
  paid: number | null = null;
  /** true once the user edits the paid box — until then it follows the total */
  private paidTouched = false;

  suppliers = signal<SupplierListRow[]>([]);
  statusList: { label: string; value: PurchaseStatus }[] = [
    { label: 'Received (stock in)', value: 'received' },
    { label: 'Ordered (no stock yet)', value: 'ordered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  // ---- lines + quick add ----
  lines = signal<FormLine[]>([]);
  quick: QuickAdd = emptyQuickAdd();
  suggestions = signal<ProductListRow[]>([]);
  suggestOpen = signal(false);
  /** which suggestion ↑/↓ has landed on; Enter takes it */
  activeSuggestion = signal(0);
  searching = signal(false);

  @ViewChild('productInput') productInput?: ElementRef<HTMLInputElement>;
  @ViewChild('qtyInput') qtyInput?: ElementRef<HTMLInputElement>;
  @ViewChild('costInput') costInput?: ElementRef<HTMLInputElement>;

  // server-side field errors: { field: ['msg', ...] }
  serverErrors = signal<Record<string, string[]>>({});

  subtotal = computed(() =>
    round2(this.lines().reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.cost) || 0), 0)),
  );
  total = computed(() => round2(Math.max(0, this.subtotal() - (Number(this.discount) || 0))));
  /** blank paid box = paying the bill in full */
  paidValue = computed(() =>
    this.paid === null || this.paid === undefined ? this.total() : round2(Number(this.paid) || 0),
  );
  due = computed(() => round2(Math.max(0, this.total() - this.paidValue())));
  overPaid = computed(() => this.paidValue() > this.total());
  discountTooBig = computed(() => (Number(this.discount) || 0) > this.subtotal());

  hasOffice = computed(() => !!this.ctx.selectedOfficeId());

  constructor() {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          this.searching.set(true);
          return this.productApi.listProducts({
            office_id: this.ctx.selectedOfficeId() ?? undefined,
            search: term,
            status: 'active',
            limit: 8,
            sort: 'name',
            order: 'asc',
          });
        }),
      )
      .subscribe({
        next: (res) => {
          this.suggestions.set(res.data);
          this.searching.set(false);
        },
        error: () => {
          this.suggestions.set([]);
          this.searching.set(false);
        },
      });
  }

  ngOnInit() {
    this.loadSuppliers();
    this.route.params.subscribe((params) => {
      this.purchaseId = params['id'] ?? null;
      this.pageTitle = this.purchaseId ? 'Edit Purchase' : 'New Purchase';
      if (this.purchaseId) this.loadPurchase(this.purchaseId);
    });
  }

  private loadSuppliers() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.suppliers.set([]);
      return;
    }
    this.api
      .listSuppliers({ office_id: officeId, status: 'active', limit: 200, sort: 'name', order: 'asc' })
      .subscribe({
        next: (res) => this.suppliers.set(res.data),
        error: () =>
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load suppliers' }),
      });
  }

  private loadPurchase(id: string) {
    this.loading.set(true);
    this.api.getPurchase(id, this.ctx.selectedOfficeId() ?? undefined).subscribe({
      next: (p) => {
        this.purchaseNo.set(p.purchase_no);
        this.supplierId = p.supplier_id;
        this.supplierInvoiceNo = p.supplier_invoice_no ?? '';
        this.status = p.status;
        this.notes = p.notes ?? '';
        this.discount = p.discount ?? 0;
        this.paid = p.paid_amount ?? 0;
        this.paidTouched = true; // an existing bill keeps the paid figure it was saved with
        this.lines.set(
          (p.lines ?? []).map((l) => ({
            product_id: l.product_id,
            name: l.name,
            sku: l.sku ?? '',
            qty: l.quantity,
            cost: l.cost_price,
          })),
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load purchase' });
      },
    });
  }

  // ---- quick add: type a product, set qty + cost, Enter ----

  onProductInput(term: string) {
    // typing again detaches from the previously picked product
    this.quick.product_id = null;
    this.quick.sku = '';
    this.suggestOpen.set(true);
    this.activeSuggestion.set(0);
    if (!term.trim()) {
      this.suggestions.set([]);
      return;
    }
    this.search$.next(term.trim());
  }

  pickProduct(product: ProductListRow) {
    this.quick.product_id = product.id;
    this.quick.product = product.name;
    if (this.quick.qty < 1) this.quick.qty = 1;
    this.closeSuggestions();
    // the list row is slim: pull sku and the last landed cost from the detail
    this.productApi
      .getProduct(product.id, this.ctx.selectedOfficeId() ?? undefined)
      .subscribe({
        next: (full) => {
          if (this.quick.product_id !== product.id) return; // user moved on
          this.quick.sku = full.sku ?? '';
          // prefill the last cost we paid; the buyer can type over it
          if (!this.quick.cost) this.quick.cost = full.cost_price || 0;
        },
        error: () => {
          // cost prefill is a nicety — typing it by hand still works
        },
      });
    this.focus(this.qtyInput, true);
  }

  /** ↑/↓ walk the list, Enter picks or adds, Esc closes */
  onProductKeydown(event: KeyboardEvent) {
    const list = this.suggestions();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!this.suggestOpen() || !list.length) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = (this.activeSuggestion() + step + list.length) % list.length;
      this.activeSuggestion.set(next);
      return;
    }
    if (event.key === 'Escape') {
      this.closeSuggestions();
      return;
    }
    if (event.key !== 'Enter') return;

    event.preventDefault();
    const highlighted = this.suggestOpen() ? list[this.activeSuggestion()] : undefined;
    if (highlighted) {
      this.pickProduct(highlighted);
    } else if (this.quick.product_id) {
      this.addQuickLine();
    }
  }

  /** Enter in qty jumps to the cost box; Enter in cost adds the line */
  onQtyKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.focus(this.costInput, true);
  }

  onCostKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.addQuickLine();
  }

  /**
   * Put the quick-add product on the bill. Adding the same product again
   * tops up the existing line and keeps the newer cost.
   */
  addQuickLine() {
    const q = this.quick;
    if (!q.product_id) {
      this.toast.add({ severity: 'warn', summary: 'Pick a product', detail: 'Choose a product from the suggestions first' });
      this.focus(this.productInput);
      return;
    }
    const qty = Number(q.qty) || 0;
    if (qty < 1) {
      this.toast.add({ severity: 'warn', summary: 'Quantity', detail: 'Enter a quantity of 1 or more' });
      this.focus(this.qtyInput, true);
      return;
    }
    const cost = Number(q.cost) || 0;
    if (cost < 0) {
      this.toast.add({ severity: 'warn', summary: 'Cost', detail: 'Cost price cannot be negative' });
      this.focus(this.costInput, true);
      return;
    }

    const list = [...this.lines()];
    const existing = list.find((l) => l.product_id === q.product_id);
    if (existing) {
      existing.qty += qty;
      existing.cost = cost; // the latest cost wins
    } else {
      list.push({ product_id: q.product_id, name: q.product, sku: q.sku, qty, cost });
    }
    this.lines.set(list);
    this.resetQuick();
  }

  removeLine(index: number) {
    this.lines.update((list) => list.filter((_, i) => i !== index));
  }

  /** inline edits on a line keep the totals in step */
  updateLine(index: number, patch: Partial<FormLine>) {
    this.lines.update((list) =>
      list.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );
  }

  lineTotal(line: FormLine): number {
    return round2((Number(line.qty) || 0) * (Number(line.cost) || 0));
  }

  /** delayed so a click on a suggestion still registers before it hides */
  onProductBlur() {
    setTimeout(() => this.closeSuggestions(), 150);
  }

  private closeSuggestions() {
    this.suggestOpen.set(false);
    this.suggestions.set([]);
    this.activeSuggestion.set(0);
  }

  private resetQuick() {
    this.quick = emptyQuickAdd();
    this.closeSuggestions();
    this.focus(this.productInput);
  }

  private focus(ref: ElementRef<HTMLInputElement> | undefined, select = false) {
    setTimeout(() => {
      ref?.nativeElement.focus();
      if (select) ref?.nativeElement.select();
    });
  }

  // ---- paid box ----

  onPaidChange(value: number | null) {
    this.paid = value;
    this.paidTouched = true;
  }

  payFull() {
    this.paid = this.total();
    this.paidTouched = true;
  }

  payNothing() {
    this.paid = 0;
    this.paidTouched = true;
  }

  /** server error for a field, if any */
  fieldError(name: string): string | null {
    const errs = this.serverErrors()[name];
    return errs?.length ? errs[0] : null;
  }

  // ---- save ----

  save() {
    this.serverErrors.set({});
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.toast.add({ severity: 'warn', summary: 'No office', detail: 'Select an office in the header first' });
      return;
    }
    if (!this.supplierId) {
      this.toast.add({ severity: 'warn', summary: 'Supplier', detail: 'Choose the supplier this stock came from' });
      return;
    }
    if (!this.lines().length) {
      this.toast.add({ severity: 'warn', summary: 'No items', detail: 'Add at least one product to the bill' });
      return;
    }
    if (this.discountTooBig()) {
      this.toast.add({ severity: 'warn', summary: 'Discount', detail: 'Discount cannot exceed the subtotal' });
      return;
    }
    if (this.overPaid()) {
      this.toast.add({ severity: 'warn', summary: 'Paid amount', detail: 'Paid cannot be more than the bill total' });
      return;
    }

    const body: CreatePurchaseDto = {
      office_id: officeId,
      supplier_id: this.supplierId,
      supplier_invoice_no: this.supplierInvoiceNo?.trim() || undefined,
      lines: this.lines().map((l) => ({
        product_id: l.product_id,
        quantity: Number(l.qty) || 0,
        cost_price: Number(l.cost) || 0,
      })),
      discount: Number(this.discount) || 0,
      paid_amount: this.paidTouched ? this.paidValue() : this.total(),
      status: this.status,
      notes: this.notes?.trim() || undefined,
    };

    this.saving.set(true);
    const req$ = this.purchaseId
      ? this.api.updatePurchase(this.purchaseId, body)
      : this.api.createPurchase(body);

    req$.subscribe({
      next: (p) => {
        this.saving.set(false);
        this.toast.add({
          severity: 'success',
          summary: 'Saved',
          detail: `${p.purchase_no} ${this.purchaseId ? 'updated' : 'recorded'}`,
        });
        this.router.navigateByUrl('/purchase/list');
      },
      error: (err) => {
        this.saving.set(false);
        const e = err?.error;
        if (e?.errors) this.serverErrors.set(e.errors);
        this.toast.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Save failed' });
      },
    });
  }

  cancel() {
    this.router.navigateByUrl('/purchase/list');
  }
}
