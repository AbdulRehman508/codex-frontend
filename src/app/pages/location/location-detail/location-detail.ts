import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';

import { commonIcons } from '../../../core/icon-images/common-icon';
import { OfficeContextService } from '../../../core/services/office-context.service';
import { PermissionService } from '../../../core/services/permission.service';
import { LocationApiService } from '../location.api';
import { RackDetail, RackLocationBin } from '../location.model';

/** Rack -> Row -> Column -> Bin, as rendered by the view screen. */
interface ColumnNode {
  column_no: number;
  bins: RackLocationBin[];
}

interface RowNode {
  row_no: number;
  columns: ColumnNode[];
}

@Component({
  selector: 'app-location-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './location-detail.html',
  styleUrl: './location-detail.scss',
})
export class LocationDetail {
  private _activeRoute = inject(ActivatedRoute);
  private _router = inject(Router);
  private api = inject(LocationApiService);
  private ctx = inject(OfficeContextService);
  private toast = inject(MessageService);
  perm = inject(PermissionService);

  // module this page is gated by (edit button + status toggle)
  readonly module = 'location';

  commonIcon = commonIcons;
  rack = signal<RackDetail | null>(null);
  loading = signal(true);

  occupiedCount = computed(
    () => this.rack()?.locations.filter((l) => l.occupied).length ?? 0,
  );

  /** group the flat bin list into rows -> columns -> bins */
  tree = computed<RowNode[]>(() => {
    const locations = this.rack()?.locations ?? [];
    const rows = new Map<number, Map<number, RackLocationBin[]>>();
    for (const bin of locations) {
      const columns = rows.get(bin.row_no) ?? new Map<number, RackLocationBin[]>();
      const bins = columns.get(bin.column_no) ?? [];
      bins.push(bin);
      columns.set(bin.column_no, bins);
      rows.set(bin.row_no, columns);
    }
    return [...rows.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([row_no, columns]) => ({
        row_no,
        columns: [...columns.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([column_no, bins]) => ({
            column_no,
            bins: bins.sort((x, y) => x.bin_no - y.bin_no),
          })),
      }));
  });

  ngOnInit() {
    const id = this._activeRoute.snapshot.params['id'];
    if (!id) {
      this._router.navigateByUrl('/location');
      return;
    }
    this.api.getLocation(id, this.ctx.selectedOfficeId() ?? undefined).subscribe({
      next: (rack) => {
        this.rack.set(rack);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load location' });
      },
    });
  }

  toggleStatus() {
    if (!this.perm.can(this.module, 'edit')) return;
    const r = this.rack();
    if (!r) return;
    const next = r.status === 'active' ? 'inactive' : 'active';
    this.api.patchLocation(r.id, { status: next }).subscribe({
      next: (updated) => {
        this.rack.set({ ...r, status: updated.status });
        this.toast.add({ severity: 'success', summary: 'Updated', detail: `Status: ${updated.status}` });
      },
      error: (err) => this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Update failed' }),
    });
  }

  back() {
    this._router.navigateByUrl('/location');
  }
}
