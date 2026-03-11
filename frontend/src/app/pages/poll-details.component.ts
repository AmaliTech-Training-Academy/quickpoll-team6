import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-poll-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `poll details page`,
})
export class PollDetailsComponent {}
