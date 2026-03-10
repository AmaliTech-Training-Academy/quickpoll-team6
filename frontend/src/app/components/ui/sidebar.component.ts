import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NavbarButtonComponent } from './navbar-button.component';

export interface SidebarLink {
  label: string;
  path: string;
}

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavbarButtonComponent],
  template: `
    <nav class="min-w-56 flex flex-col gap-px">
      @for (link of navLinks(); track link.path) {
        <app-navbar-button [label]="link.label" [path]="link.path" />
      }
    </nav>
  `,
})
export class SidebarComponent {
  navLinks = input.required<SidebarLink[]>();
}
