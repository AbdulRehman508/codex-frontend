import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';

import { OfficeContextService } from '../../../core/services/office-context.service';
import { TokenService } from '../../../core/services/token.service';
import { OfficeApiService } from '../../user-management/office/office.api';
import { DayCloseApiService } from './day-close.api';
import { DayClose } from './day-close.model';

@Component({
  selector: 'app-day-close',
  imports: [CommonModule, FormsModule, RouterModule, DatePickerModule],
  templateUrl: './day-close.html',
  styleUrl: './day-close.scss',
})
export class DayCloseSheet {
  private api = inject(DayCloseApiService);
  private officeApi = inject(OfficeApiService);
  private ctx = inject(OfficeContextService);
  private token = inject(TokenService);
  private toast = inject(MessageService);

  constructor() {
    // reload when the header office changes (skip the initial run)
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      untracked(() => {
        if (first) {
          first = false;
          return;
        }
        this.loadOffice();
        this.load();
      });
    });
  }

  data = signal<DayClose | null>(null);
  loading = signal(false);
  officeName = signal('');
  printedAt = signal<Date | null>(null);

  /** the day being closed; today until the user picks another */
  day: Date = new Date();
  readonly today = new Date();
  /** the shop's own clock decides which day a late-night sale belongs to */
  private readonly tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  hasOffice = computed(() => !!this.ctx.selectedOfficeId());
  /** cash taken, debts settled, money paid out — the drawer in three lines */
  drawer = computed(() => this.data()?.cash_drawer ?? null);

  ngOnInit() {
    this.loadOffice();
    this.load();
  }

  private loadOffice() {
    const id = this.ctx.selectedOfficeId();
    if (!id) {
      this.officeName.set('');
      return;
    }
    this.officeApi.getOffice(id).subscribe({
      next: (o) => this.officeName.set(o.office_name),
      // the sheet still prints without the shop name in the header
      error: () => this.officeName.set(''),
    });
  }

  load() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.data.set(null);
      return;
    }
    this.loading.set(true);
    this.api
      .getDayClose({ office_id: officeId, date: asDate(this.day), tz: this.tz })
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load the day close' });
        },
      });
  }

  onDateChange() {
    this.load();
  }

  /** jump a day either way without opening the picker */
  shiftDay(days: number) {
    const next = new Date(this.day);
    next.setDate(next.getDate() + days);
    if (next > this.today) return;
    this.day = next;
    this.load();
  }

  goToday() {
    this.day = new Date();
    this.load();
  }

  isToday(): boolean {
    return asDate(this.day) === asDate(this.today);
  }

  print() {
    this.printedAt.set(new Date());
    // the global print rules hide everything but a #printArea; this page is
    // its own sheet, so it opts out of that while the dialog is open
    document.body.classList.add('print-page');
    const done = () => {
      document.body.classList.remove('print-page');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    // let the stamp render before the dialog freezes the page
    setTimeout(() => {
      window.print();
      // Safari never fires afterprint for a cancelled dialog
      setTimeout(done, 1000);
    }, 100);
  }

  /** admins can see which shop the sheet is for, everyone else has only one */
  get isAdmin(): boolean {
    return this.token.isAdmin();
  }
}

/** local yyyy-MM-dd — toISOString() would shift the day by the UTC offset */
function asDate(d: Date): string {
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
