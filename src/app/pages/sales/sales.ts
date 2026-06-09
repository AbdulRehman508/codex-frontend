import { Component, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewSale, OrderPayload, OrderLine, PaymentMethod } from './new-sale/new-sale';

interface SaleStat {
  label: string;
  value: string;
  icon: string;
  tone: 'primary' | 'info' | 'green';
}

interface Sale {
  invoice: string;
  date: string;
  customer: string;
  items: number;
  payment: PaymentMethod;
  amount: string;
  status: 'Completed' | 'Pending' | 'Refunded';
  lines?: OrderLine[];
}

@Component({
  selector: 'app-sales',
  imports: [CommonModule, FormsModule, NewSale],
  templateUrl: './sales.html',
  styleUrl: './sales.scss',
})
export class Sales {

  @ViewChild(NewSale) newSalePopup!: NewSale;

  stats: SaleStat[] = [
    { label: "Today's Sales", value: '$3,480', icon: 'pi pi-dollar', tone: 'primary' },
    { label: 'Transactions', value: '64', icon: 'pi pi-receipt', tone: 'info' },
    { label: 'Avg. Order', value: '$54.30', icon: 'pi pi-chart-line', tone: 'green' },
  ];

  sales: Sale[] = [
    { invoice: '#INV-2051', date: '2026-06-03', customer: 'Ali Hassan', items: 4, payment: 'Online', amount: '$86.00', status: 'Completed' },
    { invoice: '#INV-2050', date: '2026-06-03', customer: 'Sara Khan', items: 2, payment: 'Cash', amount: '$24.50', status: 'Pending' },
    { invoice: '#INV-2049', date: '2026-06-02', customer: 'John Smith', items: 7, payment: 'Online', amount: '$152.30', status: 'Completed' },
    { invoice: '#INV-2048', date: '2026-06-02', customer: 'Maria Lopez', items: 1, payment: 'Cash', amount: '$12.00', status: 'Refunded' },
    { invoice: '#INV-2047', date: '2026-06-01', customer: 'Ahmed Raza', items: 5, payment: 'Online', amount: '$98.75', status: 'Completed' },
    { invoice: '#INV-2046', date: '2026-06-01', customer: 'Emma Wilson', items: 3, payment: 'Online', amount: '$45.20', status: 'Completed' },
  ];

  searchTerm: string = '';
  showNewSale = signal(false);

  get filteredSales(): Sale[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.sales;
    return this.sales.filter(s =>
      s.invoice.toLowerCase().includes(term) ||
      s.customer.toLowerCase().includes(term)
    );
  }

  clearSearch() {
    this.searchTerm = '';
  }

  newSale() {
    this.showNewSale.set(true);
  }

  editSale(sale: Sale) {
    this.showNewSale.set(true);
    const lines = sale.lines && sale.lines.length
      ? sale.lines.map(l => ({ ...l }))
      : [{ product: 'Item', qty: sale.items, price: this.parseAmount(sale.amount) / (sale.items || 1) }];
    const payload: OrderPayload = {
      ref: sale.invoice,
      customer: sale.customer,
      payment: sale.payment,
      lines,
      items: sale.items,
      total: this.parseAmount(sale.amount),
    };
    this.newSalePopup.loadOrder(payload);
  }

  onOrderSaved(payload: OrderPayload) {
    const amount = '$' + payload.total.toFixed(2);

    if (payload.ref) {
      // editing existing sale
      const idx = this.sales.findIndex(s => s.invoice === payload.ref);
      if (idx > -1) {
        this.sales[idx] = {
          ...this.sales[idx],
          customer: payload.customer,
          payment: payload.payment,
          items: payload.items,
          amount,
          lines: payload.lines,
        };
        this.sales = [...this.sales];
        return;
      }
    }

    // new sale
    this.sales = [
      {
        invoice: this.nextInvoice(),
        date: this.today(),
        customer: payload.customer || 'Walk-in',
        items: payload.items,
        payment: payload.payment,
        amount,
        status: 'Completed',
        lines: payload.lines,
      },
      ...this.sales,
    ];
  }

  private parseAmount(amount: string): number {
    return parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  }

  private nextInvoice(): string {
    const max = this.sales.reduce((m, s) => {
      const n = parseInt(s.invoice.replace(/[^0-9]/g, ''), 10) || 0;
      return Math.max(m, n);
    }, 0);
    return '#INV-' + (max + 1);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
