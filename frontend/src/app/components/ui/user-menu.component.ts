import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '@/services/auth.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { UserAvatarComponent } from '@/components/ui/user-avatar.component';

@Component({
  selector: 'app-user-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, RouterLink, AsyncPipe, UserAvatarComponent],
  template: `
    <div class="flex items-center gap-2" data-test-id="user-menu">
      @if (user | async; as currentUser) {
        <div class="hidden md:flex flex-col items-end" data-test-id="user-menu-user-details">
          <p class="text-xs font-medium" data-test-id="user-menu-user-name">
            {{ currentUser.name }}
          </p>
          <p class="text-xs text-muted-foreground" data-test-id="user-menu-user-email">
            {{ currentUser.email }}
          </p>
        </div>
        <button
          app-button
          variant="outline"
          routerLink="/~/account"
          class="w-fit! size-9! px-0! rounded-full! shrink-0"
          data-test-id="user-menu-account-button"
        >
          <app-user-avatar
            class="inline-flex size-9 shrink-0"
            [name]="currentUser.name"
            data-test-id="user-menu-avatar"
          />
        </button>
      } @else {
        <div
          class="hidden md:flex flex-col items-end gap-1"
          data-test-id="user-menu-loading-details"
        >
          <div
            class="h-3 w-24 rounded bg-muted animate-pulse"
            data-test-id="user-menu-loading-name"
          ></div>
          <div
            class="h-3 w-32 rounded bg-muted animate-pulse"
            data-test-id="user-menu-loading-email"
          ></div>
        </div>
        <div
          class="inline-flex size-9 shrink-0 items-center justify-center rounded-full border bg-secondary/50 animate-pulse"
          data-test-id="user-menu-loading-avatar"
        ></div>
      }
    </div>
  `,
})
export class UserMenuComponent {
  private auth = inject(AuthService);
  protected user = this.auth.getProfile();
}
