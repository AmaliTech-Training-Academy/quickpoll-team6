import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { PollResult } from '@/models';
import { PollService } from '@/services/poll.service';
import { PollResultsBarChartComponent } from '@/components/ui/graphs/bar-chart.component';
import { PollDonutChartComponent } from '@/components/ui/graphs/donut-chart.component';

@Component({
  selector: 'app-poll-metrics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, PollResultsBarChartComponent, PollDonutChartComponent],
  template: `
    @if (pollResult(); as p) {
      <div class="grid lg:grid-cols-2 gap-4">
        <div class="rounded-xl border bg-surface p-5">
          <h1 class="text-xl font-medium mb-2">{{ p.title }}</h1>
          <p class="mb-4 text-muted-foreground">{{ p.description }}</p>

          <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm pt-4">
            <span class="text-muted-foreground">Creator</span>
            <span>{{ p.creatorName }}</span>

            <span class="text-muted-foreground">Status</span>
            <span class="capitalize">{{ p.status }}</span>

            <span class="text-muted-foreground">Max selections</span>
            <span>{{ p.maxSelections }}</span>

            <span class="text-muted-foreground">Created</span>
            <span>{{ p.createdAt | date: 'medium' }}</span>

            <span class="text-muted-foreground">Expires</span>
            <span>{{ p.expiresAt | date: 'medium' }}</span>
          </div>
        </div>
        <div class="grid md:grid-cols-2 gap-4">
          <div class="bg-surface rounded-xl border flex flex-col gap-3 p-5 items-center justify-center col-span-2">
            <h2 class="text-6xl font-medium font-mono">{{ p.participationRate }}</h2>
            <p>Participation Rate</p>
          </div>
          <div class="bg-surface rounded-xl border flex flex-col gap-3 p-5 items-center justify-center">
            <h2 class="text-6xl font-medium font-mono">{{ p.uniqueVoters }}</h2>
            <p>Unique Voters</p>
          </div>
          <div class="bg-surface rounded-xl border flex flex-col gap-3 p-5 items-center justify-center">
            <h2 class="text-6xl font-medium font-mono">{{ p.totalVotes }}</h2>
            <p>Total Votes</p>
          </div>
        </div>
        <div class="rounded-xl border bg-surface p-6 grid items-center">
          <app-poll-results-donut-chart [pollResult]="p" />
        </div>
        <div class="rounded-xl border bg-surface p-6 grid">
          <app-poll-results-bar-chart [pollResult]="p" />
        </div>
      </div>
    } @else {
      loading...
    }
  `,
})
export class PollMetricsComponent implements OnInit {
  readonly id = input.required<number>();
  private pollService = inject(PollService);

  protected readonly pollResult = signal<PollResult | null>(null);

  ngOnInit(): void {
    this.pollService.getResults(this.id()).subscribe({
      next: (res) => {
        console.log(res)
        this.pollResult.set(res);
      },
      error: (error) => {
        console.error('Error fetching poll:', error);
      },
    });
  }
}
