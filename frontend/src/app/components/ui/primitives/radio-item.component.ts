import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgpRadioItem } from 'ng-primitives/radio';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-radio-item',
  hostDirectives: [
    {
      directive: NgpRadioItem,
      inputs: ['ngpRadioItemValue:value', 'ngpRadioItemDisabled:disabled'],
    },
  ],
  host: {
    '[attr.data-test-id]': 'testId()',
  },
  template: `
    <div
      ngpRadioIndicator
      class="indicator"
      [attr.data-test-id]="testId() ? testId() + '-indicator' : null"
    >
      <span class="indicator-dot"></span>
    </div>

    <div class="content" [attr.data-test-id]="testId() ? testId() + '-content' : null">
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: start;
      column-gap: 0.75rem;
      width: 100%;
      cursor: pointer;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) + 0.125rem);
      background-color: var(--surface);
      padding: 1rem;
      outline: none;
      transition:
        border-color 150ms ease,
        background-color 150ms ease,
        transform 150ms ease;
      box-sizing: border-box;
    }

    :host[data-hover] {
      background-color: var(--secondary-hover);
      border-color: color-mix(in oklab, var(--border) 75%, var(--primary));
    }

    :host[data-focus-visible] {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }

    :host[data-press] {
      background-color: var(--secondary-active);
      transform: scale(0.997);
    }

    :host[data-checked] {
      border-color: var(--primary);
    }

    :host[data-disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }

    [ngpRadioIndicator] {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      width: 1.125rem;
      height: 1.125rem;
      margin-top: 0.125rem;
      border: 1.5px solid var(--muted-foreground);
      border-radius: 9999px;
      background-color: var(--surface);
      transition:
        border-color 150ms ease,
        background-color 150ms ease;
      box-sizing: border-box;
    }

    .indicator-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 9999px;
      background-color: transparent;
      transition: background-color 150ms ease;
    }

    :host[data-checked] [ngpRadioIndicator] {
      border-color: var(--primary);
      background-color: var(--primary);
    }

    :host[data-checked] .indicator-dot {
      background-color: var(--primary-foreground);
    }

    .content {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
  `,
})
export class RadioItemComponent {
  readonly testId = input<string | null>(null);
}
