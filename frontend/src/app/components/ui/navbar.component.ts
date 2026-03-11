import { Params } from '@angular/router';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NavbarButtonComponent } from './navbar-button.component';

export interface SidebarLink {
  label: string;
  path: string;
  queryParams?: Params;
}

@Component({
  selector: 'app-secondary-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavbarButtonComponent],
  template: `
    <nav class="flex gap-1 mb-5 max-w-full overflow-x-auto">
      @for (link of navLinks(); track trackByLink(link)) {
        <app-navbar-button
          [label]="link.label"
          [path]="link.path"
          [queryParams]="link.queryParams ?? null"
        />
      }
    </nav>
  `,
})
export class SecondaryNavbarComponent {
  navLinks = input.required<SidebarLink[]>();

  protected trackByLink(link: SidebarLink) {
    return `${link.path}:${JSON.stringify(link.queryParams ?? {})}`;
  }
}
