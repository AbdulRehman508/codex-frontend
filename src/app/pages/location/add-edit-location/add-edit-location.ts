import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { MessageService } from 'primeng/api';

import { commonIcons } from '../../../core/icon-images/common-icon';
import { OfficeContextService } from '../../../core/services/office-context.service';
import { LocationApiService } from '../location.api';
import {
  buildLocationCode,
  CreateRackDto,
  MAX_GENERATED_LOCATIONS,
  RackStatus,
} from '../location.model';

/** One row of the generated-locations preview. */
interface PreviewRow {
  row_no: number;
  column_no: number;
  bin_no: number;
  location_code: string;
}

@Component({
  selector: 'app-add-edit-location',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, NgSelectModule],
  templateUrl: './add-edit-location.html',
  styleUrl: './add-edit-location.scss',
})
export class AddEditLocation {
  private _router = inject(Router);
  private _activeRoute = inject(ActivatedRoute);
  private _formBuilder = inject(FormBuilder);
  private api = inject(LocationApiService);
  private ctx = inject(OfficeContextService);
  private toast = inject(MessageService);

  commonIcon = commonIcons;
  locationForm: FormGroup = new FormGroup({});
  submitted = false;
  saving = signal(false);
  pageTitle = 'Add Location';
  locationId: string | null = null;
  statusList: RackStatus[] = ['active', 'inactive'];

  readonly maxLocations = MAX_GENERATED_LOCATIONS;
  /** how many generated codes the preview lists before collapsing */
  readonly previewLimit = 24;

  // server-side field errors: { field: ['msg', ...] }
  serverErrors = signal<Record<string, string[]>>({});

  // live grid values, kept in a signal so the preview recomputes on every edit
  private grid = signal({ code: '', rows: 0, columns: 0, bins: 0 });

  /** rows x columns x bins */
  totalLocations = computed(() => {
    const g = this.grid();
    if (g.rows < 1 || g.columns < 1 || g.bins < 1) return 0;
    return g.rows * g.columns * g.bins;
  });

  tooManyLocations = computed(() => this.totalLocations() > this.maxLocations);

  /** first `previewLimit` codes the API would generate for the current grid */
  previewRows = computed<PreviewRow[]>(() => {
    const g = this.grid();
    if (!g.code || this.totalLocations() < 1 || this.tooManyLocations()) return [];
    const out: PreviewRow[] = [];
    for (let r = 1; r <= g.rows; r++) {
      for (let c = 1; c <= g.columns; c++) {
        for (let b = 1; b <= g.bins; b++) {
          if (out.length >= this.previewLimit) return out;
          out.push({
            row_no: r,
            column_no: c,
            bin_no: b,
            location_code: buildLocationCode(g.code, r, c, b),
          });
        }
      }
    }
    return out;
  });

  hiddenPreviewCount = computed(() =>
    Math.max(0, this.totalLocations() - this.previewRows().length),
  );

  ngOnInit() {
    this.locationForm = this._formBuilder.group({
      name: ['', Validators.required],
      code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
      description: [''],
      status: ['active'],
      rows_count: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      columns_count: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      bins_count: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
    });

    this.syncGrid();
    this.locationForm.valueChanges.subscribe(() => this.syncGrid());

    this._activeRoute.params.subscribe((params) => {
      this.locationId = params['id'] ?? null;
      this.pageTitle = this.locationId ? 'Edit Location' : 'Add Location';
      if (this.locationId) {
        this.loadLocation(this.locationId);
      }
    });
  }

  private syncGrid() {
    const v = this.locationForm.value;
    this.grid.set({
      code: (v.code ?? '').toString().trim().toUpperCase(),
      rows: Number(v.rows_count) || 0,
      columns: Number(v.columns_count) || 0,
      bins: Number(v.bins_count) || 0,
    });
  }

  private loadLocation(id: string) {
    this.api.getLocation(id, this.ctx.selectedOfficeId() ?? undefined).subscribe({
      next: (rack) => {
        this.locationForm.patchValue({
          name: rack.name,
          code: rack.code,
          description: rack.description ?? '',
          status: rack.status,
          rows_count: rack.rows_count,
          columns_count: rack.columns_count,
          bins_count: rack.bins_count,
        });
        this.syncGrid();
      },
      error: (err) =>
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to load location' }),
    });
  }

  /** server error for a control, if any */
  fieldError(name: string): string | null {
    const errs = this.serverErrors()[name];
    return errs?.length ? errs[0] : null;
  }

  saveLocation() {
    this.submitted = true;
    this.serverErrors.set({});

    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.toast.add({ severity: 'warn', summary: 'No office', detail: 'Select an office in the header first' });
      return;
    }
    if (this.locationForm.invalid || this.tooManyLocations()) return;

    const v = this.locationForm.value;
    const body: CreateRackDto = {
      office_id: officeId,
      name: v.name,
      code: (v.code ?? '').toString().trim().toUpperCase(),
      description: v.description || undefined,
      status: v.status,
      rows_count: Number(v.rows_count),
      columns_count: Number(v.columns_count),
      bins_count: Number(v.bins_count),
    };

    this.saving.set(true);
    const req$ = this.locationId
      ? this.api.updateLocation(this.locationId, body)
      : this.api.createLocation(body);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `Location ${this.locationId ? 'updated' : 'created'}` });
        this._router.navigateByUrl('/location');
      },
      error: (err) => {
        this.saving.set(false);
        const e = err?.error;
        if (e?.errors) this.serverErrors.set(e.errors);
        this.toast.add({ severity: 'error', summary: 'Error', detail: e?.message ?? 'Save failed' });
      },
    });
  }

  closeLocation() {
    this._router.navigateByUrl('/location');
  }
}
