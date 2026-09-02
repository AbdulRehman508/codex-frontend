import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { OfficeContextService } from '../../../core/services/office-context.service';
import { ProductApiService } from '../../product-list/product.api';
import { ProductListRow } from '../../product-list/product.model';
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
  customer: string;
  payment: PaymentMethod;
  lines: OrderLine[];
  editId?: string;         // sale id when editing an existing sale
  editRef?: string;        // invoice no shown on the tab while editing
}

function emptyLine(): OrderLine {
  return { product_id: null, product: '', qty: 1, price: 0, available: null };
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

  // ---- product typeahead ----
  suggestions = signal<ProductListRow[]>([]);
  /** index of the line whose suggestion list is open (-1 = none) */
  openSuggestFor = signal(-1);
  searching = signal(false);
  private search$ = new Subject<string>();

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
      payment: 'cash',
      lines: [emptyLine()],
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
      payment: sale.payment_method,
      lines: sale.lines.length
        ? sale.lines.map((l) => ({
            product_id: l.product_id,
            product: l.name,
            qty: l.quantity,
            price: l.price,
            available: null,
          }))
        : [emptyLine()],
      editId: sale.id,
      editRef: sale.invoice_no,
    };
    this.tabs.update((list) => [...list, tab]);
    this.activeId.set(tab.id);
  }

  selectTab(id: number) {
    this.activeId.set(id);
    this.closeSuggestions();
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

  // ---- lines ----

  addLine() {
    const tab = this.activeTab;
    if (!tab) return;
    tab.lines.push(emptyLine());
    this.tabs.update((list) => [...list]);
  }

  removeLine(index: number) {
    const tab = this.activeTab;
    if (!tab) return;
    tab.lines.splice(index, 1);
    if (tab.lines.length === 0) {
      tab.lines.push(emptyLine());
    }
    this.closeSuggestions();
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

  // ---- product typeahead ----

  onProductInput(index: number, term: string) {
    const tab = this.activeTab;
    const line = tab?.lines[index];
    if (!line) return;
    // typing again detaches the line from the previously picked product
    line.product_id = null;
    line.available = null;
    this.openSuggestFor.set(index);
    if (!term.trim()) {
      this.suggestions.set([]);
      return;
    }
    this.search$.next(term.trim());
  }

  pickProduct(index: number, product: ProductListRow) {
    const tab = this.activeTab;
    const line = tab?.lines[index];
    if (!line) return;
    line.product_id = product.id;
    line.product = product.name;
    line.price = product.price;
    line.available = product.quantity;
    if (line.qty < 1) line.qty = 1;
    this.closeSuggestions();
    this.tabs.update((list) => [...list]);
  }

  /** delayed so a click on a suggestion still registers before it hides */
  onProductBlur() {
    setTimeout(() => this.closeSuggestions(), 150);
  }

  private closeSuggestions() {
    this.openSuggestFor.set(-1);
    this.suggestions.set([]);
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
      this.toast.add({ severity: 'warn', summary: 'No items', detail: 'Pick at least one product from the suggestions' });
      return;
    }
    if (tab.lines.some((l) => l.product.trim() && !l.product_id)) {
      this.toast.add({ severity: 'warn', summary: 'Unknown product', detail: 'Choose each product from the suggestion list' });
      return;
    }
    const short = lines.find((l) => this.overStock(l));
    if (short) {
      this.toast.add({ severity: 'warn', summary: 'Not enough stock', detail: `"${short.product}" has only ${short.available} left` });
      return;
    }

    const body: CreateSaleDto = {
      office_id: officeId,
      customer_name: tab.customer.trim() || 'Walk-in',
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
