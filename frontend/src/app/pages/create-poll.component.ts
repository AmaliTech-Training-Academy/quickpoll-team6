import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';
import {
  hugeAdd01,
  hugeAlertCircle,
  hugeCancel01,
  hugeDragDropVertical,
} from '@ng-icons/huge-icons';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { NgpDialogTrigger } from 'ng-primitives/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PollService } from '@/services/poll.service';
import { InputComponent } from '@/components/ui/primitives/input.component';
import { TextareaComponent } from '@/components/ui/primitives/textarea.component';
import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { SwitchComponent } from '@/components/ui/primitives/switch.component';
import { ContentHeaderComponent } from '@/components/ui/content-header.component';
import { DialogComponent } from '@/components/ui/primitives/dialog.component';
import { PollDepartmentSectionComponent } from '@/components/ui/poll-department-section.component';

type PollAudience = 'company-wide' | 'department';

@Component({
  selector: 'app-create-poll',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    TextareaComponent,
    SwitchComponent,
    ContentHeaderComponent,
    DialogComponent,
    PollDepartmentSectionComponent,
    NgIcon,
    NgpDialogTrigger,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
  ],
  providers: [provideIcons({ hugeAdd01, hugeAlertCircle, hugeCancel01, hugeDragDropVertical })],
  template: `
    <app-content-header pageTitle="Create Poll" />

    <div class="maxview-container lg:max-w-4xl p-5" data-test-id="create-poll-page">
      @if (error) {
        <div
          class="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3"
          data-test-id="create-poll-error-message"
        >
          <ng-icon
            name="hugeAlertCircle"
            color="var(--destructive)"
            size="18px"
            class="shrink-0 text-destructive"
          />
          <p class="text-sm text-destructive">{{ error }}</p>
        </div>
      }

      <form
        id="create-poll-form"
        [formGroup]="newPollForm"
        class="flex flex-col gap-5"
        data-test-id="create-poll-form"
      >
        <div class="grid gap-5">
          <div class="rounded-xl border bg-surface p-5 shadow-xs sm:p-6">
            <div class="flex flex-col gap-6">
              <div class="flex flex-col gap-2">
                <label for="question" class="text-base font-medium text-foreground">Question</label>
                <input
                  id="question"
                  app-input
                  type="text"
                  formControlName="question"
                  placeholder="What would you like to ask?"
                  required
                  data-test-id="create-poll-question-input"
                />
                @if (
                  newPollForm.controls.question.touched && newPollForm.controls.question.errors
                ) {
                  <div
                    class="form-field-error"
                    role="alert"
                    aria-live="assertive"
                    data-test-id="create-poll-question-error-message"
                  >
                    @if (newPollForm.controls.question.errors['required']) {
                      <span>Please type a question.</span>
                    }
                  </div>
                }
              </div>

              <div class="flex flex-col gap-2">
                <label for="description" class="text-base font-medium text-foreground">
                  Description
                </label>
                <textarea
                  id="description"
                  app-textarea
                  formControlName="description"
                  rows="3"
                  placeholder="Add more context for voters"
                  data-test-id="create-poll-description-input"
                ></textarea>
              </div>

              <div class="flex flex-col gap-2 sm:max-w-sm">
                <label for="expiresAt" class="text-base font-medium text-foreground">
                  Expiry date and time
                </label>
                <input
                  id="expiresAt"
                  app-input
                  type="datetime-local"
                  formControlName="expiresAt"
                  required
                  data-test-id="create-poll-expiry-input"
                />
                @if (
                  newPollForm.controls.expiresAt.touched && newPollForm.controls.expiresAt.errors
                ) {
                  <div
                    class="form-field-error"
                    role="alert"
                    aria-live="assertive"
                    data-test-id="create-poll-expiry-error-message"
                  >
                    @if (newPollForm.controls.expiresAt.errors['required']) {
                      <span>Please choose an expiry date and time.</span>
                    }
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="rounded-xl border bg-surface p-5 shadow-xs sm:p-6">
            <div class="flex flex-col gap-4">
              <div>
                <h2 class="text-base font-medium text-foreground">Options</h2>
                <p class="text-sm text-muted-foreground">
                  Add at least two options for people to choose from.
                </p>
              </div>

              <div
                cdkDropList
                [cdkDropListData]="getOptions()"
                class="flex flex-col gap-3 pt-2"
                (cdkDropListDropped)="dropOption($event)"
                data-test-id="create-poll-options-list"
              >
                @for (opt of getOptions(); track $index; let i = $index) {
                  <div
                    cdkDrag
                    class="flex items-center gap-1 rounded-lg border bg-muted/20 p-1 cdk-option-row"
                    [attr.data-test-id]="'create-poll-option-row-' + i"
                  >
                    <div
                      *cdkDragPlaceholder
                      class="flex items-center h-12.5 gap-3 rounded-lg border border-border/50 bg-input/30 p-3 opacity-[0.7]"
                    ></div>

                    <button
                      type="button"
                      cdkDragHandle
                      class="inline-flex h-10 w-8 items-center justify-center rounded-md text-muted-foreground cursor-grab active:cursor-grabbing"
                      aria-label="Reorder option"
                      [attr.data-test-id]="'create-poll-option-reorder-button-' + i"
                    >
                      <ng-icon name="hugeDragDropVertical" />
                    </button>

                    <input
                      [id]="'option' + i"
                      app-input
                      type="text"
                      [value]="getOptions()[i]"
                      (input)="updateOption(i, $event)"
                      placeholder="Enter option title"
                      class="flex-1 rounded!"
                      required
                      [attr.data-test-id]="'create-poll-option-input-' + i"
                    />

                    <button
                      app-button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="px-2! text-muted-foreground shrink-0 enabled:hover:text-destructive!"
                      aria-label="Remove option"
                      [disabled]="getOptions().length <= 2"
                      (click)="removeOption(i)"
                      [attr.data-test-id]="'create-poll-option-remove-button-' + i"
                    >
                      <ng-icon name="hugeCancel01" />
                    </button>
                  </div>
                }
              </div>

              @if (newPollForm.controls.options.touched && newPollForm.controls.options.errors) {
                <div
                  class="form-field-error"
                  role="alert"
                  aria-live="assertive"
                  data-test-id="create-poll-options-error-message"
                >
                  @if (newPollForm.controls.options.errors['minOptions']) {
                    <span>At least 2 options are required.</span>
                  }
                  @if (newPollForm.controls.options.errors['blankOptions']) {
                    <span>Please fill in all options.</span>
                  }
                </div>
              }

              <div class="flex justify-end">
                <button
                  app-button
                  type="button"
                  variant="outline"
                  (click)="addOption()"
                  data-test-id="create-poll-add-option-button"
                >
                  <ng-icon name="hugeAdd01" />
                  Add Option
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-xl border bg-surface p-5 shadow-xs sm:p-6">
            <div class="flex flex-col gap-4">
              <div class="flex items-start justify-between gap-4">
                <div class="flex flex-col gap-1">
                  <h2 class="text-base font-medium text-foreground">Allow multiple selections</h2>
                  <p class="text-sm text-muted-foreground">
                    Let voters choose more than one option for this poll.
                  </p>
                </div>

                <app-switch
                  [checked]="allowsMultipleSelections()"
                  (checkedChange)="onAllowMultipleSelectionsChange($event)"
                  data-test-id="create-poll-multiple-selections-switch"
                />
              </div>

              @if (allowsMultipleSelections()) {
                <div class="flex flex-col gap-2 sm:max-w-xs">
                  <label for="maxSelections" class="text-sm font-medium text-foreground">
                    Maximum selections
                  </label>
                  <input
                    id="maxSelections"
                    app-input
                    type="number"
                    min="1"
                    [max]="validOptionCount() || getOptions().length"
                    [value]="newPollForm.controls.maxSelections.value ?? ''"
                    (input)="onMaxSelectionsInput($event)"
                    placeholder="Leave blank to match the number of options"
                    data-test-id="create-poll-max-selections-input"
                  />
                  <p class="text-xs text-muted-foreground">
                    Leave this blank to match the number of options
                  </p>
                </div>
              }
            </div>
          </div>

          <div class="rounded-xl border bg-surface p-5 shadow-xs sm:p-6">
            <div class="flex items-start justify-between gap-4">
              <div class="flex flex-col gap-1">
                <h2 class="text-base font-medium text-foreground">Anonymous poll</h2>
                <p class="text-sm text-muted-foreground">
                  Enable anonymous voting to hide who submitted each vote.
                </p>
              </div>

              <app-switch formControlName="anonymous" data-test-id="create-poll-anonymous-switch" />
            </div>
          </div>

          <div class="rounded-xl border bg-surface p-5 shadow-xs sm:p-6">
            <div class="flex flex-col gap-2">
              <app-poll-department-section
                [departmentIds]="newPollForm.controls.departmentIds.value ?? []"
                (departmentIdsChange)="onDepartmentIdsChange($event)"
                [audience]="newPollForm.controls.audience.value ?? 'company-wide'"
                (audienceChange)="onAudienceChange($event)"
                (departmentNamesChange)="selectedDepartmentNames = $event"
                data-test-id="create-poll-department-section"
              />

              @if (
                newPollForm.controls.audience.touched &&
                newPollForm.controls.audience.errors?.['departmentRequired']
              ) {
                <div
                  class="form-field-error"
                  role="alert"
                  aria-live="assertive"
                  data-test-id="create-poll-audience-error-message"
                >
                  <span>Please select at least one department.</span>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            [ngpDialogTrigger]="submitDialog"
            app-button
            type="button"
            class="gap-2"
            data-test-id="create-poll-submit-button"
          >
            Submit
          </button>
        </div>
      </form>
    </div>

    <ng-template #submitDialog let-close="close">
      <app-dialog header="Create this poll?" data-test-id="create-poll-confirmation-dialog">
        <div class="space-y-4">
          <p class="text-sm text-muted-foreground">
            Review the details below before submitting your poll.
          </p>

          <div class="rounded-xl border bg-muted/30 p-4">
            <dl class="space-y-3 text-sm">
              <div class="space-y-1">
                <dt class="font-medium text-foreground">Question</dt>
                <dd class="text-muted-foreground">
                  {{ newPollForm.controls.question.value || 'No question provided' }}
                </dd>
              </div>

              <div class="space-y-1">
                <dt class="font-medium text-foreground">Description</dt>
                <dd class="text-muted-foreground">
                  {{ newPollForm.controls.description.value || 'No description provided' }}
                </dd>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <div class="space-y-1">
                  <dt class="font-medium text-foreground">Allow multiple selections</dt>
                  <dd class="text-muted-foreground">
                    {{ allowsMultipleSelections() ? 'Yes' : 'No' }}
                  </dd>
                </div>

                <div class="space-y-1">
                  <dt class="font-medium text-foreground">Max selections</dt>
                  <dd class="text-muted-foreground">
                    {{ resolvedMaxSelections() }}
                  </dd>
                </div>

                <div class="space-y-1">
                  <dt class="font-medium text-foreground">Voting</dt>
                  <dd class="text-muted-foreground">
                    {{ newPollForm.controls.anonymous.value ? 'Anonymous' : 'Not anonymous' }}
                  </dd>
                </div>

                <div class="space-y-1">
                  <dt class="font-medium text-foreground">Expires at</dt>
                  <dd class="text-muted-foreground">
                    {{ newPollForm.controls.expiresAt.value || 'No expiry selected' }}
                  </dd>
                </div>
              </div>

              <div class="space-y-1">
                <dt class="font-medium text-foreground">Audience</dt>
                <dd class="text-muted-foreground">
                  {{
                    newPollForm.controls.audience.value === 'department'
                      ? 'Specific department'
                      : 'Company-wide'
                  }}
                </dd>
              </div>

              @if (newPollForm.controls.audience.value === 'department') {
                <div class="space-y-1">
                  <dt class="font-medium text-foreground">Departments</dt>
                  <dd class="text-muted-foreground">
                    {{
                      selectedDepartmentNames.length
                        ? selectedDepartmentNames.join(', ')
                        : 'No departments selected'
                    }}
                  </dd>
                </div>
              }

              <div class="space-y-2">
                <dt class="font-medium text-foreground">Options</dt>
                <dd>
                  <ul
                    class="list-disc space-y-1 pl-5 text-muted-foreground"
                    data-test-id="create-poll-confirmation-options-list"
                  >
                    @for (option of getOptions(); track $index) {
                      <li [attr.data-test-id]="'create-poll-confirmation-option-' + $index">
                        {{ option || 'Untitled option' }}
                      </li>
                    }
                  </ul>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div slot="actions" class="justify-between flex" data-test-id="create-poll-dialog-actions">
          <button
            app-button
            type="button"
            variant="outline"
            (click)="close()"
            data-test-id="create-poll-cancel-button"
          >
            Cancel
          </button>
          <button
            app-button
            type="button"
            variant="primary"
            (click)="close(); submitPoll()"
            [disabled]="isSubmitting()"
            data-test-id="create-poll-confirm-button"
          >
            @if (isSubmitting()) {
              Creating...
            } @else {
              Confirm
            }
          </button>
        </div>
      </app-dialog>
    </ng-template>
  `,
  styles: `
    .cdk-drop-list-dragging .cdk-option-row:not(.cdk-drag-placeholder) {
      transition: transform 200ms ease;
    }

    .cdk-drag-animating {
      transition: transform 200ms ease;
    }

    .cdk-option-row.cdk-drag-preview {
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow:
        0 10px 15px -3px rgb(0 0 0 / 0.08),
        0 4px 6px -4px rgb(0 0 0 / 0.08);
    }

    .cdk-option-row.cdk-drag-placeholder {
      opacity: 0;
    }
  `,
})
export class CreatePollComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly pollService = inject(PollService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected newPollForm = this.formBuilder.group({
    question: ['', Validators.required],
    description: [''],
    maxSelections: [1 as number | null],
    anonymous: [true, Validators.required],
    expiresAt: ['', Validators.required],
    audience: ['company-wide' as PollAudience, Validators.required],
    departmentIds: [[] as number[]],
    options: [
      ['', ''],
      [Validators.required, Validators.min(2)],
    ],
  });

  protected error = '';
  protected selectedDepartmentNames: string[] = [];
  protected multipleSelectionsEnabled = false;
  protected readonly isSubmitting = signal(false);

  getOptions(): string[] {
    return this.newPollForm.controls.options.value ?? ['', ''];
  }

  allowsMultipleSelections(): boolean {
    return this.multipleSelectionsEnabled;
  }

  resolvedMaxSelections(): number {
    if (!this.allowsMultipleSelections()) {
      return 1;
    }

    const maxSelections = this.newPollForm.controls.maxSelections.value;
    return maxSelections ?? this.validOptionCount();
  }

  onAllowMultipleSelectionsChange(enabled: boolean) {
    this.multipleSelectionsEnabled = enabled;
    this.newPollForm.controls.maxSelections.setValue(enabled ? null : 1);
    this.cdr.markForCheck();
  }

  onMaxSelectionsInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value.trim();

    if (!rawValue) {
      this.newPollForm.controls.maxSelections.setValue(null);
      this.cdr.markForCheck();
      return;
    }

    const parsedValue = Number(rawValue);
    this.newPollForm.controls.maxSelections.setValue(
      Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null,
    );
    this.cdr.markForCheck();
  }

  updateOption(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const options = [...this.getOptions()];
    options[index] = input.value;
    this.newPollForm.controls.options.setValue(options);
  }

  onAudienceChange(audience: PollAudience) {
    this.newPollForm.controls.audience.setValue(audience);

    if (audience === 'company-wide') {
      this.newPollForm.controls.departmentIds.setValue([]);
      this.newPollForm.controls.audience.setErrors(null);
    }

    this.cdr.markForCheck();
  }

  onDepartmentIdsChange(departmentIds: number[]) {
    this.newPollForm.controls.departmentIds.setValue(departmentIds);

    if (departmentIds.length > 0) {
      this.newPollForm.controls.audience.setErrors(null);
    }

    this.cdr.markForCheck();
  }

  addOption() {
    const options = this.getOptions();
    this.newPollForm.controls.options.setValue([...options, '']);
    this.cdr.markForCheck();
  }

  dropOption(event: CdkDragDrop<string[]>) {
    const options = [...this.getOptions()];
    moveItemInArray(options, event.previousIndex, event.currentIndex);
    this.newPollForm.controls.options.setValue(options);
    this.cdr.markForCheck();
  }

  removeOption(index: number) {
    const options = [...this.getOptions()];

    if (options.length <= 2) {
      return;
    }

    options.splice(index, 1);
    this.newPollForm.controls.options.setValue(options);

    if (this.allowsMultipleSelections()) {
      const maxSelections = this.newPollForm.controls.maxSelections.value;
      const validOptions = options.filter((option: string) => option.trim()).length;

      if (maxSelections != null && validOptions > 0 && maxSelections > validOptions) {
        this.newPollForm.controls.maxSelections.setValue(validOptions);
      }
    }

    this.cdr.markForCheck();
  }

  clearForm() {
    this.newPollForm.reset({
      question: '',
      description: '',
      maxSelections: 1,
      anonymous: true,
      expiresAt: '',
      audience: 'company-wide',
      departmentIds: [],
      options: ['', ''],
    });
    this.error = '';
    this.selectedDepartmentNames = [];
    this.multipleSelectionsEnabled = false;
    this.cdr.markForCheck();
  }

  validOptionCount() {
    const options = this.getOptions();
    return options.filter((option: string) => option.trim()).length;
  }

  displayOptions() {
    const options = this.getOptions();
    return options.length > 0 ? options : ['', ''];
  }

  submitPoll() {
    const {
      question,
      description,
      maxSelections,
      anonymous,
      expiresAt,
      audience,
      departmentIds,
      options,
    } = this.newPollForm.getRawValue();

    const trimmedQuestion = (question ?? '').trim();
    const normalizedExpiresAt = expiresAt ? new Date(expiresAt).toISOString() : '';
    const normalizedOptions = (options ?? []).map((option: string) => option.trim());
    const validOptions = normalizedOptions.filter((option: string) => option.length > 0);
    const hasBlankOptions = normalizedOptions.some((option: string) => option.length === 0);
    const allowsMultipleSelections = this.allowsMultipleSelections();
    const resolvedMaxSelections = allowsMultipleSelections
      ? (maxSelections ?? validOptions.length)
      : 1;

    this.error = '';
    this.cdr.markForCheck();

    let hasErrors = false;

    if (!trimmedQuestion) {
      this.newPollForm.controls.question.markAsTouched();
      this.newPollForm.controls.question.setErrors({ required: true });
      hasErrors = true;
    }

    if (!normalizedExpiresAt) {
      this.newPollForm.controls.expiresAt.markAsTouched();
      this.newPollForm.controls.expiresAt.setErrors({ required: true });
      hasErrors = true;
    }

    if (validOptions.length < 2) {
      this.newPollForm.controls.options.markAsTouched();
      this.newPollForm.controls.options.setErrors({ minOptions: true });
      hasErrors = true;
    } else if (hasBlankOptions) {
      this.newPollForm.controls.options.markAsTouched();
      this.newPollForm.controls.options.setErrors({ blankOptions: true });
      hasErrors = true;
    }

    if (allowsMultipleSelections) {
      if (resolvedMaxSelections < 1) {
        hasErrors = true;
      }

      if (resolvedMaxSelections > validOptions.length) {
        hasErrors = true;
      }
    }

    if (audience === 'department' && (departmentIds?.length ?? 0) === 0) {
      this.newPollForm.controls.audience.markAsTouched();
      this.newPollForm.controls.audience.setErrors({ departmentRequired: true });
      hasErrors = true;
    }

    if (hasErrors) {
      this.cdr.markForCheck();
      return;
    }

    this.isSubmitting.set(true);

    this.newPollForm.controls.question.setValue(trimmedQuestion);
    this.newPollForm.controls.expiresAt.setValue(expiresAt ?? '');
    this.newPollForm.controls.options.setValue(validOptions);
    this.newPollForm.controls.maxSelections.setValue(resolvedMaxSelections);
    this.newPollForm.controls.question.updateValueAndValidity();
    this.newPollForm.controls.expiresAt.updateValueAndValidity();
    this.newPollForm.controls.options.updateValueAndValidity();
    this.newPollForm.controls.maxSelections.updateValueAndValidity();
    this.newPollForm.controls.audience.updateValueAndValidity();

    this.pollService
      .create({
        question: trimmedQuestion,
        description: description?.trim() ?? '',
        options: validOptions,
        maxSelections: resolvedMaxSelections,
        multipleChoice: allowsMultipleSelections,
        anonymous,
        expiresAt: normalizedExpiresAt,
        departmentIds: audience === 'department' ? (departmentIds ?? []) : [],
      })
      .subscribe({
        next: (res: any) => this.router.navigate(['/~/polls', res.id]),
        error: () => {
          this.isSubmitting.set(false);
          this.error = 'Failed to create poll. Please try again.';
          this.cdr.markForCheck();
        },
      });
  }
}
