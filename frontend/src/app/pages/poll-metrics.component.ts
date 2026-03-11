import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-poll-metrics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `poll metrics page`,
})
export class PollMetricsComponent {}
