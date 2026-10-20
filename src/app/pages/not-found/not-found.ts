import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { TokenService } from '../../core/services/token.service';

@Component({
  selector: 'app-not-found',
  imports: [RouterModule, TranslatePipe],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  private location = inject(Location);
  private router = inject(Router);
  private token = inject(TokenService);

  /** signed-out visitors belong on the login screen, not the dashboard */
  readonly homeLink = this.token.isSignedIn() ? '/dashboard' : '/login';

  back() {
    // history may be empty when the bad URL was opened directly
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigateByUrl(this.homeLink);
  }
}
