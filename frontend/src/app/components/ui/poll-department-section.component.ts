import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeArrowDown01, hugeCancel01, hugeCheckmarkCircle01 } from '@ng-icons/huge-icons';
import {
  NgpCombobox,
  NgpComboboxButton,
  NgpComboboxDropdown,
  NgpComboboxInput,
  NgpComboboxOption,
  NgpComboboxPortal,
} from 'ng-primitives/combobox';

import { Department } from '@/models';
import { DepartmentService } from '@/services/department.service';
import { RadioGroupComponent } from '@/components/ui/primitives/radio-group.component';
import { RadioItemComponent } from '@/components/ui/primitives/radio-item.component';

type PollAudience = 'company-wide' | 'department';

@Component({
  selector: 'app-poll-department-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RadioGroupComponent,
    RadioItemComponent,
    NgpCombobox,
    NgpComboboxDropdown,
    NgpComboboxOption,
    NgpComboboxInput,
    NgpComboboxPortal,
    NgpComboboxButton,
    NgIcon,
  ],
  providers: [provideIcons({ hugeArrowDown01, hugeCancel01, hugeCheckmarkCircle01 })],
  template: `
    <div data-test-id="create-poll-department-section">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h2 class="text-base font-medium text-foreground">Audience</h2>
          <p class="text-sm text-muted-foreground">
            Choose whether this poll is visible to everyone or only to specific departments.
          </p>
        </div>

        <app-radio-group
          [value]="audience()"
          (valueChange)="onAudienceValueChange($event)"
          class="grid! gap-3 sm:grid-cols-2!"
          data-test-id="create-poll-audience-radio-group"
        >
          <app-radio-item value="company-wide" testId="create-poll-audience-company-wide-option">
            <span class="block text-sm font-medium text-inherit">Company-Wide</span>
            <span class="mt-1 block text-xs text-muted-foreground">
              Anyone in the company can access and vote on this poll.
            </span>
          </app-radio-item>

          <app-radio-item value="department" testId="create-poll-audience-department-option">
            <span class="block text-sm font-medium text-inherit">Department</span>
            <span class="mt-1 block text-xs text-muted-foreground">
              Limit this poll to one or more departments.
            </span>
          </app-radio-item>
        </app-radio-group>

        @if (audience() === 'department') {
          <div class="flex flex-col gap-2" data-test-id="create-poll-department-selection">
            <div
              [ngpComboboxValue]="selectedDepartmentNames()"
              (ngpComboboxValueChange)="onComboboxValueChange($event)"
              (ngpComboboxOpenChange)="resetOnClose($event)"
              ngpComboboxMultiple
              ngpCombobox
              data-test-id="create-poll-department-combobox"
            >
              <div
                class="input-container"
                [class.py-1]="selectedDepartmentNames().length > 0"
                data-test-id="create-poll-department-input-container"
              >
                @if (selectedDepartmentNames().length > 0) {
                  <div class="chips-container" data-test-id="create-poll-department-chip-list">
                    @for (
                      selectedDepartmentName of selectedDepartmentNames();
                      track selectedDepartmentName;
                      let i = $index
                    ) {
                      <div
                        class="chip"
                        [class.chip-focused]="focusedChipIndex() === i"
                        [attr.data-test-id]="'create-poll-department-chip-' + i"
                      >
                        <span
                          class="chip-text"
                          [attr.data-test-id]="'create-poll-department-chip-label-' + i"
                        >
                          {{ selectedDepartmentName }}
                        </span>
                        <button
                          class="chip-remove"
                          [attr.aria-label]="'Remove ' + selectedDepartmentName"
                          (click)="removeDepartmentByName(selectedDepartmentName)"
                          type="button"
                          [attr.data-test-id]="'create-poll-department-chip-remove-button-' + i"
                        >
                          <ng-icon name="hugeCancel01" />
                        </button>
                      </div>
                    }
                  </div>
                }

                <input
                  #inputElement
                  [class.chips]="selectedDepartmentNames().length > 0"
                  [value]="filter()"
                  (input)="onFilterChange($event)"
                  (keydown)="onInputKeyDown($event)"
                  placeholder="Select departments"
                  ngpComboboxInput
                  data-test-id="create-poll-department-input"
                />
              </div>

              <button
                ngpComboboxButton
                aria-label="Toggle departments dropdown"
                data-test-id="create-poll-department-toggle-button"
              >
                <ng-icon name="hugeArrowDown01" />
              </button>

              <div
                *ngpComboboxPortal
                ngpComboboxDropdown
                data-test-id="create-poll-department-dropdown"
              >
                @for (department of filteredDepartments(); track department.id) {
                  <div
                    [ngpComboboxOptionValue]="department.name"
                    ngpComboboxOption
                    [attr.data-test-id]="'create-poll-department-option-' + department.id"
                  >
                    {{ department.name }}
                    @if (isSelected(department.id)) {
                      <ng-icon name="hugeCheckmarkCircle01" />
                    }
                  </div>
                } @empty {
                  <div class="empty-message" data-test-id="create-poll-department-empty-message">
                    No departments found
                  </div>
                }
              </div>
            </div>

            @if (loading()) {
              <p
                class="text-xs text-muted-foreground"
                data-test-id="create-poll-department-loading-message"
              >
                Loading departments…
              </p>
            }

            @if (error()) {
              <p
                class="text-xs text-destructive"
                data-test-id="create-poll-department-error-message"
              >
                {{ error() }}
              </p>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    [ngpCombobox] {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      min-height: 36px;
      border-radius: var(--radius-md);
      background-color: var(--input);
      box-shadow: none;
      box-sizing: border-box;
    }

    [ngpCombobox][data-focus] {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }

    .input-container {
      display: flex;
      flex: 1;
      flex-wrap: wrap;
      align-items: center;
      width: 100%;
      min-height: 36px;
    }

    [ngpComboboxInput] {
      padding: 0 16px;
      border: none;
      background-color: transparent;
      color: var(--foreground);
      font-family: inherit;
      font-size: 13px;
      outline: none;
      height: 100%;
      width: inherit;
      flex: 1;
      min-width: 140px;
    }

    [ngpComboboxInput].chips {
      padding-left: 16px;
      padding-block: 8px;
    }

    [ngpComboboxInput]::placeholder {
      color: var(--muted-foreground);
    }

    [ngpComboboxButton] {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      width: 36px;
      background-color: transparent;
      border: none;
      color: var(--muted-foreground);
      cursor: pointer;
      box-sizing: border-box;
      flex-shrink: 0;
    }

    [ngpComboboxDropdown] {
      background-color: var(--surface);
      border: 1px solid var(--border);
      padding: 0.25rem;
      border-radius: 0.75rem;
      outline: none;
      position: absolute;
      animation: popover-show 0.1s ease-out;
      width: var(--ngp-combobox-width);
      box-shadow:
        0 10px 15px -3px rgb(0 0 0 / 0.08),
        0 4px 6px -4px rgb(0 0 0 / 0.08);
      box-sizing: border-box;
      margin-top: 4px;
      max-height: 240px;
      overflow-y: auto;
      z-index: 1001;
      transform-origin: var(--ngp-combobox-transform-origin);
    }

    [ngpComboboxDropdown][data-enter] {
      animation: combobox-show 0.1s ease-out;
    }

    [ngpComboboxDropdown][data-exit] {
      animation: combobox-hide 0.1s ease-out;
    }

    [ngpComboboxOption] {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      cursor: pointer;
      border-radius: 0.5rem;
      width: 100%;
      min-height: 36px;
      font-size: 14px;
      color: var(--foreground);
      box-sizing: border-box;
    }

    [ngpComboboxOption][data-hover] {
      background-color: var(--secondary-hover);
    }

    [ngpComboboxOption][data-press] {
      background-color: var(--secondary-active);
    }

    [ngpComboboxOption][data-active] {
      background-color: var(--secondary);
      color: var(--secondary-foreground);
    }

    [ngpComboboxOption] ng-icon {
      margin-left: auto;
    }

    .chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding-left: 8px;
      padding-block: 6px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      max-width: 220px;
      border: 1px solid var(--border);
      border-radius: 9999px;
      background-color: var(--secondary);
      color: var(--secondary-foreground);
      padding: 2px 6px 2px 10px;
      font-size: 12px;
      font-weight: 500;
      line-height: 20px;
      transition: all 0.15s ease;
    }

    .chip:hover {
      background-color: var(--secondary-hover);
    }

    .chip-focused .chip-remove {
      opacity: 1;
      background-color: var(--destructive);
      color: var(--destructive-foreground);
    }

    .chip-text {
      margin-right: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      user-select: none;
    }

    .chip-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      padding: 0;
      opacity: 0.7;
      transition: all 0.15s ease;
    }

    .chip-remove:hover {
      opacity: 1;
      background-color: var(--destructive);
      color: var(--destructive-foreground);
    }

    .chip-remove:focus {
      outline: 2px solid var(--ring);
      outline-offset: 1px;
    }

    .empty-message {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0.5rem;
      color: var(--muted-foreground);
      font-size: 12px;
      font-weight: 500;
      text-align: center;
    }

    @keyframes combobox-show {
      0% {
        opacity: 0;
        transform: translateY(-10px) scale(0.9);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes combobox-hide {
      0% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      100% {
        opacity: 0;
        transform: translateY(-10px) scale(0.9);
      }
    }
  `,
})
export class PollDepartmentSectionComponent {
  readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('inputElement');

