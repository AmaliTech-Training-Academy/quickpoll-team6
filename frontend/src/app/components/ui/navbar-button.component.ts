import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Params, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonComponent } from './primitives/button.component';

@Component({
  selector: 'app-navbar-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, RouterLink, RouterLinkActive],
  template: `
    <button
      app-button
      size="sm"
      routerLinkActive
      #rla="routerLinkActive"
      [routerLink]="path()"
      [queryParams]="queryParams()"
      [routerLinkActiveOptions]="{ exact: exact() }"
      [variant]="rla.isActive ? 'secondary' : 'ghost'"
      class="w-full justify-start! whitespace-nowrap"
    >
      {{ label() }}
    </button>
  `,
})
export class NavbarButtonComponent {
  label = input.required<string>();
  path = input.required<string>();
  queryParams = input<Params | null>(null);
  exact = input(true);
}
