import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NgpMenuItem } from 'ng-primitives/menu';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'button[app-menu-item]',
  hostDirectives: [NgpMenuItem],
  template: ` <ng-content /> `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px 6px 14px;
      border: none;
      background: none;
      color: var(--foreground);
      cursor: pointer;
      transition: background-color 0.2s;
      border-radius: 4px;
      min-width: 120px;
      text-align: start;
      outline: none;
      font-size: 14px;
      font-weight: 400;
    }

    :host[data-hover] {
      background-color: var(--secondary-hover);
    }

    :host[data-focus-visible] {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
      z-index: 1;
    }

    :host[data-press] {
      background-color: var(--secondary-active);
    }
  `,
})
export class MenuItemComponent {}
