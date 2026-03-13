import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { BarChartComponent } from 'angular-chrts';
import { PollResult } from '@/models';

interface ChartRow {
  option: string;
  votes: number;
}

interface CategoryConfig {
  name: string;
  label: string;
  color: string;
}

@Component({
  selector: 'app-poll-results-bar-chart',
  standalone: true,
  imports: [BarChartComponent],
  template: `
    <ngx-bar-chart
      [data]="chartData"
      [categories]="categories"
      [height]="400"
      [yAxis]="['votes']"
      yLabel="Votes"
      xLabel="Options"
    ></ngx-bar-chart>
  `,
  styles: `
    :host {
      --vis-font-family: 'Akkurat Mono';
      --vis-color-main: red;
      --vis-color-main-light: yellow;
      --vis-color-main-dark: green;
      --vis-color-grey: orange;
    }
  `,
})
export class PollResultsBarChartComponent implements OnChanges {
  @Input({ required: true }) pollResult!: PollResult;

  chartData: ChartRow[] = [];

  categories: Record<string, CategoryConfig> = {
    votes: {
      name: 'Votes',
      label: 'Votes',
      color: 'var(--chart-1)',
    },
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pollResult'] && this.pollResult) {
      this.chartData = this.pollResult.options.map((o) => ({
        option: o.optionText,
        votes: o.voteCount,
      }));
    }
  }
}
