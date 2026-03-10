import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NgpMenu } from 'ng-primitives/menu';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-menu',
  hostDirectives: [NgpMenu],
  template: ` <ng-content /> `,
  styles: `
    :host {
      position: fixed;
      display: flex;
      flex-direction: column;
      width: max-content;
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow:
        0 10px 15px -3px rgb(0 0 0 / 0.08),
        0 4px 6px -4px rgb(0 0 0 / 0.08);
      border-radius: 8px;
      padding: 4px;
      animation: menu-show 300ms ease-out;
    }

    :host[data-exit] {
      animation: menu-hide 300ms ease-out;
    }

    @keyframes menu-show {
      0% {
        opacity: 0;
        transform: scale(0.9);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes menu-hide {
      0% {
        opacity: 1;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(0.9);
      }
    }
  `,
})
export class MenuComponent {}
