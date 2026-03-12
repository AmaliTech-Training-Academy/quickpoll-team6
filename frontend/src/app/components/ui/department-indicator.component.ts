import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeBuilding06 } from '@ng-icons/huge-icons';
import { map } from 'rxjs';

import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { AuthService } from '@/services/auth.service';

@Component({
  selector: 'app-department-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, NgIcon, AsyncPipe],
  providers: [provideIcons({ hugeBuilding06 })],
  template: `
    <button
      app-button
      variant="secondary"
      size="sm"
      type="button"
      class="font-normal! rounded-full! text-xs!"
    >
      <ng-icon name="hugeBuilding06" />
      {{ departmentLabel$ | async }}
    </button>
  `,
})
export class DepartmentIndicatorComponent {
  private readonly authService = inject(AuthService);

  protected readonly departmentLabel$ = this.authService.getProfile().pipe(
    map((user) => {
      const departmentName = user.departments
        ?.map((department) => department.name?.trim())
        .filter((name): name is string => !!name)
        .join(', ');

      return departmentName || 'No Department';
    }),
  );
}
