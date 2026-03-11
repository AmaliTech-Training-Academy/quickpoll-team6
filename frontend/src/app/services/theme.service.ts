import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'quickpoll-theme';
  private readonly destroyRef = inject(DestroyRef);

  private readonly mediaQuery =
    typeof window !== 'undefined' && 'matchMedia' in window
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

  private readonly preferenceSignal = signal<ThemePreference>(this.getInitialPreference());
  private readonly systemThemeSignal = signal<ResolvedTheme>(this.getSystemTheme());

  readonly preference = this.preferenceSignal.asReadonly();
  readonly resolvedTheme = computed<ResolvedTheme>(() => {
    const preference = this.preferenceSignal();
    return preference === 'system' ? this.systemThemeSignal() : preference;
  });
  readonly isDark = computed(() => this.resolvedTheme() === 'dark');

  constructor() {
    this.applyTheme(this.resolvedTheme());
    this.listenToSystemThemeChanges();
  }

  setTheme(preference: ThemePreference): void {
    this.preferenceSignal.set(preference);
    this.persistPreference(preference);
    this.applyTheme(this.resolvedTheme());
  }

  toggleTheme(): void {
    const nextTheme: ThemePreference = this.resolvedTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  private getInitialPreference(): ThemePreference {
    if (typeof localStorage === 'undefined') {
      return 'system';
    }

    const storedPreference = localStorage.getItem(this.storageKey);

    if (
      storedPreference === 'light' ||
      storedPreference === 'dark' ||
      storedPreference === 'system'
    ) {
      return storedPreference;
    }

    return 'system';
  }

  private getSystemTheme(): ResolvedTheme {
    return this.mediaQuery?.matches ? 'dark' : 'light';
  }

  private persistPreference(preference: ThemePreference): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, preference);
  }

  private applyTheme(theme: ResolvedTheme): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }

  private listenToSystemThemeChanges(): void {
    if (!this.mediaQuery) {
      return;
    }

    const onChange = (event: MediaQueryListEvent): void => {
      this.systemThemeSignal.set(event.matches ? 'dark' : 'light');

      if (this.preferenceSignal() === 'system') {
        this.applyTheme(this.systemThemeSignal());
      }
    };

    this.mediaQuery.addEventListener('change', onChange);

    this.destroyRef.onDestroy(() => {
      this.mediaQuery?.removeEventListener('change', onChange);
    });
  }
}
