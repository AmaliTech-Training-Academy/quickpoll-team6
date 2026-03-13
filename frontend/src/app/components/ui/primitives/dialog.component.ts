import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import {
  NgpDialog,
  NgpDialogDescription,
  NgpDialogOverlay,
  NgpDialogTitle,
  provideDialogState,
} from 'ng-primitives/dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dialog',
  hostDirectives: [NgpDialogOverlay],
  imports: [NgpDialog, NgpDialogTitle, NgpDialogDescription],
  providers: [
    // We need to hoist the dialog state to the host component so that it can be used
    // within ng-content
    provideDialogState(),
  ],
  template: `
    <div ngpDialog data-test-id="dialog">
      <div class="dialog-content" data-test-id="dialog-content">
        <h2 ngpDialogTitle data-test-id="dialog-title">{{ header() }}</h2>
        <p ngpDialogDescription data-test-id="dialog-description">
          <ng-content />
        </p>
      </div>
      <div class="dialog-actions" data-test-id="dialog-actions">
        <ng-content select="[slot=actions]" />
      </div>
    </div>
  `,
  styles: `
    :host {
      background-color: rgb(0 0 0 / 0.6);
      backdrop-filter: blur(1px);
      position: fixed;
      inset: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1rem;
      animation: fadeIn 150ms cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 50;
    }

    :host[data-exit] {
      animation: fadeOut 50ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    [ngpDialog] {
      width: min(100%, 34rem);
      background-color: var(--surface);
      color: var(--foreground);
      border: 1px solid var(--border);
      border-radius: 14px;
      box-shadow:
        0 18px 40px -12px rgb(0 0 0 / 0.18),
        0 8px 18px -10px rgb(0 0 0 / 0.12);
      animation: slideIn 300ms cubic-bezier(0.4, 0, 0.2, 1);
      box-sizing: border-box;
      overflow: hidden;
    }

    [ngpDialog][data-exit] {
      animation: slideOut 50ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 20px;
    }

    .dialog-actions {
      display: grid;
      gap: 4px;
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border);
      background-color: var(--muted);
    }

    .dialog-actions:empty {
      display: none;
    }

    [ngpDialogTitle] {
      font-size: 1.5rem;
      line-height: 1.2;
      font-weight: 500;
      letter-spacing: -0.02em;
      color: var(--foreground);
      margin: 0;
    }

    [ngpDialogDescription] {
      font-size: 0.875rem;
      line-height: 1.5rem;
      color: var(--muted-foreground);
      margin: 0;
    }

    @keyframes fadeIn {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }

    @keyframes fadeOut {
      0% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }

    @keyframes slideIn {
      0% {
        transform: translateY(-20px);
        opacity: 0;
      }
      100% {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      0% {
        transform: translateY(0);
        opacity: 1;
      }

      100% {
        transform: translateY(-20px);
        opacity: 0;
      }
    }
  `,
})
export class DialogComponent {
  /** The dialog title */
  readonly header = input.required<string>();
}
