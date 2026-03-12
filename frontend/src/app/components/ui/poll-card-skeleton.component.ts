import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-poll-card-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="bg-surface border shadow-xs rounded-xl p-3 sm:p-5 sm:py-6 animate-pulse">
      <div class="h-6 w-2/3 rounded-md bg-muted"></div>
      <div class="mt-3 h-4 w-40 rounded-md bg-muted"></div>

      <ul class="mt-4 space-y-3">
        @for (option of [1, 2, 3]; track option) {
          <li class="rounded-lg border border-border/60 bg-muted/30 p-3">
            <div class="h-4 w-32 rounded-md bg-muted"></div>
          </li>
        }
      </ul>
    </div>
  `,
})
export class PollCardSkeletonComponent {}
