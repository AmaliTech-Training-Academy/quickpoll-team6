import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { PollService } from '@/services/poll.service';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { NgpDialogTrigger } from 'ng-primitives/dialog';
import {
  hugeAdd01,
  hugeAlertCircle,
  hugeCancel01,
  hugeDragDropVertical,
} from '@ng-icons/huge-icons';
import { InputComponent } from '@/components/ui/primitives/input.component';
import { TextareaComponent } from '@/components/ui/primitives/textarea.component';
import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { SwitchComponent } from '@/components/ui/primitives/switch.component';
import { RadioGroupComponent } from '@/components/ui/primitives/radio-group.component';
import { RadioItemComponent } from '@/components/ui/primitives/radio-item.component';
import { ContentHeaderComponent } from '@/components/ui/content-header.component';
import { DialogComponent } from '@/components/ui/primitives/dialog.component';
import { PollDepartmentSectionComponent } from '@/components/ui/poll-department-section.component';

@Component({
  selector: 'app-create-poll',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    TextareaComponent,
    SwitchComponent,
    RadioGroupComponent,
    RadioItemComponent,
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
    <app-content-header pageTitle="Create Poll">
      <div class="flex items-center gap-3">
        <button [ngpDialogTrigger]="clearDialog" app-button type="button" variant="outline">
          Clear
        </button>
      </div>
    </app-content-header>

    <div class="maxview-container lg:max-w-4xl p-5">
      @if (error) {
        <div
          class="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3"
        >
          <ng-icon
            name="hugeAlertCircle"
            color="var(--destructive)"
            size="18px"
            class=" shrink-0 text-destructive"
          />
          <p class="text-sm text-destructive">{{ error }}</p>
        </div>
      }

      <form id="create-poll-form" [formGroup]="newPollForm" class="flex flex-col gap-5">
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
                />
                @if (
                  newPollForm.controls.question.touched && newPollForm.controls.question.errors
                ) {
                  <div class="form-field-error" role="alert" aria-live="assertive">
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
                  rows="5"
                  placeholder="Add more context for voters (optional)"
                  class="min-h-28 resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          <div class="rounded-xl border bg-surface p-5 shadow-xs sm:p-6">
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-1">
                <h2 class="text-base font-medium text-foreground">Question type</h2>
                <p class="text-sm text-muted-foreground">
                  Choose whether voters can select one option or multiple options.
                </p>
              </div>

              <app-radio-group formControlName="selectionType" class="grid! sm:grid-cols-2! gap-3">
                <app-radio-item value="single">
                  <span class="block text-sm font-medium text-inherit">Single select</span>
                  <span class="mt-1 block text-xs text-muted-foreground">
                    Voters can choose only one option.
                  </span>
                </app-radio-item>

                <app-radio-item value="multiple">
                  <span class="block text-sm font-medium text-inherit">Multi select</span>
                  <span class="mt-1 block text-xs text-muted-foreground">
                    Voters can choose more than one option.
                  </span>
                </app-radio-item>
              </app-radio-group>
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
              >
                @for (opt of getOptions(); track $index; let i = $index) {
                  <div
                    cdkDrag
                    class="flex items-center gap-1 rounded-lg border bg-muted/20 p-1 cdk-option-row"
                  >
                    <div
                      *cdkDragPlaceholder
                      class="flex items-center gap-3 rounded-lg border border-border bg-surface/70 p-3 opacity-70"
                    >
                      <div
                        class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                      >
                        <ng-icon name="hugeDragDropVertical" />
                      </div>

                      <div class="h-10 flex-1 rounded-md border border-border/60 bg-input/70"></div>

                      <div
                        class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground"
                      >
                        <ng-icon name="hugeCancel01" />
                      </div>
                    </div>

                    <button
                      type="button"
                      cdkDragHandle
                      class="inline-flex h-10 w-8 items-center justify-center rounded-md text-muted-foreground cursor-grab active:cursor-grabbing"
                      aria-label="Reorder option"
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
                      class="flex-1 rounded-md!"
                      required
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
                    >
                      <ng-icon name="hugeCancel01" />
                    </button>
                  </div>
                }
              </div>

              @if (newPollForm.controls.options.touched && newPollForm.controls.options.errors) {
                <div class="form-field-error" role="alert" aria-live="assertive">
                  @if (newPollForm.controls.options.errors['minOptions']) {
                    <span>At least 2 options are required.</span>
                  }
                  @if (newPollForm.controls.options.errors['blankOptions']) {
                    <span>Please fill in all options.</span>
                  }
                </div>
              }

              <div class="flex justify-end">
                <button app-button type="button" variant="outline" (click)="addOption()">
                  <ng-icon name="hugeAdd01" />
                  Add Option
                </button>
              </div>
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

              <app-switch formControlName="anonymous" />
            </div>
          </div>

          <div class="rounded-xl border bg-surface p-5 shadow-xs sm:p-6">
            <app-poll-department-section
              [departmentId]="newPollForm.controls.departmentId.value"
              (departmentIdChange)="newPollForm.controls.departmentId.setValue($event)"
            />
          </div>
        </div>

        <div class="flex justify-end">
          <button [ngpDialogTrigger]="submitDialog" app-button type="button" class="gap-2">
            Submit
          </button>
        </div>
      </form>
    </div>

    <ng-template #clearDialog let-close="close">
      <app-dialog header="Clear form?">
        This will remove your current question, description, department selection, and options.
        <div slot="actions">
          <div class="flex justify-between">
            <button app-button type="button" variant="outline" (click)="close()">
              Keep Editing
            </button>
            <button app-button type="button" variant="destructive" (click)="clearForm(); close()">
              Clear
            </button>
          </div>
        </div>
      </app-dialog>
    </ng-template>

    <ng-template #submitDialog let-close="close">
      <app-dialog header="Create this poll?">
        This will submit your poll with the current question, department, and options.
        <div slot="actions" class="justify-between flex">
          <button app-button type="button" variant="outline" (click)="close()">Cancel</button>
          <button app-button type="button" variant="primary" (click)="close(); submitPoll()">
            Confirm
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
    selectionType: ['single' as 'single' | 'multiple', Validators.required],
    anonymous: [true, Validators.required],
    departmentId: [null as number | null],
    options: [
      ['', ''],
      [Validators.required, Validators.min(2)],
    ],
  });
  error = '';

  getOptions(): string[] {
    return this.newPollForm.controls.options.value ?? ['', ''];
  }

  updateOption(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const options = [...this.getOptions()];
    options[index] = input.value;
    this.newPollForm.controls.options.setValue(options);
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
    this.cdr.markForCheck();
  }

  clearForm() {
    this.newPollForm.reset({
      question: '',
      description: '',
      selectionType: 'single',
      anonymous: true,
      departmentId: null,
      options: ['', ''],
    });
    this.error = '';
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
    const { question, description, selectionType, anonymous, departmentId, options } =
      this.newPollForm.getRawValue();

    const trimmedQuestion = (question ?? '').trim();
    const normalizedOptions = (options ?? []).map((option: string) => option.trim());
    const validOptions = normalizedOptions.filter((option: string) => option.length > 0);
    const hasBlankOptions = normalizedOptions.some((option: string) => option.length === 0);

    this.error = '';
    this.cdr.markForCheck();

    let hasErrors = false;

    if (!trimmedQuestion) {
      this.newPollForm.controls.question.markAsTouched();
      this.newPollForm.controls.question.setErrors({ required: true });
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

    if (hasErrors) {
      this.cdr.markForCheck();
      return;
    }

    this.newPollForm.controls.question.setValue(trimmedQuestion);
    this.newPollForm.controls.options.setValue(validOptions);
    this.newPollForm.controls.question.updateValueAndValidity();
    this.newPollForm.controls.options.updateValueAndValidity();

    this.pollService
      .create({
        question: trimmedQuestion,
        description: description?.trim() ?? '',
        options: validOptions,
        multipleChoice: selectionType === 'multiple',
        anonymous,
        departmentId,
      })
      .subscribe({
        next: (res: any) => this.router.navigate(['/~/polls', res.id]),
        error: (err: unknown) => {
          this.error = 'Failed to create poll. Please try again.';
          this.cdr.markForCheck();
        },
      });
  }
}
