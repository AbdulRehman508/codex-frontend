import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { commonIcons } from '../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Menu } from 'primeng/menu';

import { AuthApiService } from '../authentication/auth.api';
import { OfficeApiService } from '../user-management/office/office.api';
import { OfficeListRow } from '../user-management/office/office.model';
import { TokenService } from '../../core/services/token.service';
import { OfficeContextService } from '../../core/services/office-context.service';
import { PermissionService } from '../../core/services/permission.service';
import { AuthUser } from '../authentication/auth.model';
@Component({
  selector: 'app-header',
  imports: [CommonModule, FormsModule, NgSelectModule, Menu],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})

export class Header {

  private router = inject(Router);
  private authApi = inject(AuthApiService);
  private officeApi = inject(OfficeApiService);
  private token = inject(TokenService);
  private perm = inject(PermissionService);
  ctx = inject(OfficeContextService);

  ImageIcon = commonIcons
  dropdownOpen: boolean = false;
  officeList: OfficeListRow[] = [];
  /** value bound to the office dropdown; set once the items have loaded */
  selectedOffice: string | null = null;
  user: AuthUser | null = null;

  @ViewChild('topBar') topBar!: ElementRef;

  menuItems = [
    {
      label: 'Profile',
      icon: 'pi pi-user',
      command: () => this.router.navigate(['/profile'])
    },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => this.logout()
    }
  ];

  ngOnInit() {
    this.user = this.token.getUser();
    this.loadOffices();
  }

  onOfficeChange(id: string | null) {
    // ng-select emits null while it re-resolves its items; the dropdown is not
    // clearable, so a user can never really pick "nothing" — ignore those and
    // keep the current office instead of wiping it
    if (!id) {
      this.selectedOffice = this.ctx.selectedOfficeId();
      return;
    }
    this.selectedOffice = id;
    this.ctx.setOffice(id);
  }

  private loadOffices() {
    // Admin sees every office; others only their assigned offices
    this.officeApi.listOffices({ limit: 1000, sort: 'office_name', order: 'asc' }).subscribe({
      next: (res) => {
        this.officeList = this.token.filterOfficesForUser(res.data);
        this.bindSelection();
      },
      error: () => (this.officeList = []),
    });
  }

  /**
   * Bind the remembered office only once the items exist — ng-select drops a
   * value it cannot find among its items. Also forgets an office the user may
   * no longer see (unassigned or deleted).
   */
  private bindSelection() {
    const current = this.ctx.selectedOfficeId();
    const visible = !!current && this.officeList.some((o) => o.id === current);
    this.selectedOffice = visible ? current : null;
    if (current && !visible) {
      this.ctx.clear();
    }
  }

  get welcomeName(): string {
    return this.user ? `${this.user.first_name} ${this.user.last_name}` : 'User';
  }

  get initials(): string {
    if (!this.user) return '';
    return `${this.user.first_name?.[0] ?? ''}${this.user.last_name?.[0] ?? ''}`.toUpperCase();
  }

  logout() {
    // best-effort server call; clear session regardless of outcome
    this.authApi.logout().subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout(),
    });
  }

  private finishLogout() {
    this.token.clearSession();
    this.perm.clear();
    // local only — the server keeps the office for the next login
    this.ctx.clear();
    this.router.navigateByUrl('/login');
  }



  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent) {
    if (this.dropdownOpen && !this.topBar.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }
}
