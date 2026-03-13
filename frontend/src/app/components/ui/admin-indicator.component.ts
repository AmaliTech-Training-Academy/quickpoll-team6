import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeMicrosoftAdmin } from '@ng-icons/huge-icons';
import { map } from 'rxjs';

import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { AuthService } from '@/services/auth.service';

@Component({
  selector: 'app-admin-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, NgIcon, AsyncPipe],
  providers: [provideIcons({ hugeMicrosoftAdmin })],
  template: `
    @if (userIsAdmin$ | async) {
      <button
        title="Admin User"
        app-button
        variant="secondary"
        size="sm"
        type="button"
        class="font-normal! rounded-full! text-xs! aspect-square! size-8! min-h-8! p-0! ml-1 border! border-primary!"
      >
        <ng-icon name="hugeMicrosoftAdmin" />
      </button>
    }
  `,
})
export class AdminIndicatorComponent {
  private readonly authService = inject(AuthService);

  protected readonly userIsAdmin$ = this.authService
    .getProfile()
    .pipe(map((user) => user.role.toLowerCase() === 'admin'));
}
