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
    <div ngpDialog>
      <div class="dialog-content">
        <h2 ngpDialogTitle>{{ header() }}</h2>
        <p ngpDialogDescription>
          <ng-content />
        </p>
      </div>
      <div class="dialog-actions">
        <ng-content select="[slot=actions]" />
      </div>
    </div>
  `,
  styles: `
    :host {
      background-color: rgb(0 0 0 / 0.5);
      backdrop-filter: blur(4px);
      position: fixed;
      inset: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1rem;
      animation: fadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 50;
    }

    :host[data-exit] {
      animation: fadeOut 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    [ngpDialog] {
      width: min(100%, 32rem);
      background-color: var(--surface);
      color: var(--foreground);
      border: 1px solid var(--border);
      padding: 1.5rem;
      border-radius: calc(var(--radius) + 4px);
      box-shadow:
        0 10px 15px -3px rgb(0 0 0 / 0.08),
        0 4px 6px -4px rgb(0 0 0 / 0.08);
      animation: slideIn 300ms cubic-bezier(0.4, 0, 0.2, 1);
      box-sizing: border-box;
    }

    [ngpDialog][data-exit] {
      animation: slideOut 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .dialog-actions:empty {
      display: none;
    }

    [ngpDialogTitle] {
      font-size: 1.125rem;
      line-height: 1.75rem;
      font-weight: 600;
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
