import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  input,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeView, hugeSquareLock02, hugeUser } from '@ng-icons/huge-icons';
import { User, Poll, PollOption } from '@/models';
import { AuthService } from '@/services/auth.service';
import { ButtonComponent } from './primitives/button.component';

@Component({
  selector: 'app-poll-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, NgIcon, RouterLink],
  providers: [provideIcons({ hugeView, hugeSquareLock02, hugeUser })],
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
            <button
              app-button
              variant="outline"
              class="gap-3 text-xs w-full justify-start! font-normal!"
            >
              <span class="text-foreground">{{ optionLabel(opt) }}</span>
            </button>
          </li>
        }
      </ul>
    </div>
  `,
})
export class PollCardComponent implements OnInit {
  readonly poll = input.required<Poll>();
  currentUser: User | null = null;
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  protected readonly creatorLabel = computed(() => {
    const poll = this.poll();
    return poll.creatorName;
  });

  protected optionLabel(option: PollOption): string {
    return option.text;
  }

  protected userIsOwner = computed(() => {
    const poll = this.poll();
    return poll.creatorEmail === this.currentUser?.email;
  });

  ngOnInit() {
    this.authService.getProfile().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.cdr.markForCheck();
      },
    });
  }
}
