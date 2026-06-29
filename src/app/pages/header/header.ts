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

  ImageIcon = commonIcons
  dropdownOpen: boolean = false;
  officeList: OfficeListRow[] = [];
  selectedOfficeId: string | null = null;
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
    this.selectedOfficeId = this.user?.office_ids?.[0] ?? null;
    this.loadOffices();
  }

  private loadOffices() {
    this.officeApi.listOffices({ limit: 1000, sort: 'office_name', order: 'asc' }).subscribe({
      next: (res) => (this.officeList = res.data),
      error: () => (this.officeList = []),
    });
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
    this.router.navigateByUrl('/login');
  }



  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent) {
    if (this.dropdownOpen && !this.topBar.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }
}
