import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroBuildingOffice2 } from '@ng-icons/heroicons/outline';
import { map, of } from 'rxjs';

import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { AuthService } from '@/services/auth.service';

@Component({
  selector: 'app-department-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, NgIcon, AsyncPipe],
  providers: [provideIcons({ heroBuildingOffice2 })],
  template: `
    <button app-button variant="outline" size="md" type="button" class="font-normal!" disabled>
      <ng-icon name="heroBuildingOffice2" />
      {{ departmentLabel$ | async }} error
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
