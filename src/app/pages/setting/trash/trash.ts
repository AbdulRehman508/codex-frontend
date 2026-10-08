import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ConfirmService } from '../../../core/services/confirm.service';
import { OfficeContextService } from '../../../core/services/office-context.service';
import { TrashApiService } from './trash.api';
import { TrashModule as TrashKind, TrashRow } from './trash.model';

@Component({
  selector: 'app-trash',
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './trash.html',
  styleUrl: './trash.scss',
})
export class Trash {
  private api = inject(TrashApiService);
  private ctx = inject(OfficeContextService);
  private confirm = inject(ConfirmService);
  private toast = inject(MessageService);
  private search$ = new Subject<string>();

  constructor() {
    // office-scoped like every other list; skip the first run
    let first = true;
    effect(() => {
      this.ctx.selectedOfficeId();
      untracked(() => {
        if (first) {
          first = false;
          return;
        }
        this.page.set(1);
        this.getTrash();
      });
    });
  }

  rows = signal<TrashRow[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(25);
  loading = signal(false);
  busyId = signal<string | null>(null);

  searchTerm = '';
  moduleFilter: TrashKind | null = null;

  moduleList: { label: string; value: TrashKind }[] = [
    { label: 'Products', value: 'products' },
    { label: 'Customers', value: 'customer' },
    { label: 'Suppliers', value: 'supplier' },
    { label: 'Staff', value: 'staff' },
    { label: 'Offices', value: 'office' },
    { label: 'Racks', value: 'location' },
  ];

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));

  ngOnInit() {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.searchTerm = term;
        this.page.set(1);
        this.getTrash();
      });
    this.getTrash();
  }

  getTrash() {
    this.loading.set(true);
    this.api
      .listTrash({
        page: this.page(),
        limit: this.limit(),
        search: this.searchTerm,
        module: this.moduleFilter ?? undefined,
        office_id: this.ctx.selectedOfficeId() ?? undefined,
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
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load the trash' });
        },
      });
  }

  filterRecord() {
    this.search$.next(this.searchTerm);
  }

  onFilterChange() {
    this.page.set(1);
    this.getTrash();
  }

  clearFilters() {
    this.searchTerm = '';
    this.moduleFilter = null;
    this.page.set(1);
    this.getTrash();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.getTrash();
  }

  async restore(row: TrashRow) {
    const ok = await this.confirm.confirm({
      header: 'Restore',
      message: `Put "${row.label}" back into ${row.module_label.toLowerCase()}s?`,
      acceptLabel: 'Restore',
    });
    if (!ok) return;
    this.busyId.set(row.id);
    this.api.restore(row.module, row.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.add({ severity: 'success', summary: 'Restored', detail: `"${row.label}" is back` });
        this.getTrash();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.add({
          severity: 'error',
          summary: 'Cannot restore',
          // refused when a live record already holds its unique value
          detail: err?.error?.message ?? 'Restore failed',
        });
      },
    });
  }

  async purge(row: TrashRow) {
    const ok = await this.confirm.confirm({
      header: 'Delete for good',
      message: `Permanently delete "${row.label}"? This cannot be undone.`,
      acceptLabel: 'Delete for good',
      danger: true,
    });
    if (!ok) return;
    this.busyId.set(row.id);
    this.api.purge(row.module, row.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: `"${row.label}" is gone for good` });
        if (this.rows().length === 1 && this.page() > 1) {
          this.page.update((p) => p - 1);
        }
        this.getTrash();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Delete failed' });
      },
    });
  }
}
