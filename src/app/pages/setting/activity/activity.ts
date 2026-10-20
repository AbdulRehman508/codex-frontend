import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { OfficeContextService } from '../../../core/services/office-context.service';
import { ActivityApiService } from './activity.api';
import { AuditAction, AuditRow } from './activity.model';

@Component({
  selector: 'app-activity',
  imports: [CommonModule, FormsModule, NgSelectModule, DatePickerModule, TranslatePipe],
  templateUrl: './activity.html',
  styleUrl: './activity.scss',
})
export class Activity {
  private api = inject(ActivityApiService);
  // option labels are built here, so they follow the language switch
  private i18n = inject(TranslationService);
  private ctx = inject(OfficeContextService);
  private toast = inject(MessageService);
  private search$ = new Subject<string>();

  constructor() {
    // the trail is office-scoped like every other list; skip the first run
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      untracked(() => {
        if (first) {
          first = false;
          return;
        }
        this.page.set(1);
        this.getActivity();
      });
    });
  }

  rows = signal<AuditRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(25);
  loading = signal(false);

  searchTerm = '';
  moduleFilter: string | null = null;
  actionFilter: AuditAction | null = null;
  /** off: this branch only. on: every branch, which is what an owner wants */
  allOffices = false;
  dateRange: Date[] | null = null;
  readonly today = new Date();
  private dateFrom = '';
  private dateTo = '';

  actionList = computed(() => [
    { label: this.i18n.t('activity.created'), value: 'create' },
    { label: this.i18n.t('activity.updated'), value: 'update' },
    { label: this.i18n.t('activity.deleted'), value: 'delete' },
    { label: this.i18n.t('activity.loggedIn'), value: 'login' },
  ]);

  // the access-catalog keys the interceptor records against
  moduleList = computed(() => [
    { label: this.i18n.t('common.products'), value: 'products' },
    { label: this.i18n.t('nav.sales'), value: 'sales' },
    { label: this.i18n.t('nav.purchase'), value: 'purchase' },
    { label: this.i18n.t('common.supplier'), value: 'supplier' },
    { label: this.i18n.t('nav.stock'), value: 'stock' },
    { label: this.i18n.t('common.customer'), value: 'customer' },
    { label: this.i18n.t('form.office'), value: 'office' },
    { label: this.i18n.t('user.staff'), value: 'staff' },
    { label: this.i18n.t('form.role'), value: 'role' },
    { label: this.i18n.t('setting.accessControl'), value: 'access_control' },
    { label: this.i18n.t('common.location'), value: 'location' },
    { label: this.i18n.t('activity.signIn'), value: 'auth' },
  ]);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));

  ngOnInit() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchTerm = term;
        this.page.set(1);
        this.getActivity();
      });
    this.getActivity();
  }

  getActivity() {
    this.loading.set(true);
    this.api
      .listActivity({
        page: this.page(),
        limit: this.limit(),
        search: this.searchTerm,
        // a login names no office, so "all offices" is the only way to see one
        office_id: this.allOffices ? undefined : this.ctx.selectedOfficeId() ?? undefined,
        module: this.moduleFilter ?? undefined,
        action: this.actionFilter ?? undefined,
        date_from: this.dateFrom || undefined,
        date_to: this.dateTo || undefined,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data);
          this.total.set(res.total);
          this.page.set(res.page);
          this.limit.set(res.limit);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load the activity log' });
        },
      });
  }

  filterRecord() {
    this.search$.next(this.searchTerm);
  }

  onFilterChange() {
    this.page.set(1);
    this.getActivity();
  }

  /** the picker fires on the first click too — wait for a full range */
  onDateRangeChange() {
    const [from, to] = this.dateRange ?? [];
    if (from && !to) return;
    this.dateFrom = from ? asDate(from) : '';
    this.dateTo = to ? asDate(to) : '';
    this.onFilterChange();
  }

  clearFilters() {
    this.searchTerm = '';
    this.moduleFilter = null;
    this.actionFilter = null;
    this.allOffices = false;
    this.dateRange = null;
    this.dateFrom = '';
    this.dateTo = '';
    this.page.set(1);
    this.getActivity();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.getActivity();
  }

  moduleLabel(key: string): string {
    return this.moduleList().find((m) => m.value === key)?.label ?? key;
  }

  actionLabel(value: string): string {
    return this.actionList().find((a) => a.value === value)?.label ?? value;
  }

  /** what the row is about: the record's own name, else the path */
  subject(row: AuditRow): string {
    if (row.entity_label) return row.entity_label;
    if (row.action === 'login') return row.user_email;
    return row.entity_id || row.path;
  }
}

/** local yyyy-MM-dd — toISOString() would shift the day by the UTC offset */
function asDate(d: Date): string {
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
