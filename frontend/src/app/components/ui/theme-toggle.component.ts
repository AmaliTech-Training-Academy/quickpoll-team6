import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeComputer, hugeMoon02, hugeSun02 } from '@ng-icons/huge-icons';
import { ThemePreference, ThemeService } from '@/services/theme.service';
import { ButtonComponent } from '@/components/ui/primitives/button.component';

@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, NgIcon],
  providers: [provideIcons({ hugeSun02, hugeMoon02, hugeComputer })],
  template: `
    <div
      class="inline-flex items-center rounded-full border border-border bg-surface p-px"
      data-test-id="theme-toggle-group"
    >
      <button
        app-button
        variant="ghost"
        size="sm"
        class="rounded-full! px-2.5!"
        aria-label="Use light theme"
        data-test-id="theme-toggle-light-button"
        [attr.aria-pressed]="themePreference() === 'light'"
        (click)="setTheme('light')"
      >
        <ng-icon name="hugeSun02" />
      </button>

      <button
        app-button
        variant="ghost"
        size="sm"
        class="rounded-full! px-2.5!"
        aria-label="Use dark theme"
        data-test-id="theme-toggle-dark-button"
        [attr.aria-pressed]="themePreference() === 'dark'"
        (click)="setTheme('dark')"
      >
        <ng-icon name="hugeMoon02" />
      </button>

      <button
        app-button
        variant="ghost"
        size="sm"
        class="rounded-full! px-2.5!"
        aria-label="Use system theme"
        data-test-id="theme-toggle-system-button"
        [attr.aria-pressed]="themePreference() === 'system'"
        (click)="setTheme('system')"
      >
        <ng-icon name="hugeComputer" />
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
