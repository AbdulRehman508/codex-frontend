import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from './api.service';

/** The envelope every endpoint answers in. */
interface ApiSuccess<T> {
  success: boolean;
  message: string;
  data: T;
}

/** One line on the bell. */
export interface AppNotification {
  id: string;
  /** e.g. 'stock-request.created' — picks the icon */
  type: string;
  /** i18n key, rendered with `params` */
  title_key: string;
  params: Record<string, string>;
  /** the route clicking it opens */
  link: string;
  link_params: Record<string, string>;
  ref_id: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationFeed {
  data: AppNotification[];
  unread: number;
}

/**
 * The bell's API client. Like every other client here it goes through
 * `ApiService`; the live half of the bell is the SSE stream, which is the one
 * documented exception and lives in `RealtimeService`.
 */
@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private api = inject(ApiService);
  private endpoint = 'notifications';

  list(officeId: string, limit = 20): Observable<NotificationFeed> {
    return this.api
      .getAll<ApiSuccess<NotificationFeed>>(this.endpoint, {
        office_id: officeId,
        limit,
      })
      .pipe(map((res) => res.data));
  }

  unreadCount(officeId: string): Observable<number> {
    return this.api
      .getAll<ApiSuccess<{ unread: number }>>(`${this.endpoint}/count`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data.unread));
  }

  markRead(id: string, officeId: string): Observable<number> {
    return this.api
      .patchTo<ApiSuccess<{ unread: number }>>(`${this.endpoint}/${id}/read`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data.unread));
  }

  markAllRead(officeId: string): Observable<number> {
    return this.api
      .patchTo<ApiSuccess<{ unread: number }>>(`${this.endpoint}/read-all`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data.unread));
  }
}
