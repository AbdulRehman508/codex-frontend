import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import { ApiSuccess, Profile, UpdateProfileDto } from './profile.model';

/**
 * Current-user profile API. Delegates HTTP to the generic ApiService and
 * unwraps the response envelope. Auth header added globally by authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private api = inject(ApiService);
  private endpoint = 'profile';

  getProfile(): Observable<Profile> {
    return this.api.getAll<ApiSuccess<Profile>>(this.endpoint).pipe(map((res) => res.data));
  }

  updateProfile(body: UpdateProfileDto): Observable<Profile> {
    return this.api.put<ApiSuccess<Profile>>(this.endpoint, body).pipe(map((res) => res.data));
  }
}
