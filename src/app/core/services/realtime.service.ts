import { DestroyRef, Injectable, OnDestroy, inject, signal } from '@angular/core';

import { environment } from '../../environments/environment';
import { OfficeContextService } from './office-context.service';

/** What the server says happened, as the client sees it. */
export interface RealtimeEvent {
  /** e.g. 'stock-request.approved' */
  type: string;
  payload: Record<string, unknown>;
  at: string;
}

/**
 * The open line to the API for the branch currently selected in the header.
 *
 * This is the one place in the app that talks to the server without going
 * through `ApiService`, and it has to be: an event stream is `EventSource`,
 * not `HttpClient`. It carries the session cookie (`withCredentials`), which
 * is also why it can authenticate at all — EventSource cannot set headers.
 *
 * Screens subscribe to a type and re-read from the API when it fires. The
 * payload is only a nudge, never the data itself, so a dropped event costs a
 * stale list until the next one rather than a wrong figure on screen.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private ctx = inject(OfficeContextService);

  private source: EventSource | null = null;
  private officeId: string | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Map<string, Set<(event: RealtimeEvent) => void>>();

  /** last event seen, for anything that would rather read than subscribe */
  readonly lastEvent = signal<RealtimeEvent | null>(null);
  readonly connected = signal(false);

  /**
   * Listen for one kind of event. Returns the unsubscribe function; a screen
   * calls it on destroy, or passes a DestroyRef to `onWithCleanup`.
   */
  on(type: string, handler: (event: RealtimeEvent) => void): () => void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(handler);
    this.listeners.set(type, set);
    this.ensureConnected();
    return () => {
      set.delete(handler);
      if (!set.size) this.listeners.delete(type);
    };
  }

  /** Same, but torn down with the component that asked for it. */
  onWithCleanup(
    type: string,
    handler: (event: RealtimeEvent) => void,
    destroyRef: DestroyRef,
  ) {
    const off = this.on(type, handler);
    destroyRef.onDestroy(off);
  }

  /** Point the stream at the office in the header; called on every change. */
  ensureConnected() {
    const officeId = this.ctx.selectedOfficeId();
    if (!officeId) {
      this.disconnect();
      return;
    }
    if (this.source && this.officeId === officeId) return;

    this.disconnect();
    this.officeId = officeId;

    const url = `${environment.nestApiUrl}/events?office_id=${encodeURIComponent(officeId)}`;
    const source = new EventSource(url, { withCredentials: true });
    this.source = source;

    source.onopen = () => this.connected.set(true);
    source.onmessage = (message) => this.dispatch(message.data);
    source.onerror = () => {
      // EventSource retries on its own, but only while the connection is
      // recoverable; a closed one needs a fresh object
      this.connected.set(false);
      if (source.readyState === EventSource.CLOSED) {
        this.scheduleReconnect();
      }
    };
  }

  private dispatch(raw: string) {
    let event: RealtimeEvent;
    try {
      event = JSON.parse(raw) as RealtimeEvent;
    } catch {
      return;
    }
    if (!event?.type || event.type === 'ping') return;

    this.lastEvent.set(event);
    for (const handler of this.listeners.get(event.type) ?? []) {
      handler(event);
    }
    // '*' hears everything, for a badge that counts anything new
    for (const handler of this.listeners.get('*') ?? []) {
      handler(event);
    }
  }

  private scheduleReconnect() {
    if (this.retry) return;
    this.retry = setTimeout(() => {
      this.retry = null;
      this.officeId = null;
      this.ensureConnected();
    }, 5000);
  }

  private disconnect() {
    this.source?.close();
    this.source = null;
    this.officeId = null;
    this.connected.set(false);
  }

  ngOnDestroy() {
    if (this.retry) clearTimeout(this.retry);
    this.disconnect();
  }
}
