import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeUserMultiple } from '@ng-icons/huge-icons';
import { map } from 'rxjs';

import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { AuthService } from '@/services/auth.service';

@Component({
  selector: 'app-department-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, NgIcon, AsyncPipe],
  providers: [provideIcons({ hugeUserMultiple })],
  template: `
    <button app-button variant="outline" size="md" type="button" class="font-normal!" disabled>
      <ng-icon name="hugeUserMultiple" />
      {{ departmentLabel$ | async }} <span class="text-destructive">error</span>
    </button>
  `,
})
export class DepartmentIndicatorComponent {
  private readonly authService = inject(AuthService);

  protected readonly departmentLabel$ = this.authService.getProfile().pipe(
    map((user) => {
      const departmentName =
        (user as { departmentName?: string | null }).departmentName ??
        (user as { department?: { name?: string | null } | null }).department?.name ??
        (user as { department?: string | null }).department ??
        null;

      return departmentName?.trim() || 'No Department';
    }),
  );
}
