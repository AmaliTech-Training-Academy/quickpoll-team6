import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeView, hugeSquareLock02 } from '@ng-icons/huge-icons';
import { ButtonComponent } from './primitives/button.component';

type PollOption = {
  id: string | number;
  text?: string;
  option_text?: string;
  percentage: number;
};

type Poll = {
  id: number;
  question: string;
  description?: string | null;
  creatorName?: string | null;
  creator_name?: string | null;
  totalVotes?: number | null;
  total_votes?: number | null;
  options: PollOption[];
  departmentId?: number | null;
  department_id?: number | null;
  departmentName?: string | null;
  department_name?: string | null;
  department?: { id?: number | null; name?: string | null } | string | null;
};

@Component({
  selector: 'app-poll-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, ButtonComponent, NgIcon, RouterLink],
  providers: [provideIcons({ hugeView, hugeSquareLock02 })],
  template: `
    <div
      class="bg-surface border shadow-xs rounded-xl p-3 sm:p-5 sm:py-6"
      [attr.data-test-id]="'poll-card-' + poll().id"
    >
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2>
            <a
              [routerLink]="['/~/polls', poll().id]"
              class="text-base font-medium text-foreground transition-colors hover:underline"
              [attr.data-test-id]="'poll-card-details-link-' + poll().id"
            >
              {{ poll().question }}
            </a>
          </h2>

          @if (poll().description) {
            <p class="mt-1 text-sm text-muted-foreground">{{ poll().description }}</p>
          }

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <p class="text-xs text-muted-foreground">
              by {{ creatorLabel() }} &bull; {{ totalVotesLabel() }} votes
            </p>

            <!-- <span
              class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none"
              [class.border-border]="!isDepartmentAudience()"
              [class.text-muted-foreground]="!isDepartmentAudience()"
              [class.bg-muted/30]="!isDepartmentAudience()"
              [class.border-primary/20]="isDepartmentAudience()"
              [class.text-primary]="isDepartmentAudience()"
              [class.bg-primary/5]="isDepartmentAudience()"
            >
              {{ audienceLabel() }}
            </span> -->
          </div>
        </div>

        <div class="flex items-center gap-2 md:shrink-0">
          <button
            app-button
            type="button"
            variant="outline"
            size="md"
            class="size-9! p-0! rounded-lg!"
            aria-label="View results"
            title="View results"
            [attr.data-test-id]="'poll-card-view-results-button-' + poll().id"
          >
            <ng-icon name="hugeView" />
          </button>
          <button
            app-button
            type="button"
            variant="outline"
            size="md"
            class="size-9! p-0! rounded-lg!"
            aria-label="Close poll"
            title="Close poll"
            [attr.data-test-id]="'poll-card-close-button-' + poll().id"
          >
            <ng-icon name="hugeSquareLock02" />
          </button>
        </div>
      </div>

      <ul class="mt-4 space-y-3" [attr.data-test-id]="'poll-card-options-list-' + poll().id">
        @for (opt of poll().options; track opt.id) {
          <li
            class="rounded-lg border border-border/60 bg-muted/30 p-3"
            [attr.data-test-id]="'poll-card-option-item-' + poll().id + '-' + opt.id"
          >
            <div class="mb-2 flex items-center justify-between gap-3 text-xs">
              <span class="text-foreground">{{ optionLabel(opt) }}</span>
              <!-- <span class="text-muted-foreground">{{ opt.percentage | number: '1.0-1' }}%</span> -->
            </div>
            <!-- <div class="h-2 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full bg-primary transition-all"
                [style.width.%]="opt.percentage"
              ></div>
            </div> -->
          </li>
        }
      </ul>
    </div>
  `,
})
export class PollCardComponent {
  readonly poll = input.required<Poll>();

  protected readonly departmentName = computed(() => {
    // const poll = this.poll();

    return ""
  });

  protected readonly hasDepartmentId = computed(() => {
    const poll = this.poll();

    if (typeof poll.department === 'object' && poll.department?.id != null) {
      return true;
    }

    return poll.departmentId != null || poll.department_id != null;
  });

  protected readonly isDepartmentAudience = computed(
    () => this.departmentName() !== null || this.hasDepartmentId(),
  );

  protected readonly audienceLabel = computed(() => {
    const departmentName = this.departmentName();

    if (departmentName) {
      return departmentName;
    }

    if (this.hasDepartmentId()) {
      return 'Department';
    }

    return 'Company';
  });

  protected readonly creatorLabel = computed(() => {
    const poll = this.poll();
    return poll.creatorName;
  });

  protected readonly totalVotesLabel = computed(() => {
    const poll = this.poll();
    return poll.totalVotes ?? poll.total_votes ?? 0;
  });

  protected optionLabel(option: PollOption): string {
    return option.text ?? '';
  }
}
