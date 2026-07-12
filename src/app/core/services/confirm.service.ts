import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

export interface ConfirmOptions {
  message: string;
  header?: string;
  icon?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  /** danger styling on the accept button (red). Default true for delete flows. */
  danger?: boolean;
}

/**
 * App-wide confirmation dialog. Wraps PrimeNG's ConfirmationService so callers
 * get a simple `await this.confirm.delete(...)` boolean instead of native
 * window.confirm(). A single <p-confirmdialog> in the root renders these.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private confirmation = inject(ConfirmationService);

  /** Generic confirm. Resolves true on accept, false on cancel/dismiss. */
  confirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmation.confirm({
        header: opts.header ?? 'Please confirm',
        message: opts.message,
        icon: opts.icon ?? 'pi pi-exclamation-triangle',
        acceptLabel: opts.acceptLabel ?? 'Confirm',
        rejectLabel: opts.rejectLabel ?? 'Cancel',
        acceptButtonStyleClass: opts.danger ? 'p-button-danger' : 'p-button-primary',
        rejectButtonStyleClass: 'p-button-text p-button-secondary',
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }

  /** Delete confirmation with red accept button. `target` e.g. 'office "HQ"'. */
  delete(target: string): Promise<boolean> {
    return this.confirm({
      header: 'Delete',
      message: `Are you sure you want to delete ${target}? This action cannot be undone.`,
      icon: 'pi pi-trash',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      danger: true,
    });
  }
}
