import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { SecondaryNavbarComponent } from '@/components/ui/navbar.component';
import { ContentHeaderComponent } from '../ui/content-header.component';

@Component({
  selector: 'app-poll-details-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SecondaryNavbarComponent, RouterOutlet, ContentHeaderComponent],
  template: `
    <app-content-header pageTitle="Poll Metrics">
      <button app-button>Close poll</button>
    </app-content-header>
    <div class="maxview-container flex flex-col p-5">
      <router-outlet />
    </div>
  `,
})
export class PollDetailsLayoutComponent {}
