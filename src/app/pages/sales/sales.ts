import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  payment: 'Cash' | 'Card' | 'Online';
  amount: string;
  status: 'Completed' | 'Pending' | 'Refunded';
}

@Component({
  selector: 'app-sales',
  imports: [CommonModule, FormsModule],
  templateUrl: './sales.html',
  styleUrl: './sales.scss',
})
export class Sales {

  stats: SaleStat[] = [
    { label: "Today's Sales", value: '$3,480', icon: 'pi pi-dollar', tone: 'primary' },
    { label: 'Transactions', value: '64', icon: 'pi pi-receipt', tone: 'info' },
    { label: 'Avg. Order', value: '$54.30', icon: 'pi pi-chart-line', tone: 'green' },
  ];

  sales: Sale[] = [
    { invoice: '#INV-2051', date: '2026-06-03', customer: 'Ali Hassan', items: 4, payment: 'Card', amount: '$86.00', status: 'Completed' },
    { invoice: '#INV-2050', date: '2026-06-03', customer: 'Sara Khan', items: 2, payment: 'Cash', amount: '$24.50', status: 'Pending' },
    { invoice: '#INV-2049', date: '2026-06-02', customer: 'John Smith', items: 7, payment: 'Online', amount: '$152.30', status: 'Completed' },
    { invoice: '#INV-2048', date: '2026-06-02', customer: 'Maria Lopez', items: 1, payment: 'Cash', amount: '$12.00', status: 'Refunded' },
    { invoice: '#INV-2047', date: '2026-06-01', customer: 'Ahmed Raza', items: 5, payment: 'Card', amount: '$98.75', status: 'Completed' },
    { invoice: '#INV-2046', date: '2026-06-01', customer: 'Emma Wilson', items: 3, payment: 'Online', amount: '$45.20', status: 'Completed' },
  ];

  searchTerm: string = '';

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
    // TODO: open new sale flow
  }
}
