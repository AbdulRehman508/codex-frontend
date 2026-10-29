import { Pipe, PipeTransform, inject } from '@angular/core';

import { TranslationService } from './translation.service';

/**
 * `{{ 'nav.sales' | t }}`
 *
 * Impure on purpose: the language is a signal, and reading it inside
 * `transform` is what ties a view to it. A pure pipe would cache the English
 * string and never run again when the language changes.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private i18n = inject(TranslationService);

  transform(key: string, params?: Record<string, string | number>): string {
    // reading the signal here registers this view as a dependency
    this.i18n.lang();
    return this.i18n.t(key, params);
  }
}
