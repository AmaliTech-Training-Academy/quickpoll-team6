import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeView, hugeViewOffSlash } from '@ng-icons/huge-icons';
import { ChangeFn, provideValueAccessor, TouchedFn } from 'ng-primitives/utils';

@Component({
  selector: 'app-password-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [
    provideIcons({ hugeView, hugeViewOffSlash }),
    provideValueAccessor(PasswordFieldComponent),
  ],
  host: {
    '[attr.data-disabled]': 'isDisabled() ? true : null',
    '[attr.data-test-id]': 'testId()',
  },
  template: `
    <div class="password-field group">
      <input
        [type]="inputType()"
        [value]="value() ?? ''"
        [placeholder]="placeholder()"
        [name]="name()"
        [required]="required()"
        [disabled]="isDisabled()"
        [attr.aria-label]="ariaLabel()"
        [attr.autocomplete]="autocomplete()"
        [attr.aria-describedby]="describedBy() || null"
        [attr.data-test-id]="resolvedInputTestId()"
        (input)="onInput($event)"
        (blur)="handleBlur()"
        class="password-input"
      />

      <button
        type="button"
        class="toggle-button"
        [disabled]="isDisabled()"
        [attr.aria-label]="toggleAriaLabel()"
        [attr.aria-pressed]="visible()"
        [attr.data-test-id]="resolvedToggleTestId()"
        (click)="toggleVisibility()"
      >
        <ng-icon size="1.2em" [name]="visible() ? 'hugeViewOffSlash' : 'hugeView'" />
        <span class="sr-only">{{ toggleText() }}</span>
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .password-field {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      height: 2.5rem;
      border-radius: var(--radius);
      background-color: var(--input);
      color: var(--foreground);
      box-sizing: border-box;
      transition: all 200ms ease-out;
    }

    .password-field:focus-within {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }

    .password-input {
      height: 100%;
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      color: inherit;
      box-sizing: border-box;
      padding: 0 4.5rem 0 16px;
      font-size: 13px;
      font-family: inherit;
    }

    .password-input::placeholder {
      color: var(--muted-foreground);
    }

    .toggle-button {
      position: absolute;
      top: 50%;
      right: 0.5rem;
      transform: translateY(-50%);
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.375rem;
      font: inherit;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition:
        opacity 150ms ease,
        visibility 150ms ease;
    }

    .password-field:hover .toggle-button,
    .password-field:focus-within .toggle-button {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    :host([data-disabled='true']) .password-field:hover .toggle-button,
    :host([data-disabled='true']) .password-field:focus-within .toggle-button {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .toggle-button:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }

    .toggle-button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .toggle-text {
      font-size: 0.75rem;
      line-height: 1;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    :host([data-disabled='true']) .password-field {
      opacity: 0.6;
    }
  `,
})
export class PasswordFieldComponent implements ControlValueAccessor {
  readonly placeholder = input('');
  readonly name = input('');
  readonly ariaLabel = input('Password');
  readonly autocomplete = input('current-password');
  readonly describedBy = input<string | null>(null);
  readonly testId = input<string | null>(null);
  readonly required = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly value = model<string | null>(null);

  protected readonly visible = signal(false);
  protected readonly inputType = computed(() => (this.visible() ? 'text' : 'password'));
  protected readonly toggleText = computed(() => (this.visible() ? 'Hide' : 'Show'));
  protected readonly toggleAriaLabel = computed(() =>
    this.visible() ? 'Hide password' : 'Show password',
  );

  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  protected readonly resolvedInputTestId = computed(() => this.testId());
  protected readonly resolvedToggleTestId = computed(() =>
    this.testId() ? `${this.testId()}-toggle-button` : null,
  );

  private readonly formDisabled = signal(false);
  private onChange?: ChangeFn<string | null>;
  private onTouched?: TouchedFn;

  writeValue(value: string | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: ChangeFn<string | null>): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: TouchedFn): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const nextValue = input.value;
    this.value.set(nextValue);
    this.onChange?.(nextValue);
  }

  protected handleBlur(): void {
    this.onTouched?.();
  }

  protected toggleVisibility(): void {
    if (this.isDisabled()) {
      return;
    }

    this.visible.update((visible) => !visible);
  }
}