  readonly departmentIds = model<number[]>([]);
  readonly audience = model<PollAudience>('company-wide');
  readonly allowNoDepartment = input(true);
  readonly departmentNamesChange = output<string[]>();

  private readonly departmentService = inject(DepartmentService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly departments = signal<Department[]>([]);

  protected readonly filter = signal('');
  protected readonly focusedChipIndex = signal(-1);

  protected readonly filteredDepartments = computed(() => {
    const filterValue = this.filter().trim().toLowerCase();

    return this.departments().filter((department) =>
      department.name.toLowerCase().includes(filterValue),
    );
  });

  protected readonly selectedDepartmentNames = computed(() =>
    this.departments()
      .filter((department) => this.departmentIds().includes(department.id))
      .map((department) => department.name),
  );

  constructor() {
    this.departmentService.getAll().subscribe({
      next: (departments) => {
        this.departments.set(departments);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load departments.');
        this.loading.set(false);
      },
    });

    effect(() => {
      if (this.departmentIds().length > 0 && this.audience() !== 'department') {
        this.audience.set('department');
      }
    });

    effect(() => {
      if (this.audience() === 'company-wide' && this.departmentIds().length > 0) {
        this.departmentIds.set([]);
      }
    });

    effect(() => {
      this.departmentNamesChange.emit(this.selectedDepartmentNames());
    });
  }

  protected onFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filter.set(input.value);
    this.focusedChipIndex.set(-1);
  }

