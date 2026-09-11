import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { commonIcons } from '../../core/icon-images/common-icon';
import { PermissionService } from '../../core/services/permission.service';

interface TabItem {
  label: string;
  icon: string;
  url: string;
  module: string;
  isExact?: boolean;
  /** admins only, whatever the role's access matrix says */
  adminOnly?: boolean;
}

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, RouterModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagement {
  private perm = inject(PermissionService);
  private router = inject(Router);

  ImageIcon = commonIcons;

  private allTabs: TabItem[] = [
    { label: 'Customer', icon: this.ImageIcon.customer_icon, url: '/user-management/customer', module: 'customer' },
    { label: 'Office', icon: this.ImageIcon.office_icon, url: '/user-management/office', module: 'office', adminOnly: true },
    { label: 'Staff', icon: this.ImageIcon.staff_icon, url: '/user-management/staff', module: 'staff' },
  ];

  // only the tabs the current user may view (admins see all)
  user_menu = computed(() =>
    this.allTabs.filter((t) => {
      if (t.adminOnly && !this.perm.isAdmin()) return false;
      return this.perm.can(t.module);
    }),
  );

  ngOnInit() {
    // landed on the bare section — jump to the first tab the user can see
    // (permissions are already loaded: the section guard awaited them)
    const url = this.router.url.split('?')[0];
    if (url === '/user-management') {
      const first = this.user_menu()[0];
      if (first) this.router.navigateByUrl(first.url);
    }
  }
}
