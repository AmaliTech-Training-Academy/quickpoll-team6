import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-content-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="border-b min-h-25">
      <div class="flex items-center justify-between p-5 py-7 max-h-22.5 maxview-container">
        <h1 class="text-2xl font-medium">{{ pageTitle() }}</h1>
        <ng-content />
      </div>
    </div>
  `,
})
export class ContentHeaderComponent {
  pageTitle = input.required<string>();
}