  protected onInputKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const currentValue = this.selectedDepartmentNames();

    if (event.key === 'Backspace') {
      if (input.value === '' && currentValue.length > 0) {
        event.preventDefault();
        const currentFocusedIndex = this.focusedChipIndex();

        if (currentFocusedIndex === -1) {
          this.focusedChipIndex.set(currentValue.length - 1);
        } else {
          const departmentNameToRemove = currentValue[currentFocusedIndex];
          this.removeDepartmentByName(departmentNameToRemove);
          this.focusedChipIndex.set(-1);
          this.inputElement().nativeElement.focus();
        }
      } else {
        this.focusedChipIndex.set(-1);
      }

      return;
    }

    this.focusedChipIndex.set(-1);
  }

  protected resetOnClose(open: boolean): void {
    if (open) {
      return;
    }

    this.filter.set('');
    this.focusedChipIndex.set(-1);
  }

  protected onAudienceValueChange(value: string | null): void {
    if (value === 'company-wide' || value === 'department') {
      this.audience.set(value);
    }
  }

  protected isSelected(departmentId: number): boolean {
    return this.departmentIds().includes(departmentId);
  }

  protected onComboboxValueChange(values: string[] | string | null | undefined): void {
    const nextValues = Array.isArray(values) ? values : values ? [values] : [];
    const nextDepartmentIds = this.departments()
      .filter((department) => nextValues.includes(department.name))
      .map((department) => department.id);

    this.departmentIds.set(nextDepartmentIds);
    this.filter.set('');
    this.focusedChipIndex.set(-1);
  }

  protected toggleDepartment(department: Department): void {
    const nextDepartmentIds = this.isSelected(department.id)
      ? this.departmentIds().filter((id) => id !== department.id)
      : [...this.departmentIds(), department.id];

    this.departmentIds.set(nextDepartmentIds);
    this.filter.set('');
    this.focusedChipIndex.set(-1);
  }

  protected removeDepartmentByName(departmentName: string): void {
    const department = this.departments().find((item) => item.name === departmentName);

    if (!department) {
      return;
    }

    this.departmentIds.set(this.departmentIds().filter((id) => id !== department.id));
    this.focusedChipIndex.set(-1);
  }
}
