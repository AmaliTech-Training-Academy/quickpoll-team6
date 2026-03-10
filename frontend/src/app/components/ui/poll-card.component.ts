import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroChartBar, heroLockClosed } from '@ng-icons/heroicons/outline';
import { ButtonComponent } from './primitives/button.component';

type PollOption = {
  id: string | number;
  text: string;
  percentage: number;
};

type Poll = {
  id: string | number;
  question: string;
  description?: string | null;
  creatorName: string;
  totalVotes: number;
  options: PollOption[];
};

@Component({
  selector: 'app-poll-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, ButtonComponent, NgIcon, RouterLink],
  providers: [provideIcons({ heroChartBar, heroLockClosed })],
  template: `
    <div class="bg-surface border shadow-xs rounded-xl p-3 sm:p-5 sm:py-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2>
            <a
              [routerLink]="['/~/polls', poll().id]"
              class="text-base font-medium text-foreground transition-colors hover:underline"
            >
              {{ poll().question }}
            </a>
          </h2>
          @if (poll().description) {
            <p class="mt-1 text-sm text-muted-foreground">{{ poll().description }}</p>
          }
          <p class="mt-2 text-xs text-muted-foreground">
            by {{ poll().creatorName }} &bull; {{ poll().totalVotes }} votes
          </p>
        </div>

        <div class="flex items-center gap-2 md:shrink-0">
          <button
            app-button
            type="button"
            variant="outline"
            size="md"
            class="size-9! p-0! rounded-lg!"
            aria-label="View results"
            title="View results"
          >
            <ng-icon name="heroChartBar" />
          </button>
          <button
            app-button
            type="button"
            variant="outline"
            size="md"
            class="size-9! p-0! rounded-lg!"
            aria-label="Close poll"
            title="Close poll"
          >
            <ng-icon name="heroLockClosed" />
          </button>
        </div>
      </div>

      <ul class="mt-4 space-y-3">
        @for (opt of poll().options; track opt.id) {
          <li class="rounded-lg border border-border/60 bg-muted/30 p-3">
            <div class="mb-2 flex items-center justify-between gap-3 text-xs">
              <span class="text-foreground">{{ opt.text }}</span>
              <span class="text-muted-foreground">{{ opt.percentage | number: '1.0-1' }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full bg-primary transition-all"
                [style.width.%]="opt.percentage"
              ></div>
            </div>
          </li>
        }
      </ul>
    </div>
  `,
})
export class PollCardComponent {
  poll = input.required<Poll>();
}
