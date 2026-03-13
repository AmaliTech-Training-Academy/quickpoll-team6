import { PollResult } from '@/models';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DonutChartComponent, BulletLegendItemInterface } from 'angular-chrts';

@Component({
  selector: 'app-poll-results-donut-chart',
  standalone: true,
  imports: [DonutChartComponent],
  template: `
    <ngx-donut-chart
      [data]="data"
      [categories]="categories"
      [height]="280"
    />
  `,
})
export class PollDonutChartComponent implements OnChanges {
  @Input({ required: true }) pollResult!: PollResult;

  data: number[] = [];
  categories: Record<string, BulletLegendItemInterface> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pollResult'] && this.pollResult) {
      this.data = this.pollResult.options.map((o) => o.votePercentage);

      this.categories = {};
      this.pollResult.options.forEach((o, i) => {
        this.categories[o.optionText] = {
          name: o.optionText,
          color: `var(--chart-${i + 1})`,
        };
      });
    }
  }
}