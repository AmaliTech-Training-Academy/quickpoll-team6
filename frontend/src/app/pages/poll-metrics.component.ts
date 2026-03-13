import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PollResult, PollTimeseriesResponse, TimeseriesPoint } from '@/models';
import { PollService } from '@/services/poll.service';
import { PollResultsBarChartComponent } from '@/components/ui/graphs/bar-chart.component';
import { PollDonutChartComponent } from '@/components/ui/graphs/donut-chart.component';
import { AreaChartComponent, BulletLegendItemInterface } from 'angular-chrts';

interface TrendRow {
  time: string;
  votes: number;
}

@Component({
  selector: 'app-poll-metrics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    PollResultsBarChartComponent,
    PollDonutChartComponent,
    AreaChartComponent,
  ],
  template: `
    @if (loading()) {
      <div class="animate-pulse space-y-4">
        <div class="grid lg:grid-cols-2 gap-4">
          <div class="h-48 bg-muted rounded-xl"></div>
          <div class="h-48 bg-muted rounded-xl"></div>
        </div>
        <div class="grid lg:grid-cols-2 gap-4">
          <div class="h-64 bg-muted rounded-xl"></div>
          <div class="h-64 bg-muted rounded-xl"></div>
        </div>
      </div>
    } @else if (pollResult(); as p) {
      <div class="grid lg:grid-cols-2 gap-4">
        <!-- Poll Info Card -->
        <div class="rounded-xl border bg-surface p-5">
          <h1 class="text-xl font-medium mb-2">{{ p.title }}</h1>
          @if (p.description) {
            <p class="mb-4 text-sm text-muted-foreground">{{ p.description }}</p>
          }

          <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm pt-4">
            <span class="text-muted-foreground">Creator</span>
            <span>{{ p.creatorName }}</span>

            <span class="text-muted-foreground">Status</span>
            <span>
              <span
                class="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full"
                [class.bg-green-100]="p.status === 'ACTIVE'"
                [class.text-green-700]="p.status === 'ACTIVE'"
                [class.bg-muted]="p.status !== 'ACTIVE'"
                [class.text-muted-foreground]="p.status !== 'ACTIVE'"
              >
                {{ p.status }}
              </span>
            </span>

            <span class="text-muted-foreground">Max selections</span>
            <span>{{ p.maxSelections }}</span>

            <span class="text-muted-foreground">Created</span>
            <span>{{ p.createdAt | date: 'medium' }}</span>

            <span class="text-muted-foreground">Expires</span>
            <span>{{ p.expiresAt ? (p.expiresAt | date: 'medium') : 'No expiry' }}</span>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="grid md:grid-cols-2 gap-4">
          <div
            class="bg-surface rounded-xl border flex flex-col gap-3 p-5 items-center justify-center col-span-2"
          >
            <h2 class="text-6xl font-medium font-mono">
              {{ p.participationRate | number: '1.0-2' }}
            </h2>
            <p class="text-sm text-muted-foreground">Participation Rate</p>
          </div>
          <div
            class="bg-surface rounded-xl border flex flex-col gap-3 p-5 items-center justify-center"
          >
            <h2 class="text-6xl font-medium font-mono">{{ p.uniqueVoters }}</h2>
            <p class="text-sm text-muted-foreground">Unique Voters</p>
          </div>
          <div
            class="bg-surface rounded-xl border flex flex-col gap-3 p-5 items-center justify-center"
          >
            <h2 class="text-6xl font-medium font-mono">{{ p.totalVotes }}</h2>
            <p class="text-sm text-muted-foreground">Total Votes</p>
          </div>
        </div>

        <!-- Donut Chart -->
        <div class="rounded-xl border bg-surface p-6 grid items-center">
          <app-poll-results-donut-chart [pollResult]="p" />
        </div>

        <!-- Bar Chart -->
        <div class="rounded-xl border bg-surface p-6 grid">
          <app-poll-results-bar-chart [pollResult]="p" />
        </div>

        <!-- Trend Chart (full-width) -->
        <div class="rounded-xl border bg-surface p-6 col-span-1 lg:col-span-2">
          <h3 class="text-sm font-medium mb-4">Voting Trend</h3>
          @if (trendData().length === 0) {
            <p class="text-sm text-muted-foreground py-8 text-center">No trend data yet.</p>
          } @else {
            <ngx-area-chart
              [data]="trendData()"
              [categories]="trendCategories"
              [height]="250"
              [xFormatter]="trendXFormatter"
            />
          }
        </div>
      </div>
    } @else {
      <div class="text-center py-12">
        <p class="text-muted-foreground">{{ error() || 'Poll not found.' }}</p>
      </div>
    }
  `,
})
export class PollMetricsComponent implements OnInit {
  readonly id = input.required<number>();
  private pollService = inject(PollService);

  protected readonly pollResult = signal<PollResult | null>(null);
  protected readonly trendData = signal<TrendRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly trendCategories: Record<string, BulletLegendItemInterface> = {
    votes: { name: 'Votes', color: 'var(--chart-1)' },
  };

  protected trendXFormatter = (tick: number | Date): string => {
    const data = this.trendData();
    const idx = tick as number;
    if (idx >= 0 && idx < data.length) {
      return data[idx].time;
    }
    return '';
  };

  ngOnInit(): void {
    forkJoin({
      results: this.pollService.getResults(this.id()),
      timeseries: this.pollService.getResultsTimeseries(this.id()),
    }).subscribe({
      next: ({ results, timeseries }) => {
        this.pollResult.set(results);
        this.trendData.set(this.mapTimeseries(timeseries));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load poll metrics.');
        this.loading.set(false);
      },
    });
  }

  private mapTimeseries(ts: PollTimeseriesResponse): TrendRow[] {
    if (!ts?.points?.length) return [];
    return ts.points.map((p: TimeseriesPoint) => ({
      time: this.formatBucketTime(p.bucketTime),
      votes: p.votesInBucket,
    }));
  }

  private formatBucketTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' });
  }
}
