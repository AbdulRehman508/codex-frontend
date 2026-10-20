import { Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { commonIcons } from '../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Menu } from 'primeng/menu';
import { MessageService } from 'primeng/api';

import { AuthApiService } from '../authentication/auth.api';
import { OfficeApiService } from '../user-management/office/office.api';
import { OfficePick } from '../user-management/office/office.model';
import { TokenService } from '../../core/services/token.service';
import { OfficeContextService } from '../../core/services/office-context.service';
import { PermissionService } from '../../core/services/permission.service';
import { AuthUser } from '../authentication/auth.model';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { Lang } from '../../core/i18n/translations';
@Component({
  selector: 'app-header',
  imports: [CommonModule, FormsModule, NgSelectModule, Menu, TranslatePipe],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})

export class Header {

  private router = inject(Router);
  private authApi = inject(AuthApiService);
  private officeApi = inject(OfficeApiService);
  private token = inject(TokenService);
  private perm = inject(PermissionService);
  private toast = inject(MessageService);
  ctx = inject(OfficeContextService);
  i18n = inject(TranslationService);

  ImageIcon = commonIcons
  dropdownOpen: boolean = false;
  // zoneless change detection: the view only re-renders off a signal, so the
  // list that arrives from the API has to be one
  officeList = signal<OfficePick[]>([]);
  /** value bound to the office dropdown; set once the items have loaded */
  selectedOffice = signal<string | null>(null);
  user = signal<AuthUser | null>(null);

  @ViewChild('topBar') topBar!: ElementRef;

  // PrimeNG builds this menu from plain objects, so it is rebuilt on read
  // rather than translated in the template
  get menuItems() {
    return [
      {
        label: this.i18n.t('common.profile'),
        icon: 'pi pi-user',
        command: () => this.router.navigate(['/profile']),
      },
      {
        label: this.i18n.t('common.logout'),
        icon: 'pi pi-sign-out',
        command: () => this.logout(),
      },
    ];
  }

  /** English <-> اردو. The service flips the page direction and the font. */
  switchLang(lang: Lang) {
    this.i18n.use(lang);
  }

  ngOnInit() {
    this.user.set(this.token.getUser());
    this.loadOffices();
  }

  onOfficeChange(id: string | null) {
    // ng-select emits null while it re-resolves its items; the dropdown is not
    // clearable, so a user can never really pick "nothing" — ignore those and
    // keep the current office instead of wiping it
    if (!id) {
      this.selectedOffice.set(this.ctx.selectedOfficeId());
      return;
    }
    this.selectedOffice.set(id);
    this.ctx.setOffice(id);
  }

  private loadOffices() {
    // the server scopes this: every office for an admin, the assigned ones
    // for anyone else
    this.officeApi.listMyOffices().subscribe({
      next: (offices) => {
        this.officeList.set(offices);
        this.bindSelection();
      },
      error: (err) => {
        // an empty office picker breaks every screen under it, so say why
        // instead of leaving the user with a dropdown that just never opens
        this.officeList.set([]);
        this.toast.add({
          severity: 'error',
          summary: this.i18n.t('common.officesFailed'),
          detail: err?.error?.message ?? '',
        });
      },
    });
  }

  /**
   * Bind the remembered office only once the items exist — ng-select drops a
   * value it cannot find among its items. Also forgets an office the user may
   * no longer see (unassigned or deleted).
   */
  private bindSelection() {
    const current = this.ctx.selectedOfficeId();
    const offices = this.officeList();
    const visible = !!current && offices.some((o) => o.id === current);
    if (current && !visible) {
      this.ctx.clear();
    }
    if (visible) {
      this.selectedOffice.set(current);
      return;
    }
    // nothing remembered, and only one branch to choose from: choosing it for
    // the user beats an empty picker that leaves every list below it blank
    if (offices.length === 1) {
      this.selectedOffice.set(offices[0].id);
      this.ctx.setOffice(offices[0].id);
      return;
    }
    this.selectedOffice.set(null);
  }

  get welcomeName(): string {
    const user = this.user();
    return user ? `${user.first_name} ${user.last_name}` : 'User';
  }

  get initials(): string {
    const user = this.user();
    if (!user) return '';
    return `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();
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
