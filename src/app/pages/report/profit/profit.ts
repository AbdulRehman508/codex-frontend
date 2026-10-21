import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';

import { OfficeContextService } from '../../../core/services/office-context.service';
import { ProfitApiService } from './profit.api';
import { ProfitPeriod, ProfitPoint, ProfitReport } from './profit.model';

@Component({
  selector: 'app-profit',
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './profit.html',
  styleUrl: './profit.scss',
})
export class Profit {
  private api = inject(ProfitApiService);
  private ctx = inject(OfficeContextService);
  private toast = inject(MessageService);

  constructor() {
    // the header office decides whose profit this is
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      untracked(() => {
        if (first) {
          first = false;
          return;
        }
        this.load();
      });
    });
  }

  data = signal<ProfitReport | null>(null);
  loading = signal(false);
  period = signal<ProfitPeriod>('today');
  hoverIndex = signal<number | null>(null);

  readonly periods: { key: ProfitPeriod; label: string }[] = [
    { key: 'today', label: 'profit.today' },
    { key: 'week', label: 'profit.week' },
    { key: 'month', label: 'profit.month' },
  ];

  /** the shop's own clock decides which day a late-night sale belongs to */
  private readonly tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  hasOffice = computed(() => !!this.ctx.selectedOfficeId());

  ngOnInit() {
    this.load();
  }

  setPeriod(key: ProfitPeriod) {
    if (key === this.period()) return;
    this.period.set(key);
    this.hoverIndex.set(null);
    this.load();
  }

  load() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.data.set(null);
      return;
    }
    this.loading.set(true);
    this.api.getProfit({ office_id: officeId, period: this.period(), tz: this.tz }).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Failed to load the profit report',
        });
      },
    });
  }

  // ---------- chart ----------

  series = computed<ProfitPoint[]>(() => this.data()?.series ?? []);

  /** the tallest bar decides the scale; a loss counts by its size */
  private peak = computed(() =>
    this.series().reduce((max, p) => Math.max(max, Math.abs(p.profit)), 0),
  );

  hasProfitData = computed(() => this.series().some((p) => p.profit !== 0));

  barHeight(point: ProfitPoint): number {
    const peak = this.peak();
    if (!peak) return 0;
    return Math.max(2, (Math.abs(point.profit) / peak) * 100);
  }

  hovered = computed(() => {
    const i = this.hoverIndex();
    return i === null ? null : (this.series()[i] ?? null);
  });

  tooltipLeft = computed(() => {
    const i = this.hoverIndex();
    const n = this.series().length;
    if (i === null || !n) return 0;
    return Math.min(88, Math.max(12, ((i + 0.5) / n) * 100));
  });

  /** thin out the axis labels so they never collide */
  showLabel(index: number): boolean {
    const n = this.series().length;
    const every = Math.ceil(n / 8);
    return index % every === 0;
  }

  // ---------- numbers ----------

  money(value: number): string {
    return (value ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  compact(value: number): string {
    const abs = Math.abs(value ?? 0);
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return `${Math.round(value ?? 0)}`;
  }

  /** 'good' | 'bad' | 'flat' — for the change chip */
  changeTone(change: number | null): string {
    if (change === null || change === 0) return 'flat';
    return change > 0 ? 'good' : 'bad';
  }

  /** the window's name, from our own chips — the API label is English */
  periodLabel = computed(
    () => this.periods.find((p) => p.key === this.period())?.label ?? 'profit.today',
  );

  /** what the comparison window is called, in words */
  comparisonKey = computed(() => {
    switch (this.period()) {
      case 'today':
        return 'profit.vsYesterday';
      case 'week':
        return 'profit.vsLastWeek';
      default:
        return 'profit.vsLastMonth';
    }
  });
}
