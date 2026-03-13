import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeView, hugeSquareLock02, hugeUser, hugeCancel01 } from '@ng-icons/huge-icons';
import { User, Poll } from '@/models';
import { AuthService } from '@/services/auth.service';
import { ButtonComponent } from './primitives/button.component';
import { PollService } from '@/services/poll.service';

@Component({
  selector: 'app-poll-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, NgIcon, RouterLink],
  providers: [provideIcons({ hugeView, hugeSquareLock02, hugeUser, hugeCancel01 })],
  template: `
    <div
      class="bg-surface border shadow-xs rounded-xl p-3 sm:p-5 sm:py-6"
      [attr.data-test-id]="'poll-card-' + poll().id"
    >
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div class="flex items-center gap-1 mb-2">
            <div class="rounded-full bg-secondary border size-6 grid place-items-center">
              <ng-icon name="hugeUser" size="14px" />
            </div>
            <p class="text-xs text-muted-foreground flex items-center">
              {{ creatorLabel() }}
              @if (userIsOwner()) {
                <span class="px-1 py-0.5 ml-1 rounded-md bg-muted">me</span>
              }
            </p>
            <span
              class="ml-auto text-[10px] font-medium uppercase px-2 py-0.5 rounded-full"
              [class.bg-green-100]="poll().status === 'ACTIVE'"
              [class.text-green-700]="poll().status === 'ACTIVE'"
              [class.bg-muted]="poll().status !== 'ACTIVE'"
              [class.text-muted-foreground]="poll().status !== 'ACTIVE'"
            >
              {{ poll().status }}
            </span>
          </div>
          <h2>
            @if (userIsOwner()) {
              <a
                [routerLink]="['/~/polls', poll().id]"
                class="text-base font-medium text-foreground transition-colors hover:underline"
                [attr.data-test-id]="'poll-card-details-link-' + poll().id"
              >
                {{ poll().question }}
              </a>
            } @else {
              <p
                class="text-base font-medium text-foreground"
                [attr.data-test-id]="'poll-title-text-' + poll().id"
              >
                {{ poll().question }}
              </p>
            }
          </h2>

          @if (poll().description) {
            <p class="mt-1 text-sm text-muted-foreground">{{ poll().description }}</p>
          }
        </div>

        @if (userIsOwner()) {
          <button
            app-button
            type="button"
            variant="outline"
            size="md"
            class="size-9! p-0! rounded-lg!"
            aria-label="View results"
            title="View results"
            [routerLink]="['/~/polls', poll().id]"
            [attr.data-test-id]="'poll-card-view-results-button-' + poll().id"
          >
            <ng-icon name="hugeView" />
          </button>
        }
      </div>

      <ul class="mt-4 space-y-3" [attr.data-test-id]="'poll-card-options-list-' + poll().id">
        @for (opt of poll().options; track opt.id) {
          <li [attr.data-test-id]="'poll-card-option-item-' + poll().id + '-' + opt.id">
            <div
              [class.border-primary]="selections().includes(opt.id)"
              [class.opacity-50]="maxSelectionsReached() && !selections().includes(opt.id)"
              [class.cursor-not-allowed]="maxSelectionsReached() && !selections().includes(opt.id)"
              [class.pointer-events-none]="maxSelectionsReached() && !selections().includes(opt.id)"
              class="gap-3 text-left px-3 h-12 pr-2 rounded-md text-xs w-full flex items-center justify-between font-normal border hover:border-primary/40"
              (click)="addSelection(opt.id)"
            >
              <span class="text-foreground">{{ opt.text }}</span>
              @if (selections().includes(opt.id)) {
                <div class="flex items-center gap-1">
                  <button
                    app-button
                    variant="outline"
                    size="sm"
                    class="size-9! p-0!"
                    (click)="removeSelection(opt.id); $event.stopPropagation()"
                  >
                    <ng-icon name="hugeCancel01" />
                  </button>
                </div>
              }
            </div>
          </li>
        }
        @if (selections().length > 0) {
          <div class="text-xs text-muted-foreground mt-2">
            {{ selections().length }} selected (max {{ poll().maxSelections }})
          </div>
        }
        @if (voteError()) {
          <p class="text-sm text-red-600 mt-1">{{ voteError() }}</p>
        }
        @if (selections().length > 0) {
          <button app-button variant="primary" (click)="castVote()" [disabled]="isSubmitting()">
            @if (isSubmitting()) {
              Submitting...
            } @else {
              Submit
            }
          </button>
        }
      </ul>
    </div>
  `,
})
export class PollCardComponent implements OnInit {
  currentUser = signal<User | null>(null);

  readonly poll = input.required<Poll>();

  private authService = inject(AuthService);
  readonly pollService = inject(PollService);

  protected readonly selections = signal<number[]>([]);
  protected readonly isSubmitting = signal(false);
  protected readonly voteError = signal<string | null>(null);

  protected readonly maxSelectionsReached = computed(() => {
    const poll = this.poll();
    const currentSelections = this.selections();
    return currentSelections.length >= poll.maxSelections;
  });

  protected addSelection(opt: number) {
    if (this.maxSelectionsReached() && !this.selections().includes(opt)) {
      return;
    }
    this.selections.update((prev) => [...prev, opt]);
  }

  protected removeSelection(opt: number) {
    this.selections.update((prev) => prev.filter((id) => id !== opt));
  }

  protected readonly creatorLabel = computed(() => {
    const poll = this.poll();
    return poll.creatorName;
  });

  protected castVote() {
    if (!this.selections() || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.voteError.set(null);
    this.pollService.castVote(this.poll().id, this.selections()!).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.selections.set([]);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        if (error.status === 409) {
          this.voteError.set('You have already voted on this poll.');
        } else {
          this.voteError.set('Failed to submit vote. Please try again.');
        }
      },
    });
  }

  protected userIsOwner = computed(() => {
    const poll = this.poll();
    return poll.creatorEmail === this.currentUser()?.email;
  });

  ngOnInit() {
    this.authService.getProfile().subscribe({
      next: (user) => {
        this.currentUser.set(user);
      },
    });
  }
}
