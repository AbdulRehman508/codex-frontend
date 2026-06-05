import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

export interface OrderLine {
  product: string;
  qty: number;
  price: number;
}

export type PaymentMethod = 'Cash' | 'Online';

export interface OrderPayload {
  ref?: string;            // invoice ref when editing an existing sale
  customer: string;
  payment: PaymentMethod;
  lines: OrderLine[];
  items: number;
  total: number;
}

interface OrderTab {
  id: number;              // unique, internal
  num: number;             // display number (gap-filling)
  customer: string;
  payment: PaymentMethod;
  lines: OrderLine[];
  editRef?: string;        // invoice ref if this tab edits an existing sale
}

@Component({
  selector: 'app-new-sale',
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './new-sale.html',
  styleUrl: './new-sale.scss',
})
export class NewSale {

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
  @Output() saved = new EventEmitter<OrderPayload>();

  _open = signal(false);
  tabs = signal<OrderTab[]>([]);
  activeId = signal<number | null>(null);
  private _idSeq = 0;

  paymentOptions: { label: string; value: PaymentMethod }[] = [
    { label: 'Cash', value: 'Cash' },
    { label: 'Online', value: 'Online' },
  ];

  get activeTab(): OrderTab | undefined {
    return this.tabs().find(t => t.id === this.activeId());
  }

  tabTitle(tab: OrderTab): string {
    return tab.editRef ? tab.editRef : `Order ${tab.num}`;
  }

  /** smallest positive number not currently used by an open tab */
  private nextNum(): number {
    const used = new Set(this.tabs().filter(t => !t.editRef).map(t => t.num));
    let n = 1;
    while (used.has(n)) n++;
    return n;
  }

  addTab() {
    const tab: OrderTab = {
      id: ++this._idSeq,
      num: this.nextNum(),
      customer: '',
      payment: 'Cash',
      lines: [{ product: '', qty: 1, price: 0 }],
    };
    this.tabs.update(list => [...list, tab]);
    this.activeId.set(tab.id);
  }

  /** open popup and load an existing sale into a tab for editing */
  loadOrder(payload: OrderPayload) {
    this._open.set(true);
    // already open in a tab? just focus it
    const existing = this.tabs().find(t => t.editRef && t.editRef === payload.ref);
    if (existing) {
      this.activeId.set(existing.id);
      return;
    }
    const tab: OrderTab = {
      id: ++this._idSeq,
      num: 0,
      customer: payload.customer,
      payment: payload.payment,
      lines: payload.lines.length ? payload.lines.map(l => ({ ...l })) : [{ product: '', qty: 1, price: 0 }],
      editRef: payload.ref,
    };
    this.tabs.update(list => [...list, tab]);
    this.activeId.set(tab.id);
  }

  selectTab(id: number) {
    this.activeId.set(id);
  }

  closeTab(id: number, event?: Event) {
    event?.stopPropagation();
    const remaining = this.tabs().filter(t => t.id !== id);
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
    this.closed.emit();
  }

  addLine() {
    const tab = this.activeTab;
    if (!tab) return;
    tab.lines.push({ product: '', qty: 1, price: 0 });
    this.tabs.update(list => [...list]);
  }

  removeLine(index: number) {
    const tab = this.activeTab;
    if (!tab) return;
    tab.lines.splice(index, 1);
    if (tab.lines.length === 0) {
      tab.lines.push({ product: '', qty: 1, price: 0 });
    }
    this.tabs.update(list => [...list]);
  }

  lineTotal(line: OrderLine): number {
    return (line.qty || 0) * (line.price || 0);
  }

  orderTotal(tab: OrderTab | undefined): number {
    if (!tab) return 0;
    return tab.lines.reduce((sum, l) => sum + this.lineTotal(l), 0);
  }

  saveOrder() {
    const tab = this.activeTab;
    if (!tab) return;
    const items = tab.lines.reduce((n, l) => n + (l.qty || 0), 0);
    this.saved.emit({
      ref: tab.editRef,
      customer: tab.customer,
      payment: tab.payment,
      lines: tab.lines.map(l => ({ ...l })),
      items,
      total: this.orderTotal(tab),
    });
    this.closeTab(tab.id);
  }
}
