import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '@/services/auth.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeUser } from '@ng-icons/huge-icons';
import { ButtonComponent } from '@/components/ui/primitives/button.component';

@Component({
  selector: 'app-user-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, RouterLink, AsyncPipe, NgIcon],
  providers: [provideIcons({ hugeUser })],
  template: `
    <button
      app-button
      variant="outline"
      routerLink="/~/account"
      class="w-fit! size-9! px-0! rounded-full! shrink-0"
    >
      <!-- <div class="hidden md:flex flex-col items-end">
        <p class="text-xs font-medium">{{ (user | async)?.fullName }}</p>
        <p class="text-xs text-muted-foreground">{{ (user | async)?.email }}</p>
      </div> -->
      <div
        class="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground"
      >
        <ng-icon name="hugeUser" />
      </div>
    </button>
  `,
})
export class UserMenuComponent {
  private auth = inject(AuthService);
  protected user = this.auth.getProfile();
}
