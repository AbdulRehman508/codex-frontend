import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { TokenService } from '../../core/services/token.service';

@Component({
  selector: 'app-not-found',
  imports: [RouterModule],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  private location = inject(Location);
  private router = inject(Router);
  private token = inject(TokenService);

  /** signed-out visitors belong on the login screen, not the dashboard */
  readonly homeLink = this.token.getToken() ? '/dashboard' : '/login';

  back() {
    // history may be empty when the bad URL was opened directly
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigateByUrl(this.homeLink);
  }
}
