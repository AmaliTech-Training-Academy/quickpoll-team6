import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor } from '@angular/forms';
import { injectSwitchState, NgpSwitch, NgpSwitchThumb } from 'ng-primitives/switch';
import { ChangeFn, provideValueAccessor, TouchedFn } from 'ng-primitives/utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-switch',
  hostDirectives: [
    {
      directive: NgpSwitch,
      inputs: ['ngpSwitchChecked:checked', 'ngpSwitchDisabled:disabled'],
      outputs: ['ngpSwitchCheckedChange:checkedChange'],
    },
  ],
  imports: [NgpSwitchThumb],
  template: ` <span ngpSwitchThumb [attr.data-test-id]="thumbTestId()"></span> `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      position: relative;
      width: 2.5rem;
      height: 1.5rem;
      border-radius: 999px;
      background-color: var(--input);
      border: 1px solid var(--border);
      box-shadow: inset 0 1px 1px oklch(0 0 0 / 0.08);
      padding: 0;
      outline: none;
      cursor: pointer;
      transition-property:
        color, background-color, border-color, text-decoration-color, fill, stroke;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
      box-sizing: border-box;
      flex: none;
    }

    :host[data-focus-visible] {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }

    :host[data-checked] {
      background-color: var(--primary);
      border-color: var(--primary);
    }

    :host[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    [ngpSwitchThumb] {
      display: block;
      height: 1.25rem;
      width: 1.25rem;
      border-radius: 999px;
      background-color: var(--surface);
      box-shadow: 0 2px 1px oklch(0 0 0 / 0.18);
      outline: none;
      transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateX(1px);
      box-sizing: border-box;
    }

    [ngpSwitchThumb][data-checked] {
      transform: translateX(17px);
    }
  `,
  providers: [provideValueAccessor(SwitchComponent)],
  host: {
    '(focusout)': 'onTouched?.()',
    '[attr.data-test-id]': 'testId()',
  },
})
export class SwitchComponent implements ControlValueAccessor {
  /** The test id for the switch host. */
  readonly testId = input('switch');

  /** The test id for the switch thumb. */
  readonly thumbTestId = input('switch-thumb');
  /** Access the switch state. */
  private readonly switch = injectSwitchState();

  /** The on change callback */
  private onChange?: ChangeFn<boolean>;

  /** The on touched callback */
  protected onTouched?: TouchedFn;

  constructor() {
    // Any time the switch changes, update the form value.
    this.switch()
      .checkedChange.pipe(takeUntilDestroyed())
      .subscribe((value) => this.onChange?.(value));
  }

  /** Write a new value to the switch. */
  writeValue(value: boolean): void {
    this.switch().setChecked(value);
  }

  /** Register a callback function to be called when the value changes. */
  registerOnChange(fn: ChangeFn<boolean>): void {
    this.onChange = fn;
  }

  /** Register a callback function to be called when the switch is touched. */
  registerOnTouched(fn: TouchedFn): void {
    this.onTouched = fn;
  }

  /** Set the disabled state of the switch. */
  setDisabledState(isDisabled: boolean): void {
    this.switch().setDisabled(isDisabled);
  }
}
