import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { PollService } from '@/services/poll.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { NgpDialogTrigger } from 'ng-primitives/dialog';
import { heroBars3, heroTrash } from '@ng-icons/heroicons/outline';
import { InputComponent } from '@/components/ui/primitives/input.component';
import { TextareaComponent } from '@/components/ui/primitives/textarea.component';
import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { CheckboxComponent } from '@/components/ui/primitives/checkbox.component';
import { ContentHeaderComponent } from '@/components/ui/content-header.component';
import { DialogComponent } from '@/components/ui/primitives/dialog.component';
import { PollDepartmentSectionComponent } from '@/components/ui/poll-department-section.component';

@Component({
  selector: 'app-create-poll',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonComponent,
    InputComponent,
    TextareaComponent,
    CheckboxComponent,
    ContentHeaderComponent,
    DialogComponent,
    PollDepartmentSectionComponent,
    NgIcon,
    NgpDialogTrigger,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
  ],
  providers: [provideIcons({ heroTrash, heroBars3 })],
  template: `
    <app-content-header pageTitle="Create Poll">
      <div class="flex items-center gap-3">
        <button [ngpDialogTrigger]="clearDialog" app-button type="button" variant="outline">
          Clear
        </button>
        <button [ngpDialogTrigger]="submitDialog" app-button class="gap-2">Submit</button>
      </div>
    </app-content-header>

    <div class="maxview-container lg:max-w-4xl p-5">
      @if (error) {
        <div class="mb-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p class="text-sm font-medium text-destructive">{{ error }}</p>
        </div>
      }

      <form class="flex flex-col gap-5">
        <div class="grid gap-5">
          <div class="rounded-xl border bg-surface p-5 shadow-xs sm:p-6">
            <div class="flex flex-col gap-6">
              <div class="flex flex-col gap-2">
                <label for="question" class="text-sm font-medium text-foreground">Question</label>
                <input
                  id="question"
                  app-input
                  type="text"
                  [(ngModel)]="question"
                  name="question"
                  placeholder="What would you like to ask?"
                  required
                />
              </div>

              <div class="flex flex-col gap-2">
                <label for="description" class="text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  id="description"
                  app-textarea
                  [(ngModel)]="description"
                  name="description"
                  rows="5"
                  placeholder="Add more context for voters (optional)"
                  class="min-h-28 resize-none"
                ></textarea>
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
                [cdkDropListData]="options"
                class="flex flex-col gap-3"
                (cdkDropListDropped)="dropOption($event)"
              >
                @for (opt of options; track $index; let i = $index) {
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
                        <ng-icon name="heroBars3" />
                      </div>

                      <div class="h-10 flex-1 rounded-md border border-border/60 bg-input/70"></div>

                      <div
                        class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground"
                      >
                        <ng-icon name="heroTrash" />
                      </div>
                    </div>

                    <button
                      type="button"
                      cdkDragHandle
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground cursor-grab active:cursor-grabbing active:text-blue-500"
                      aria-label="Reorder option"
                    >
                      <ng-icon name="heroBars3" />
                    </button>

                    <input
                      [id]="'option' + i"
                      app-input
                      type="text"
                      [(ngModel)]="options[i]"
                      [name]="'option' + i"
                      placeholder="Enter option title"
                      class="flex-1 rounded-md!"
                      required
                    />

                    <button
                      app-button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="px-2! text-muted-foreground shrink-0"
                      aria-label="Remove option"
                      [disabled]="options.length <= 2"
                      (click)="removeOption(i)"
                    >
                      <ng-icon name="heroTrash" />
                    </button>
                  </div>
                }
              </div>

              <label
                class="flex items-start gap-3 rounded-lg border bg-muted/20 px-4 py-3 text-sm text-foreground"
              >
                <app-checkbox [(ngModel)]="multipleChoice" name="multipleChoice" class="mt-0.5" />
                <span>
                  <span class="block font-medium">Allow multiple selections</span>
                  <span class="block text-muted-foreground">
                    Voters will be able to choose more than one option.
                  </span>
                </span>
              </label>

              <div class="flex justify-end">
                <button app-button type="button" variant="outline" (click)="addOption()">
                  Add Option
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-xl border bg-surface p-5 shadow-xs sm:p-6">
            <!-- <div>
                <h2 class="text-base font-medium text-foreground">Settings</h2>
                <p class="text-sm text-muted-foreground">
                  Configure how people can respond to this poll.
                </p>
              </div> -->

            <app-poll-department-section [(departmentId)]="selectedDepartmentId" />
          </div>
        </div>
      </form>
    </div>

    <ng-template #clearDialog let-close="close">
      <app-dialog header="Clear form?">
        This will remove your current question, description, department selection, and options.
        <div class="mt-4 flex justify-end gap-3">
          <button app-button type="button" variant="outline" (click)="close()">Keep Editing</button>
          <button app-button type="button" variant="destructive" (click)="clearForm(); close()">
            Clear
          </button>
        </div>
      </app-dialog>
    </ng-template>

    <ng-template #submitDialog let-close="close">
      <app-dialog header="Create this poll?">
        This will submit your poll with the current question, department, and options.
        <div class="mt-4 flex justify-end gap-3">
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
  question = '';
  description = '';
  multipleChoice = false;
  selectedDepartmentId: number | null = null;
  options = ['', ''];
  error = '';

  private readonly pollService = inject(PollService);
  private readonly router = inject(Router);

  addOption() {
    this.options.push('');
  }

  dropOption(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.options, event.previousIndex, event.currentIndex);
  }

  removeOption(index: number) {
    if (this.options.length <= 2) {
      return;
    }

    this.options.splice(index, 1);
  }

  clearForm() {
    this.question = '';
    this.description = '';
    this.multipleChoice = false;
    this.selectedDepartmentId = null;
    this.options = ['', ''];
    this.error = '';
  }

  validOptionCount() {
    return this.options.filter((option) => option.trim()).length;
  }

  displayOptions() {
    return this.options.length > 0 ? this.options : ['', ''];
  }

  submitPoll() {
    const validOptions = this.options.filter((o) => o.trim());

    if (validOptions.length < 2) {
      this.error = 'At least 2 options required';
      return;
    }

    this.pollService
      .create({
        question: this.question,
        description: this.description,
        options: validOptions,
        multipleChoice: this.multipleChoice,
        departmentId: this.selectedDepartmentId,
      })
      .subscribe({
        next: () => this.router.navigate(['/~/polls']),
        error: () => (this.error = 'Failed to create poll'),
      });
  }
}
