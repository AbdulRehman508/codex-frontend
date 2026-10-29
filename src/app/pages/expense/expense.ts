import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { environment } from '../../environments/environment';
import { TranslationService } from '../../core/i18n/translation.service';
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ConfirmService } from '../../core/services/confirm.service';
import { OfficeContextService } from '../../core/services/office-context.service';
import { PermissionService } from '../../core/services/permission.service';
import { ExpenseApiService } from './expense.api';
import {
  CreateRecurringDto,
  ExpensePaymentMethod,
  ExpenseRow,
  ExpenseSummary,
  RecurringExpense,
  RecurringFrequency,
} from './expense.model';

interface ExpenseStat {
  label: string;
  value: string;
  icon: string;
  tone: 'primary' | 'green' | 'danger' | 'info';
}

@Component({
  selector: 'app-expense',
  imports: [
    CommonModule,
    FormsModule,
    NgSelectModule,
    DatePickerModule,
    TranslatePipe,
  ],
  templateUrl: './expense.html',
  styleUrl: './expense.scss',
})
export class ExpenseList {
  private api = inject(ExpenseApiService);
  private i18n = inject(TranslationService);
  private ctx = inject(OfficeContextService);
  private confirm = inject(ConfirmService);
  private toast = inject(MessageService);
  perm = inject(PermissionService);

  private search$ = new Subject<string>();

  readonly module = 'expenses';

