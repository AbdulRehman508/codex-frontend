import { Injectable, computed, signal } from '@angular/core';

import { DICTIONARIES, EN, LANGUAGES, Lang } from './translations';

const STORAGE_KEY = 'lang';

/**
 * Holds the chosen language and answers `t(key)`. Urdu also flips the page to
 * right-to-left and switches the font, which is what makes it read as Urdu
 * rather than English words in an Urdu script.
 *
 * A key missing from Urdu falls back to English, so a half-translated screen
 * still reads properly instead of showing raw keys.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly _lang = signal<Lang>(this.initial());

  readonly lang = this._lang.asReadonly();
  readonly languages = LANGUAGES;
  readonly dir = computed<'ltr' | 'rtl'>(() => (this._lang() === 'ur' ? 'rtl' : 'ltr'));
  readonly isRtl = computed(() => this.dir() === 'rtl');

  constructor() {
    this.apply(this._lang());
  }

  /**
   * The string for a key in the current language.
   *
   * A string may carry `{name}` placeholders — a notification says which
   * branch and which request number, and those words are not translated.
   * Both languages name the same placeholders, so the sentence can put them
   * wherever its own grammar needs them.
   */
  t(key: string, params?: Record<string, string | number>): string {
    const lang = this._lang();
    const text = DICTIONARIES[lang]?.[key] ?? EN[key] ?? key;
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      params[name] === undefined || params[name] === null
        ? match
        : String(params[name]),
    );
  }

  use(lang: Lang) {
    if (lang === this._lang()) return;
    this._lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // a private window with storage blocked still switches for this session
    }
    this.apply(lang);
  }

  private initial(): Lang {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ur') return saved;
    } catch {
      // fall through to the default
    }
    return 'en';
  }

  /**
   * Direction and language belong on the document, not on a component: the
   * date picker, the dropdowns and the toast all render outside the app's own
   * DOM and read them from there.
   */
  private apply(lang: Lang) {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ur' ? 'rtl' : 'ltr');
    // a class, so stylesheets can target the Urdu face without guessing
    html.classList.toggle('lang-ur', lang === 'ur');
  }
}
