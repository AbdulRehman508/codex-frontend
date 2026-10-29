import { Injectable, effect, inject, signal, untracked } from '@angular/core';

import { AppNotification, NotificationApiService } from './notification.api';
import { OfficeContextService } from './office-context.service';
import { RealtimeService } from './realtime.service';

/**
 * What the bell in the header knows.
 *
 * It holds one branch's news: the branch picked in the header. Switching the
 * header's office switches the bell with it, because a notification is
 * addressed to a branch, not to a person — whoever is standing at that counter
 * needs to see that a request is waiting.
 *
 * The live stream only says *that* something happened; the count and the list
 * are re-read from the API, so a dropped event costs a late badge, never a
 * wrong one.
 */
@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private api = inject(NotificationApiService);
  private ctx = inject(OfficeContextService);
  private realtime = inject(RealtimeService);

  readonly items = signal<AppNotification[]>([]);
  readonly unread = signal(0);
  readonly loading = signal(false);
  readonly open = signal(false);

  constructor() {
    // follow the header's office; untracked so writing the list cannot
    // re-trigger the effect that fetched it
    effect(() => {
      const officeId = this.ctx.selectedOfficeId();
      untracked(() => {
        if (!officeId) {
          this.items.set([]);
          this.unread.set(0);
          return;
        }
        this.refresh();
      });
    });

    // the bell's own event, plus the request events themselves: either way
    // the answer is to re-read
    this.realtime.on('notification.created', () => this.refresh());
  }

  /** Re-read the branch's news. */
  refresh() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) return;
    this.loading.set(true);
    this.api.list(officeId).subscribe({
      next: (feed) => {
        this.items.set(feed.data);
        this.unread.set(feed.unread);
        this.loading.set(false);
      },
      error: () => {
        // a bell that cannot load is not worth a toast on every screen
        this.loading.set(false);
      },
    });
  }

  toggle() {
    const next = !this.open();
    this.open.set(next);
    if (next) this.refresh();
  }

  close() {
    this.open.set(false);
  }

  /** Read one line. The count moves at once; the server confirms it. */
  markRead(item: AppNotification) {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId || item.read) return;

    this.items.update((list) =>
      list.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
    );
    this.unread.update((n) => Math.max(0, n - 1));

    this.api.markRead(item.id, officeId).subscribe({
      next: (unread) => this.unread.set(unread),
      error: () => this.refresh(),
    });
  }

  markAllRead() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId || !this.unread()) return;

    this.items.update((list) => list.map((n) => ({ ...n, read: true })));
    this.unread.set(0);

    this.api.markAllRead(officeId).subscribe({
      next: (unread) => this.unread.set(unread),
      error: () => this.refresh(),
    });
  }
}