  constructor() {
    // follow the branch picked in the header
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      untracked(() => {
        if (first) {
          first = false;
          return;
        }
        this.page.set(1);
        this.closeDialog();
        this.loadCategories();
        this.load();
      });
    });
  }

  rows = signal<ExpenseRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(10);
  loading = signal(false);
  summary = signal<ExpenseSummary | null>(null);
  categories = signal<string[]>([]);

  // filters
  searchTerm = '';
  categoryFilter: string | null = null;
  methodFilter: ExpensePaymentMethod | null = null;
  dateRange: Date[] | null = null;
  readonly today = new Date();
  private dateFrom = '';
  private dateTo = '';

  methodList = computed(() => [
    { label: this.i18n.t('common.cash'), value: 'cash' },
    { label: this.i18n.t('common.online'), value: 'online' },
  ]);

  hasOffice = computed(() => !!this.ctx.selectedOfficeId());
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));

  stats = computed<ExpenseStat[]>(() => {
    const s = this.summary();
    return [
      {
        label: this.i18n.t('expense.spent'),
        value: this.money(s?.total ?? 0),
        icon: 'pi pi-wallet',
        tone: 'danger',
      },
      {
        label: this.i18n.t('expense.inCash'),
        value: this.money(s?.cash ?? 0),
        icon: 'pi pi-money-bill',
        tone: 'info',
      },
      {
        label: this.i18n.t('expense.online'),
        value: this.money(s?.online ?? 0),
        icon: 'pi pi-credit-card',
        tone: 'green',
      },
      {
        label: this.i18n.t('expense.entries'),
        value: String(s?.entries ?? 0),
        icon: 'pi pi-list',
        tone: 'primary',
      },
    ];
  });

  /** biggest spends first — where the money actually goes */
  topCategories = computed(() => (this.summary()?.by_category ?? []).slice(0, 6));

  ngOnInit() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchTerm = term;
        this.page.set(1);
        this.load();
      });
    this.loadCategories();
    this.load();
  }

  private loadCategories() {
    this.api.categories(this.ctx.selectedOfficeId() ?? undefined).subscribe({
      next: (list) => this.categories.set(list),
      error: () => this.categories.set([]),
    });
  }

  load() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.rows.set([]);
      this.total.set(0);
      this.summary.set(null);
      return;
    }
    this.loading.set(true);
    this.api
      .list({
        office_id: officeId,
        category: this.categoryFilter ?? undefined,
        payment_method: this.methodFilter ?? undefined,
        search: this.searchTerm || undefined,
        date_from: this.dateFrom || undefined,
        date_to: this.dateTo || undefined,
        page: this.page(),
        limit: this.limit(),
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data);
          this.total.set(res.total);
          this.summary.set(res.summary);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message ?? 'Failed to load expenses',
          });
        },
      });
  }

  onSearch(term: string) {
    this.search$.next(term ?? '');
  }

  onFilterChange() {
    this.page.set(1);
    this.load();
  }

  onDateRangeChange() {
    const [from, to] = this.dateRange ?? [];
    this.dateFrom = from ? startOfDay(from).toISOString() : '';
    // a range picked as one day still means the whole of that day
    this.dateTo = to ? endOfDay(to).toISOString() : from ? endOfDay(from).toISOString() : '';
    this.page.set(1);
    this.load();
  }

  reset() {
    this.searchTerm = '';
    this.categoryFilter = null;
    this.methodFilter = null;
    this.dateRange = null;
    this.dateFrom = '';
    this.dateTo = '';
    this.page.set(1);
    this.load();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.load();
  }

  // ---------- the dialog ----------

  dialogOpen = signal(false);
  saving = signal(false);
  editingId = signal<string | null>(null);
  serverErrors = signal<Record<string, string[]>>({});

  form = {
    category: '' as string | null,
    amount: null as number | null,
    payment_method: 'cash' as ExpensePaymentMethod,
    spent_at: new Date() as Date | null,
    paid_to: '',
    note: '',
  };

  /** the bill, as a data URL while it is being added, a path once stored */
  receipt = signal<string | null>(null);
  /** set only when the photo changed, so an untouched one is not re-uploaded */
  private receiptChanged = false;

  openDialog(row?: ExpenseRow) {
    this.serverErrors.set({});
    this.receipt.set(row?.receipt ?? null);
    this.receiptChanged = false;
    if (row) {
      this.editingId.set(row.id);
      this.form = {
        category: row.category,
        amount: row.amount,
        payment_method: row.payment_method,
        spent_at: row.spent_at ? new Date(row.spent_at) : new Date(),
        paid_to: row.paid_to ?? '',
        note: row.note ?? '',
      };
    } else {
      this.editingId.set(null);
      this.form = {
        category: null,
        amount: null,
        payment_method: 'cash',
        spent_at: new Date(),
        paid_to: '',
        note: '',
      };
    }
    this.dialogOpen.set(true);
  }

  closeDialog() {
    this.dialogOpen.set(false);
    this.saving.set(false);
  }

  /** a shop types its own wording; it joins the list from then on */
  addCategory = (term: string) => term.trim();

  submit() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) return;
    const category = (this.form.category ?? '').trim();
    const amount = Number(this.form.amount);

    if (!category) {
      this.toast.add({
        severity: 'warn',
        summary: this.i18n.t('expense.categoryNeeded'),
        detail: this.i18n.t('expense.categoryHint'),
      });
      return;
    }
    if (!amount || amount <= 0) {
      this.toast.add({
        severity: 'warn',
        summary: this.i18n.t('expense.amountNeeded'),
        detail: this.i18n.t('expense.amountHint'),
      });
      return;
    }

    const body = {
      office_id: officeId,
      category,
      amount,
      payment_method: this.form.payment_method,
      spent_at: (this.form.spent_at ?? new Date()).toISOString(),
      paid_to: this.form.paid_to.trim(),
      note: this.form.note.trim(),
      // '' clears a stored photo; leaving it out keeps what is there
      ...(this.receiptChanged ? { receipt: this.receipt() ?? '' } : {}),
    };

    this.saving.set(true);
    this.serverErrors.set({});
    const id = this.editingId();
    const call = id ? this.api.update(id, body) : this.api.create(body);

    call.subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: this.i18n.t(id ? 'expense.updated' : 'expense.recorded'),
          detail: `${category} · ${this.money(amount)}`,
        });
        this.closeDialog();
        this.loadCategories();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.serverErrors.set(err?.error?.errors ?? {});
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Could not save the expense',
        });
      },
    });
  }

  async remove(row: ExpenseRow) {
    const yes = await this.confirm.delete(
      `${row.category} (${this.money(row.amount)})`,
    );
    if (!yes) return;
    this.api.remove(row.id).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: this.i18n.t('expense.deleted'),
          detail: row.expense_no,
        });
        this.load();
      },
      error: (err) =>
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Could not delete the expense',
        }),
    });
  }

  fieldError(field: string): string | null {
    return this.serverErrors()[field]?.[0] ?? null;
  }

  money(value: number): string {
    return (value ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /** share of the period's spend, for the bar behind each category */
  share(amount: number): number {
    const total = this.summary()?.total ?? 0;
    return total ? Math.round((amount / total) * 100) : 0;
  }

  // ---------- the photographed bill ----------

  onPickReceipt(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      this.toast.add({
        severity: 'warn',
        summary: this.i18n.t('expense.receiptKind'),
        detail: this.i18n.t('expense.receiptKindHint'),
      });
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toast.add({
        severity: 'warn',
        summary: this.i18n.t('expense.receiptBig'),
        detail: this.i18n.t('expense.receiptBigHint'),
      });
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.receipt.set(String(reader.result));
      this.receiptChanged = true;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearReceipt() {
    this.receipt.set(null);
    this.receiptChanged = true;
  }

  /** a stored path needs the API host in front of it; a data URL does not */
  receiptSrc(value: string | null): string {
    if (!value) return '';
    if (value.startsWith('data:') || value.startsWith('http')) return value;
    return `${environment.nestApiUrl.replace(/\/api\/?$/, '')}/${value.replace(/^\//, '')}`;
  }

  openReceipt(value: string | null) {
    const src = this.receiptSrc(value);
    if (src) window.open(src, '_blank', 'noopener');
  }

  // ---------- bills that come round again ----------

  recurringOpen = signal(false);
  recurring = signal<RecurringExpense[]>([]);
  recurringSaving = signal(false);
  recurringEditingId = signal<string | null>(null);

  recurringForm = {
    category: null as string | null,
    amount: null as number | null,
    payment_method: 'cash' as ExpensePaymentMethod,
    paid_to: '',
    note: '',
    frequency: 'monthly' as RecurringFrequency,
    day: 1,
  };

  readonly weekdays = [
    'expense.sunday',
    'expense.monday',
    'expense.tuesday',
    'expense.wednesday',
    'expense.thursday',
    'expense.friday',
    'expense.saturday',
  ];

  frequencyList = computed(() => [
    { label: this.i18n.t('expense.monthly'), value: 'monthly' },
    { label: this.i18n.t('expense.weekly'), value: 'weekly' },
  ]);

  /** 1..31 for a monthly bill */
  readonly monthDays = Array.from({ length: 31 }, (_, i) => i + 1);

  openRecurring() {
    this.resetRecurringForm();
    this.recurringOpen.set(true);
    this.loadRecurring();
  }

  closeRecurring() {
    this.recurringOpen.set(false);
    this.recurringSaving.set(false);
  }

  private resetRecurringForm() {
    this.recurringEditingId.set(null);
    this.recurringForm = {
      category: null,
      amount: null,
      payment_method: 'cash',
      paid_to: '',
      note: '',
      frequency: 'monthly',
      day: 1,
    };
  }

  private loadRecurring() {
    this.api.listRecurring(this.ctx.selectedOfficeId() ?? undefined).subscribe({
      next: (rules) => {
        this.recurring.set(rules);
        // the sweep may have written a bill that fell due
        this.load();
      },
      error: () => this.recurring.set([]),
    });
  }

  editRecurring(rule: RecurringExpense) {
    this.recurringEditingId.set(rule.id);
    this.recurringForm = {
      category: rule.category,
      amount: rule.amount,
      payment_method: rule.payment_method,
      paid_to: rule.paid_to ?? '',
      note: rule.note ?? '',
      frequency: rule.frequency,
      day: rule.day,
    };
  }

  saveRecurring() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) return;
    const category = (this.recurringForm.category ?? '').trim();
    const amount = Number(this.recurringForm.amount);
    if (!category || !amount || amount <= 0) {
      this.toast.add({
        severity: 'warn',
        summary: this.i18n.t('expense.ruleIncomplete'),
        detail: this.i18n.t('expense.ruleIncompleteHint'),
      });
      return;
    }

    const body: CreateRecurringDto = {
      office_id: officeId,
      category,
      amount,
      payment_method: this.recurringForm.payment_method,
      paid_to: this.recurringForm.paid_to.trim(),
      note: this.recurringForm.note.trim(),
      frequency: this.recurringForm.frequency,
      day: Number(this.recurringForm.day),
    };

    this.recurringSaving.set(true);
    const id = this.recurringEditingId();
    const call = id
      ? this.api.updateRecurring(id, body)
      : this.api.createRecurring(body);

    call.subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: this.i18n.t('expense.ruleSaved'),
          detail: category,
        });
        this.recurringSaving.set(false);
        this.resetRecurringForm();
        this.loadRecurring();
      },
      error: (err) => {
        this.recurringSaving.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Could not save the standing bill',
        });
      },
    });
  }

  toggleRecurring(rule: RecurringExpense) {
    this.api.updateRecurring(rule.id, { active: !rule.active }).subscribe({
      next: () => this.loadRecurring(),
      error: (err) =>
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Could not change it',
        }),
    });
  }

  async removeRecurring(rule: RecurringExpense) {
    const yes = await this.confirm.confirm({
      message: this.i18n.t('expense.ruleStopHint'),
      header: this.i18n.t('expense.ruleStop'),
      acceptLabel: this.i18n.t('expense.ruleStop'),
      danger: true,
    });
    if (!yes) return;
    this.api.removeRecurring(rule.id).subscribe({
      next: () => this.loadRecurring(),
      error: (err) =>
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'Could not stop it',
        }),
    });
  }

  /** "Monthly on the 1st" / "Weekly on Friday", for the rule list */
  scheduleLabel(rule: RecurringExpense): string {
    if (rule.frequency === 'weekly') {
      return `${this.i18n.t('expense.weekly')} · ${this.i18n.t(this.weekdays[rule.day] ?? '')}`;
    }
    return `${this.i18n.t('expense.monthly')} · ${rule.day}`;
  }

  // ---------- handing the figures on ----------

  /**
   * The rows on screen, as a CSV. The report screen has the full sheet with
   * print; this is the quick one for the page you are already looking at.
   */
  exportCsv() {
    const rows = this.rows();
    if (!rows.length) return;
    const head = [
      this.i18n.t('common.date'),
      this.i18n.t('expense.title'),
      this.i18n.t('expense.category'),
      this.i18n.t('expense.paidTo'),
      this.i18n.t('common.payment'),
      this.i18n.t('common.note'),
      this.i18n.t('expense.amount'),
    ];
    const lines = [
      head.map(csvCell).join(','),
      ...rows.map((r) =>
        [
          r.spent_at ? r.spent_at.slice(0, 10) : '',
          r.expense_no,
          r.category,
          r.paid_to,
          r.payment_method,
          r.note,
          String(r.amount),
        ]
          .map(csvCell)
          .join(','),
      ),
    ];
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`expenses-${stamp}.csv`, lines.join('\r\n'));
  }

  print() {
    window.print();
  }
}

function csvCell(value: string): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, body: string) {
  // the BOM is what makes Excel open Urdu and the rupee sign correctly
  const blob = new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}
