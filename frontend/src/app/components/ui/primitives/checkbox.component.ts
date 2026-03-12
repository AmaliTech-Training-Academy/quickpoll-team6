import { Component, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeCheckmarkSquare02, hugeMinusSign } from '@ng-icons/huge-icons';
import { injectCheckboxState, NgpCheckbox } from 'ng-primitives/checkbox';
import { ChangeFn, provideValueAccessor, TouchedFn } from 'ng-primitives/utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-checkbox',
  hostDirectives: [
    {
      directive: NgpCheckbox,
      inputs: [
        'ngpCheckboxChecked:checked',
        'ngpCheckboxIndeterminate:indeterminate',
        'ngpCheckboxDisabled:disabled',
      ],
      outputs: [
        'ngpCheckboxCheckedChange:checkedChange',
        'ngpCheckboxIndeterminateChange:indeterminateChange',
      ],
    },
  ],
  providers: [
    provideValueAccessor(CheckboxComponent),
    provideIcons({ hugeCheckmarkSquare02, hugeMinusSign }),
  ],
  imports: [NgIcon],
  template: `
    @if (state().indeterminate()) {
      <ng-icon name="hugeMinusSign" />
    } @else if (state().checked()) {
      <ng-icon name="hugeCheckmarkSquare02" />
    }
  `,
  styles: `
    :host {
      display: flex;
      width: 1.25rem;
      height: 1.25rem;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      border: 1px solid var(--border);
      background-color: var(--surface);
      padding: 0;
      outline: none;
      flex: none;
      color: var(--primary-foreground);
      font-size: 0.75rem;
      transition:
        background-color 150ms cubic-bezier(0.4, 0, 0.2, 1),
        border-color 150ms cubic-bezier(0.4, 0, 0.2, 1),
        color 150ms cubic-bezier(0.4, 0, 0.2, 1);
      box-sizing: border-box;
    }

    :host[data-hover] {
      background-color: var(--secondary-hover);
    }

    :host[data-checked],
    :host[data-indeterminate] {
      border-color: var(--primary);
      background-color: var(--primary);
      color: var(--primary-foreground);
    }

    :host[data-focus-visible] {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }

    :host[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  host: {
    '(focusout)': 'onTouchedFn?.()',
  },
})
export class CheckboxComponent implements ControlValueAccessor {
  /**
   * The checked state of the checkbox.
   */
  protected readonly state = injectCheckboxState();

  /**
   * The onChange function for the checkbox.
   */
  protected onChangeFn?: ChangeFn<boolean>;

  /**
   * The onTouched function for the checkbox.
   */
  protected onTouchedFn?: TouchedFn;

  constructor() {
    // Whenever the user interacts with the checkbox, call the onChange function with the new value.
    this.state()
      .checkedChange.pipe(takeUntilDestroyed())
      .subscribe((checked) => this.onChangeFn?.(checked));
  }

  writeValue(checked: boolean): void {
    this.state().setChecked(checked);
  }

  registerOnChange(fn: ChangeFn<boolean>): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: TouchedFn): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.state().setDisabled(isDisabled);
  }
}
