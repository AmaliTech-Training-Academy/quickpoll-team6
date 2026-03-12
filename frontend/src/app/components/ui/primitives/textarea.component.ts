import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NgpTextarea } from 'ng-primitives/textarea';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'textarea[app-textarea]',
  hostDirectives: [{ directive: NgpTextarea, inputs: ['disabled'] }],
  template: ` <ng-content /> `,
  styles: `
    :host {
      min-height: 7rem;
      max-height: 14rem;
      width: 100%;
      border-radius: var(--radius);
      padding: 0.75rem 1rem;
      background-color: var(--input);
      color: var(--foreground);
      border: 1px solid transparent;
      outline: none;
      box-sizing: border-box;
      field-sizing: content;
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1.5;
      resize: none;
      transition:
        border-color 200ms ease-out,
        outline-color 200ms ease-out,
        background-color 200ms ease-out;
    }

    :host[data-focus],
    :host:focus {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }

    :host::placeholder {
      color: var(--muted-foreground);
    }

    :host[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
})
export class TextareaComponent {}
