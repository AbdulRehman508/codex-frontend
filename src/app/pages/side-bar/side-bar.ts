import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { commonIcons } from '../../core/icon-images/common-icon';
import { PermissionService } from '../../core/services/permission.service';

interface MenuItem {
  label: string;
  icon: string;
  url: string;
  isExact?: boolean;
  /** access-catalog module key; when set the item shows only with `view`. */
  module?: string;
  /** section item: show when the user can view ANY of these child modules. */
  anyOf?: string[];
}

@Component({
  selector: 'app-side-bar',
  imports: [RouterModule, CommonModule],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss',
})
export class SideBar {
  private perm = inject(PermissionService);

  activeRoute: string = '';
  ImageIcon = commonIcons;

  // full menu; items with a `module` are permission-gated
  private allMenu: MenuItem[] = [
    { label: 'Dashboard', icon: this.ImageIcon.home_icon, url: '/dashboard' },
    { label: 'Product', icon: this.ImageIcon.list_icon, url: '/product', module: 'products' },
    { label: 'Sales', icon: this.ImageIcon.sale_icon, url: '/sales', module: 'sales' },
    // parked until these modules are finished (see access.constants.ts too)
    // { label: 'Stock', icon: this.ImageIcon.stock_icon, url: '/stock', module: 'stock' },
    { label: 'Report', icon: this.ImageIcon.report_icon, url: '/report', module: 'reports' },
    // { label: 'Location', icon: this.ImageIcon.location_icon, url: '/location', module: 'location' },
    // { label: 'Trace Product', icon: this.ImageIcon.find_icon, url: '/trace-product' },
    { label: 'User Management', icon: this.ImageIcon.user_icon, url: '/user-management', anyOf: ['customer', 'staff'] },
    { label: 'Setting', icon: this.ImageIcon.setting_icon, url: '/setting', anyOf: ['access_control', 'role'] },
  ];

  // reactive: recomputes when the permission matrix loads
  side_menu = computed(() =>
    this.allMenu.filter((item) => {
      if (item.anyOf) return item.anyOf.some((m) => this.perm.can(m));
      if (item.module) return this.perm.can(item.module);
      return true;
    }),
  );

  constructor(private router: Router) {
    // make sure the current user's permissions are loaded
    this.perm.ensureLoaded();

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.activeRoute = event.urlAfterRedirects;
      }
    });
  }
}
