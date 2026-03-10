import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { SecondaryNavbarComponent } from '@/components/ui/navbar.component';

@Component({
  selector: 'app-poll-details-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SecondaryNavbarComponent, RouterOutlet],
  template: `
    <div class="maxview-container flex flex-col p-5">
      <app-secondary-navbar [navLinks]="navLinks" />
      <router-outlet />
    </div>
  `,
})
export class PollDetailsLayoutComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly pollId = this.route.snapshot.paramMap.get('id');

  protected navLinks = [
    { label: 'Metrics', path: `/~/polls/${this.pollId}/metrics` },
    { label: 'Details', path: `/~/polls/${this.pollId}/details` },
  ];
}
