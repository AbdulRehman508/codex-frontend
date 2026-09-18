import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';

import { OfficeContextService } from '../../core/services/office-context.service';
import { TokenService } from '../../core/services/token.service';
import { DashboardApiService } from './dashboard.api';
import { Compared, DashboardOverview } from './dashboard.model';

type Period = 'today' | '7d' | '30d' | '90d';

interface StatTile {
  label: string;
  /** compact display value (12.9K) — the exact one lives in `title` */
  value: string;
  title: string;
  icon: string;
  tone: 'primary' | 'info' | 'green' | 'danger';
  /** signed % vs the previous window; null = nothing to compare against */
  delta: number | null;
  /** is a rise good news for this figure? (refunds: no) */
  upIsGood: boolean;
  /** point-in-time balances carry a note instead of a delta */
  note?: string;
}

interface TrendPoint {
  key: string;
  /** axis label, e.g. "Mon" / "12 Sep" / "09:00" */
  label: string;
  /** tooltip heading, e.g. "Thu, 18 Sep 2026" */
  title: string;
  revenue: number;
  orders: number;
}

// validated pair (CVD ΔE 17.8, both ≥ 3:1 on white) — see the dataviz check
const CASH_COLOR = '#229276';
const ONLINE_COLOR = '#2a78d6';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private api = inject(DashboardApiService);
  private ctx = inject(OfficeContextService);
  private token = inject(TokenService);
  private toast = inject(MessageService);

  readonly cashColor = CASH_COLOR;
  readonly onlineColor = ONLINE_COLOR;
  private readonly tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
    { key: '90d', label: 'Last 90 days' },
  ];

  period = signal<Period>('7d');
  data = signal<DashboardOverview | null>(null);
  loading = signal(false);
  hasOffice = computed(() => !!this.ctx.selectedOfficeId());
  firstName = this.token.getUser()?.first_name ?? '';

  /** chart state */
  hoverIndex = signal<number | null>(null);
  showTable = signal(false);

  constructor() {
    // reload when the header office changes (skip the initial run). Untracked:
    // loading reads and writes signals that must not become dependencies.
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

  ngOnInit() {
    this.load();
  }

  setPeriod(p: Period) {
    if (p === this.period()) return;
    this.period.set(p);
    this.load();
  }

  load() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.data.set(null);
      return;
    }
    const { from, to } = this.rangeFor(this.period());
    // keep the previous render on screen (dimmed) while refetching
    this.loading.set(true);
    this.hoverIndex.set(null);
    this.api
      .getOverview({
        office_id: officeId,
        date_from: from.toISOString(),
        date_to: to.toISOString(),
        tz: this.tz,
      })
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load dashboard' });
        },
      });
  }

  // ---------- KPI tiles ----------

  stats = computed<StatTile[]>(() => {
    const d = this.data();
    if (!d) return [];
    const k = d.kpis;
    return [
      this.tile('Total Sales', k.revenue, 'pi pi-dollar', 'primary', true, true),
      this.tile('Orders', k.orders, 'pi pi-shopping-cart', 'info', true, false),
      this.tile('New Customers', k.new_customers, 'pi pi-users', 'green', true, false),
      this.tile('Refunds', k.refunds, 'pi pi-undo', 'danger', false, true),
      {
        label: 'Outstanding Borrow',
        value: compact(k.outstanding_borrow),
        title: money(k.outstanding_borrow),
        icon: 'pi pi-wallet',
        tone: 'info',
        delta: null,
        upIsGood: false,
        note: 'owed right now',
      },
    ];
  });

  private tile(
    label: string,
    c: Compared,
    icon: string,
    tone: StatTile['tone'],
    upIsGood: boolean,
    isMoney: boolean,
  ): StatTile {
    return {
      label,
      value: isMoney ? compact(c.value) : c.value.toLocaleString('en-US'),
      title: isMoney ? money(c.value) : c.value.toLocaleString('en-US'),
      icon,
      tone,
      delta: percentChange(c),
      upIsGood,
    };
  }

  /** 'good' | 'bad' | 'flat' — direction × whether up is good */
  deltaTone(s: StatTile): string {
    if (s.delta === null || s.delta === 0) return 'flat';
    return s.delta > 0 === s.upIsGood ? 'good' : 'bad';
  }

  comparisonLabel = computed(() =>
    this.period() === 'today' ? 'vs yesterday' : 'vs previous period',
  );

  // ---------- sales trend ----------

  /** every bucket in the range, zero-filled where nothing sold */
  series = computed<TrendPoint[]>(() => {
    const d = this.data();
    if (!d) return [];
    const byKey = new Map(d.trend.map((t) => [t.bucket, t]));
    const from = new Date(d.range.from);
    const to = new Date(d.range.to);
    const out: TrendPoint[] = [];

    if (d.range.granularity === 'hour') {
      const cur = new Date(from);
      cur.setMinutes(0, 0, 0);
      while (cur < to) {
        const key = `${ymd(cur)} ${pad(cur.getHours())}`;
        const hit = byKey.get(key);
        out.push({
          key,
          label: `${pad(cur.getHours())}:00`,
          title: `${fmtDay(cur)}, ${pad(cur.getHours())}:00–${pad((cur.getHours() + 1) % 24)}:00`,
          revenue: hit?.revenue ?? 0,
          orders: hit?.orders ?? 0,
        });
        cur.setHours(cur.getHours() + 1);
      }
    } else {
      const cur = new Date(from);
      cur.setHours(0, 0, 0, 0);
      const short = this.period() === '7d';
      while (cur < to) {
        const key = ymd(cur);
        const hit = byKey.get(key);
        out.push({
          key,
          label: short
            ? cur.toLocaleDateString('en-US', { weekday: 'short' })
            : cur.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          title: cur.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
          revenue: hit?.revenue ?? 0,
          orders: hit?.orders ?? 0,
        });
        cur.setDate(cur.getDate() + 1);
      }
    }
    return out;
  });

  periodTotal = computed(() => this.series().reduce((s, p) => s + p.revenue, 0));
  hasSales = computed(() => this.series().some((p) => p.revenue > 0));

  /** clean y-axis: 0 + four round steps covering the tallest bar */
  yTicks = computed<number[]>(() => {
    const max = Math.max(0, ...this.series().map((p) => p.revenue));
    const step = niceStep(max / 4);
    return [0, step, step * 2, step * 3, step * 4];
  });

  yMax = computed(() => this.yTicks()[this.yTicks().length - 1] || 1);

  barHeight(p: TrendPoint): number {
    return (p.revenue / this.yMax()) * 100;
  }

  /** thin out axis labels so they never collide (≤ 8 on screen) */
  showLabel(i: number): boolean {
    const n = this.series().length;
    const every = Math.max(1, Math.ceil(n / 8));
    return i % every === 0;
  }

  hovered = computed(() => {
    const i = this.hoverIndex();
    return i === null ? null : this.series()[i] ?? null;
  });

  /** horizontal position of the tooltip, centred on the hovered column and
   *  clamped so the edge columns don't push it out of the card */
  tooltipLeft = computed(() => {
    const i = this.hoverIndex();
    const n = this.series().length;
    if (i === null || !n) return 0;
    return Math.min(88, Math.max(12, ((i + 0.5) / n) * 100));
  });

  // ---------- payment mix ----------

  mix = computed(() => {
    const m = this.data()?.payment_mix ?? { cash: 0, online: 0 };
    const total = m.cash + m.online;
    return {
      cash: m.cash,
      online: m.online,
      total,
      cashPct: total ? (m.cash / total) * 100 : 0,
      onlinePct: total ? (m.online / total) * 100 : 0,
    };
  });

  // ---------- top products ----------

  topProducts = computed(() => {
    const list = this.data()?.top_products ?? [];
    const max = Math.max(0, ...list.map((p) => p.revenue));
    return list.map((p) => ({ ...p, pct: max ? (p.revenue / max) * 100 : 0 }));
  });

  // ---------- formatting for the template ----------

  compact = compact;
  money = money;

  // ---------- helpers ----------

  /** local-midnight-based windows, ending now */
  private rangeFor(p: Period): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date(to);
    from.setHours(0, 0, 0, 0);
    const back = { today: 0, '7d': 6, '30d': 29, '90d': 89 }[p];
    from.setDate(from.getDate() - back);
    return { from, to };
  }
}

// ---------- pure helpers ----------

/** null when there is no previous figure to compare with */
function percentChange(c: Compared): number | null {
  if (!c.previous) return c.value ? null : 0;
  return Math.round(((c.value - c.previous) / c.previous) * 1000) / 10;
}

/** 1,284 · 12.9K · 988K · 1.64M */
function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${trimZeros((n / 1e6).toFixed(abs >= 1e7 ? 1 : 2))}M`;
  if (abs >= 1e4) return `${trimZeros((n / 1e3).toFixed(abs >= 1e5 ? 0 : 1))}K`;
  return Math.round(n).toLocaleString('en-US');
}

function money(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

/** 1 / 2 / 2.5 / 5 × 10ⁿ at or above `raw` */
function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const f of [1, 2, 2.5, 5, 10]) {
    if (f * mag >= raw) return f * mag;
  }
  return 10 * mag;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** local yyyy-MM-dd — must match the API's $dateToString in the same tz */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
