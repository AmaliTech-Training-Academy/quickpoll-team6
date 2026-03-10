import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroComputerDesktop, heroMoon, heroSun } from '@ng-icons/heroicons/outline';

import { ThemePreference, ThemeService } from '@/services/theme.service';
import { ButtonComponent } from '@/components/ui/primitives/button.component';

@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, NgIcon],
  providers: [provideIcons({ heroSun, heroMoon, heroComputerDesktop })],
  template: `
    <div class="inline-flex items-center rounded-full border border-border bg-surface p-1">
      <button
        app-button
        variant="ghost"
        size="sm"
        class="rounded-full! px-2.5!"
        aria-label="Use light theme"
        [attr.aria-pressed]="themePreference() === 'light'"
        (click)="setTheme('light')"
      >
        <ng-icon name="heroSun" />
      </button>

      <button
        app-button
        variant="ghost"
        size="sm"
        class="rounded-full! px-2.5!"
        aria-label="Use dark theme"
        [attr.aria-pressed]="themePreference() === 'dark'"
        (click)="setTheme('dark')"
      >
        <ng-icon name="heroMoon" />
      </button>

      <button
        app-button
        variant="ghost"
        size="sm"
        class="rounded-full! px-2.5!"
        aria-label="Use system theme"
        [attr.aria-pressed]="themePreference() === 'system'"
        (click)="setTheme('system')"
      >
        <ng-icon name="heroComputerDesktop" />
      </button>
    </div>
  `,
})
export class ThemeToggleComponent {
  private readonly themeService = inject(ThemeService);

  protected readonly themePreference = this.themeService.preference;

  protected setTheme(theme: ThemePreference): void {
    this.themeService.setTheme(theme);
  }
}
