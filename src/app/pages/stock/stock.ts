import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { PermissionService } from '../../core/services/permission.service';

interface TabItem {
  label: string;
  icon: string;
  url: string;
}

@Component({
  selector: 'app-stock',
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './stock.html',
  styleUrl: './stock.scss',
})
export class Stock {
  private perm = inject(PermissionService);
  private router = inject(Router);

  // both tabs sit under the one access key: they are the same stock ledger
  readonly module = 'stock';

  private allTabs: TabItem[] = [
    { label: 'stock.tabAdjustments', icon: 'pi pi-sliders-h', url: '/stock/adjustments' },
    { label: 'stock.tabRequests', icon: 'pi pi-send', url: '/stock/requests' },
    { label: 'stock.tabTransfers', icon: 'pi pi-arrow-right-arrow-left', url: '/stock/transfers' },
  ];

  tabs = computed(() => (this.perm.can(this.module) ? this.allTabs : []));

  ngOnInit() {
    // landed on the bare section — open the first tab
    const url = this.router.url.split('?')[0];
    if (url === '/stock') {
      const first = this.tabs()[0];
      if (first) this.router.navigateByUrl(first.url);
    }
  }
}
