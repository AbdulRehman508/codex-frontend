import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, Input, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { OfficeContextService } from '../../../core/services/office-context.service';
import { ProductApiService } from '../../product-list/product.api';
import { ProductListRow } from '../../product-list/product.model';
import { CustomerApiService } from '../../user-management/customer/customer.api';
import { CustomerListRow } from '../../user-management/customer/customer.model';
import { SalesApiService } from '../sales.api';
import { CreateSaleDto, PaymentMethod, Sale } from '../sales.model';

/** A line being edited in a tab. `product_id` is what actually gets saved. */
export interface OrderLine {
  product_id: string | null;
  product: string;
  qty: number;
  price: number;
  /** units in stock for the picked product — drives the over-sell warning */
  available: number | null;
}

interface OrderTab {
  id: number;              // unique, internal
  num: number;             // display number (gap-filling)
  /** typed name; prints on the bill when no saved customer is picked */
  customer: string;
  /** set only when picked from the customer list */
  customerId: string | null;
  customerMobile: string;
  /** what the picked customer already owes, before this sale */
  previousBorrow: number;
  /** sell on credit — reveals the mobile field and the payable split */
  borrow: boolean;
  /** what the customer hands over now; the rest becomes their borrow */
  paid: number;
  payment: PaymentMethod;
  lines: OrderLine[];
  editId?: string;         // sale id when editing an existing sale
  editRef?: string;        // invoice no shown on the tab while editing
}

/** what sits in the quick-add row above the item list */
interface QuickAdd {
  product_id: string | null;
  product: string;
  qty: number;
  price: number;
  available: number | null;
}

