import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StatCard {
  label: string;
  value: string;
  delta: number;
  icon: string;
  tone: 'primary' | 'info' | 'green' | 'danger';
}

interface SalesBar {
  day: string;
  value: number;
}

interface Category {
  name: string;
  percent: number;
  color: string;
}

interface Product {
  name: string;
  sold: number;
  revenue: string;
}

interface Order {
  id: string;
  customer: string;
  items: number;
  total: string;
  status: 'Paid' | 'Pending' | 'Refunded';
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {

  stats: StatCard[] = [
    { label: 'Total Sales', value: '$48,250', delta: 12.5, icon: 'pi pi-dollar', tone: 'primary' },
    { label: 'Orders', value: '1,284', delta: 8.2, icon: 'pi pi-shopping-cart', tone: 'info' },
    { label: 'Customers', value: '892', delta: 5.1, icon: 'pi pi-users', tone: 'green' },
    { label: 'Refunds', value: '$1,120', delta: -2.4, icon: 'pi pi-undo', tone: 'danger' },
  ];

  salesWeek: SalesBar[] = [
    { day: 'Mon', value: 62 },
    { day: 'Tue', value: 48 },
    { day: 'Wed', value: 80 },
    { day: 'Thu', value: 55 },
    { day: 'Fri', value: 92 },
    { day: 'Sat', value: 100 },
    { day: 'Sun', value: 70 },
  ];

  categories: Category[] = [
    { name: 'Groceries', percent: 42, color: '#229276' },
    { name: 'Beverages', percent: 28, color: '#689edb' },
    { name: 'Snacks', percent: 18, color: '#f57200' },
    { name: 'Others', percent: 12, color: '#dadce0' },
  ];

  topProducts: Product[] = [
    { name: 'Organic Coffee Beans', sold: 320, revenue: '$4,160' },
    { name: 'Fresh Milk 1L', sold: 280, revenue: '$1,400' },
    { name: 'Whole Wheat Bread', sold: 245, revenue: '$980' },
    { name: 'Sparkling Water', sold: 190, revenue: '$760' },
  ];

  recentOrders: Order[] = [
    { id: '#ORD-1042', customer: 'Ali Hassan', items: 4, total: '$86.00', status: 'Paid' },
    { id: '#ORD-1041', customer: 'Sara Khan', items: 2, total: '$24.50', status: 'Pending' },
    { id: '#ORD-1040', customer: 'John Smith', items: 7, total: '$152.30', status: 'Paid' },
    { id: '#ORD-1039', customer: 'Maria Lopez', items: 1, total: '$12.00', status: 'Refunded' },
    { id: '#ORD-1038', customer: 'Ahmed Raza', items: 5, total: '$98.75', status: 'Paid' },
  ];

  get donutGradient(): string {
    let acc = 0;
    const stops = this.categories.map(c => {
      const start = acc;
      acc += c.percent;
      return `${c.color} ${start}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }
}
