import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { PermissionService } from '../../core/services/permission.service';

interface TabItem {
  label: string;
  icon: string;
  url: string;
  module: string;
}

@Component({
  selector: 'app-purchase',
  imports: [CommonModule, RouterModule],
  templateUrl: './purchase.html',
  styleUrl: './purchase.scss',
})
export class PurchaseSection {
  private perm = inject(PermissionService);
  private router = inject(Router);

  private allTabs: TabItem[] = [
    { label: 'Purchases', icon: 'pi pi-shopping-bag', url: '/purchase/list', module: 'purchase' },
    { label: 'Suppliers', icon: 'pi pi-truck', url: '/purchase/suppliers', module: 'supplier' },
  ];

  // only the tabs the current user may view (admins see all)
  tabs = computed(() => this.allTabs.filter((t) => this.perm.can(t.module)));

  ngOnInit() {
    // landed on the bare section — jump to the first tab the user can see
    const url = this.router.url.split('?')[0];
    if (url === '/purchase') {
      const first = this.tabs()[0];
      if (first) this.router.navigateByUrl(first.url);
    }
  }
}
