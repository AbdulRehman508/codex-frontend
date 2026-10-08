import { Component, computed, inject } from '@angular/core';
import { commonIcons } from '../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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
  selector: 'app-setting',
  imports: [CommonModule, RouterModule],
  templateUrl: './setting.html',
  styleUrl: './setting.scss',
})
export class Setting {
  private perm = inject(PermissionService);
  private router = inject(Router);

  ImageIcon = commonIcons;

  private allTabs: TabItem[] = [
    { label: 'Access Control', icon: this.ImageIcon.lock_icon, url: '/setting/access', module: 'access_control' },
    { label: 'Role', icon: this.ImageIcon.role_icon, url: '/setting/role', module: 'role' },
    { label: 'Activity Log', icon: this.ImageIcon.find_icon, url: '/setting/activity', module: 'activity', adminOnly: true },
    { label: 'Trash', icon: this.ImageIcon.delete_icon, url: '/setting/trash', module: 'trash', adminOnly: true },
  ];

  // only the tabs the current user may view (admins see all)
  setting_menu = computed(() =>
    this.allTabs.filter((t) =>
      t.adminOnly ? this.perm.isAdmin() : this.perm.can(t.module),
    ),
  );

  ngOnInit() {
    // landed on the bare section — jump to the first tab the user can see
    const url = this.router.url.split('?')[0];
    if (url === '/setting') {
      const first = this.setting_menu()[0];
      if (first) this.router.navigateByUrl(first.url);
    }
  }
}
