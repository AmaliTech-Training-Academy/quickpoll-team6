import { ContentHeaderComponent } from '@/components/ui/content-header.component';
import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-poll-metrics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContentHeaderComponent, ButtonComponent],
  template: ``,
})
export class PollMetricsComponent {}
