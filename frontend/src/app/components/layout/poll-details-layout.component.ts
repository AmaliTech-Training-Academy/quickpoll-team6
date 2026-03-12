import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ContentHeaderComponent } from '../ui/content-header.component';
import { ButtonComponent } from '../ui/primitives/button.component';

@Component({
  selector: 'app-poll-details-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ContentHeaderComponent, ButtonComponent],
  template: `
    <app-content-header pageTitle="Poll Metrics">
      <button app-button data-test-id="poll-details-close-poll-button">Close poll</button>
    </app-content-header>
    <div class="maxview-container flex flex-col p-5">
      <router-outlet />
    </div>
  `,
})
export class PollDetailsLayoutComponent {}