function emptyQuickAdd(): QuickAdd {
  return { product_id: null, product: '', qty: 1, price: 0, available: null };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Component({
  selector: 'app-new-sale',
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './new-sale.html',
  styleUrl: './new-sale.scss',
})
export class NewSale {
  private api = inject(SalesApiService);
  private productApi = inject(ProductApiService);
  private customerApi = inject(CustomerApiService);
  private ctx = inject(OfficeContextService);
  private toast = inject(MessageService);

  @Input() set open(value: boolean) {
    this._open.set(value);
    if (value && this.tabs().length === 0) {
      this.addTab();
    }
  }
  get open() {
    return this._open();
  }

  @Output() closed = new EventEmitter<void>();
  /** emitted after the sale is stored, so the parent can refresh + print */
  @Output() saved = new EventEmitter<Sale>();

  _open = signal(false);
  tabs = signal<OrderTab[]>([]);
  activeId = signal<number | null>(null);
  saving = signal(false);
  private _idSeq = 0;

  // ---- quick add row (the only way items get on the bill) ----
  quick: QuickAdd = emptyQuickAdd();
  suggestions = signal<ProductListRow[]>([]);
  suggestOpen = signal(false);
  /** which suggestion ↑/↓ has landed on; Enter takes it */
  activeSuggestion = signal(0);
  searching = signal(false);
  private search$ = new Subject<string>();

  @ViewChild('productInput') productInput?: ElementRef<HTMLInputElement>;
  @ViewChild('qtyInput') qtyInput?: ElementRef<HTMLInputElement>;

  // ---- customer typeahead ----
  customerSuggestions = signal<CustomerListRow[]>([]);
  customerSuggestOpen = signal(false);
  customerSearching = signal(false);
  private customerSearch$ = new Subject<string>();

  paymentOptions: { label: string; value: PaymentMethod }[] = [
    { label: 'Cash', value: 'cash' },
    { label: 'Online', value: 'online' },
  ];

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

    this.customerSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          this.customerSearching.set(true);
          return this.customerApi.listCustomers({
            office_id: this.ctx.selectedOfficeId() ?? undefined,
            search: term,
            limit: 8,
            sort: 'first_name',
            order: 'asc',
          });
        }),
      )
      .subscribe({
        next: (res) => {
          this.customerSuggestions.set(res.data);
          this.customerSearching.set(false);
        },
        error: () => {
          this.customerSuggestions.set([]);
          this.customerSearching.set(false);
        },
      });
  }

  get activeTab(): OrderTab | undefined {
    return this.tabs().find((t) => t.id === this.activeId());
  }

  tabTitle(tab: OrderTab): string {
    return tab.editRef ? tab.editRef : `Order ${tab.num}`;
  }

  /** smallest positive number not currently used by an open tab */
  private nextNum(): number {
    const used = new Set(this.tabs().filter((t) => !t.editRef).map((t) => t.num));
    let n = 1;
    while (used.has(n)) n++;
    return n;
  }

  addTab() {
    const tab: OrderTab = {
      id: ++this._idSeq,
      num: this.nextNum(),
      customer: '',
      customerId: null,
      customerMobile: '',
      previousBorrow: 0,
      borrow: false,
      paid: 0,
      payment: 'cash',
      lines: [],
    };
    this.tabs.update((list) => [...list, tab]);
    this.activeId.set(tab.id);
  }

  /** open the popup with an existing sale loaded into a tab for editing */
  loadOrder(sale: Sale) {
    this._open.set(true);
    const existing = this.tabs().find((t) => t.editId === sale.id);
    if (existing) {
      this.activeId.set(existing.id);
      return;
    }
    const tab: OrderTab = {
      id: ++this._idSeq,
      num: 0,
      customer: sale.customer_name,
      customerId: sale.customer_id,
      customerMobile: sale.customer_mobile ?? '',
      previousBorrow: 0,
      borrow: sale.is_borrow,
      paid: sale.paid_amount,
      payment: sale.payment_method,
      lines: sale.lines.map((l) => ({
        product_id: l.product_id,
        product: l.name,
        qty: l.quantity,
        price: l.price,
        available: null,
      })),
      editId: sale.id,
      editRef: sale.invoice_no,
    };
    this.tabs.update((list) => [...list, tab]);
    this.activeId.set(tab.id);

    // the customer's balance already includes this sale's own borrow, so
    // "previous" is the balance minus what this sale still holds
    if (sale.customer_id) {
      const heldBySale = sale.status === 'refunded' ? 0 : sale.borrow_amount;
      this.customerApi
        .getCustomer(sale.customer_id, this.ctx.selectedOfficeId() ?? undefined)
        .subscribe({
          next: (c) => {
            tab.previousBorrow = Math.max(0, round2((c.borrow_amount ?? 0) - heldBySale));
            this.tabs.update((list) => [...list]);
          },
          error: () => {
            // informational only — the sale still edits fine without it
          },
        });
    }
  }

  selectTab(id: number) {
    this.activeId.set(id);
    // the quick-add row belongs to whatever tab is in front
    this.quick = emptyQuickAdd();
    this.closeSuggestions();
    this.closeCustomerSuggestions();
  }

  closeTab(id: number, event?: Event) {
    event?.stopPropagation();
    this.closeSuggestions();
    const remaining = this.tabs().filter((t) => t.id !== id);
    if (remaining.length === 0) {
      this.closePopup();
      return;
    }
    this.tabs.set(remaining);
    if (this.activeId() === id) {
      this.activeId.set(remaining[remaining.length - 1].id);
    }
  }

  closePopup() {
    this._open.set(false);
    this.tabs.set([]);
    this.activeId.set(null);
    this._idSeq = 0;
    this.closeSuggestions();
    this.closed.emit();
  }

  // ---- lines (added through the quick-add row above the list) ----

  removeLine(index: number) {
    const tab = this.activeTab;
    if (!tab) return;
    tab.lines.splice(index, 1);
    this.tabs.update((list) => [...list]);
  }

  lineTotal(line: OrderLine): number {
    return (line.qty || 0) * (line.price || 0);
  }

  orderTotal(tab: OrderTab | undefined): number {
    if (!tab) return 0;
    return tab.lines.reduce((sum, l) => sum + this.lineTotal(l), 0);
  }

  /** picked more units than the product has left */
  overStock(line: OrderLine): boolean {
    return line.available !== null && line.qty > line.available;
  }

  // ---- customer typeahead ----

  onCustomerInput(term: string) {
    const tab = this.activeTab;
    if (!tab) return;
    // typing again detaches the tab from the previously picked customer;
    // whatever is left in the box is what prints on the bill
    tab.customerId = null;
    tab.previousBorrow = 0;
    this.customerSuggestOpen.set(true);
    if (!term.trim()) {
      this.customerSuggestions.set([]);
      return;
    }
    this.customerSearch$.next(term.trim());
  }

  pickCustomer(customer: CustomerListRow) {
    const tab = this.activeTab;
    if (!tab) return;
    tab.customerId = customer.id;
    tab.customer = customer.full_name;
    tab.customerMobile = customer.mobile_no;
    tab.previousBorrow = customer.borrow_amount ?? 0;
    this.closeCustomerSuggestions();
    this.tabs.update((list) => [...list]);
  }

  /** delayed so a click on a suggestion still registers before it hides */
  onCustomerBlur() {
    setTimeout(() => this.closeCustomerSuggestions(), 150);
  }

  private closeCustomerSuggestions() {
    this.customerSuggestOpen.set(false);
    this.customerSuggestions.set([]);
  }

  // ---- borrow ----

  /** turning borrow off clears the split — the sale is paid in full */
  onBorrowToggle() {
    const tab = this.activeTab;
    if (!tab) return;
    tab.paid = tab.borrow ? this.orderTotal(tab) : 0;
    this.tabs.update((list) => [...list]);
  }

  /** total - paid, never negative */
  borrowAmount(tab: OrderTab | undefined): number {
    if (!tab || !tab.borrow) return 0;
    const owed = this.orderTotal(tab) - (Number(tab.paid) || 0);
    return owed > 0 ? Math.round(owed * 100) / 100 : 0;
  }

  /** what the customer will owe once this sale is saved */
  balanceAfter(tab: OrderTab | undefined): number {
    if (!tab) return 0;
    return round2(tab.previousBorrow + this.borrowAmount(tab));
  }

  /** paid more than the bill — the payable box is wrong */
  overPaid(tab: OrderTab | undefined): boolean {
    if (!tab || !tab.borrow) return false;
    return (Number(tab.paid) || 0) > this.orderTotal(tab);
  }

  // ---- quick add: type a product, set qty, Enter (or Add) ----

  onProductInput(term: string) {
    // typing again detaches from the previously picked product
    this.quick.product_id = null;
    this.quick.available = null;
    this.quick.price = 0;
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
    this.quick.price = product.price;
    this.quick.available = product.quantity;
    if (this.quick.qty < 1) this.quick.qty = 1;
    this.closeSuggestions();
    // straight to qty so the next keystroke is the quantity
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

  /** Enter in the qty box adds the item too */
  onQtyKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.addQuickLine();
  }

  /**
   * Put the quick-add product on the bill. Adding the same product again
   * tops up the existing line instead of repeating it.
   */
  addQuickLine() {
    const tab = this.activeTab;
    if (!tab) return;
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

    const existing = tab.lines.find((l) => l.product_id === q.product_id);
    const wanted = (existing?.qty ?? 0) + qty;
    if (q.available !== null && wanted > q.available) {
      this.toast.add({ severity: 'warn', summary: 'Not enough stock', detail: `"${q.product}" has only ${q.available} left` });
      return;
    }

    if (existing) {
      existing.qty = wanted;
    } else {
      tab.lines.push({
        product_id: q.product_id,
        product: q.product,
        qty,
        price: q.price,
        available: q.available,
      });
    }
    this.tabs.update((list) => [...list]);
    this.resetQuick();
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

  /** clear the quick row and park the cursor for the next item */
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

  // ---- save ----

  saveOrder() {
    const tab = this.activeTab;
    if (!tab || this.saving()) return;

    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.toast.add({ severity: 'warn', summary: 'No office', detail: 'Select an office in the header first' });
      return;
    }

    const lines = tab.lines.filter((l) => l.product_id && l.qty > 0);
    if (!lines.length) {
      this.toast.add({ severity: 'warn', summary: 'No items', detail: 'Add at least one product to the bill' });
      return;
    }
    const short = lines.find((l) => this.overStock(l));
    if (short) {
      this.toast.add({ severity: 'warn', summary: 'Not enough stock', detail: `"${short.product}" has only ${short.available} left` });
      return;
    }
    // a credit sale needs someone to bill: a picked customer, or a mobile no
    // we can create one with
    if (tab.borrow && !tab.customerId && !tab.customerMobile.trim()) {
      this.toast.add({ severity: 'warn', summary: 'Mobile required', detail: 'Enter a mobile no to sell on borrow' });
      return;
    }
    if (this.overPaid(tab)) {
      this.toast.add({ severity: 'warn', summary: 'Check payable', detail: 'Payable amount is more than the bill total' });
      return;
    }

    const body: CreateSaleDto = {
      office_id: officeId,
      customer_id: tab.customerId,
      customer_name: tab.customer.trim() || 'Walk-in',
      customer_mobile: tab.customerMobile.trim() || null,
      is_borrow: tab.borrow,
      paid_amount: tab.borrow ? Number(tab.paid) || 0 : undefined,
      payment_method: tab.payment,
      lines: lines.map((l) => ({
        product_id: l.product_id!,
        quantity: Number(l.qty),
        price: Number(l.price),
      })),
    };

    this.saving.set(true);
    const req$ = tab.editId
      ? this.api.updateSale(tab.editId, body)
      : this.api.createSale(body);

    req$.subscribe({
      next: (sale) => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `${sale.invoice_no} saved` });
        this.saved.emit(sale);
        this.closeTab(tab.id);
      },
      error: (err) => {
        this.saving.set(false);
        const e = err?.error;
        const detail = e?.errors?.lines?.[0] ?? e?.message ?? 'Save failed';
        this.toast.add({ severity: 'error', summary: 'Error', detail });
      },
    });
  }
}
