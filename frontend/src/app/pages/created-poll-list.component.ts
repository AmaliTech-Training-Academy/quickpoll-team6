import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeAdd01 } from '@ng-icons/huge-icons';
import { Poll, User } from '@/models';
import { PollService } from '@/services/poll.service';
import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { ContentHeaderComponent } from '@/components/ui/content-header.component';
import { PollCardComponent } from '@/components/ui/poll-card.component';
import { PollCardSkeletonComponent } from '@/components/ui/poll-card-skeleton.component';

@Component({
  selector: 'app-poll-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgIcon,
    ButtonComponent,
    ContentHeaderComponent,
    PollCardComponent,
    PollCardSkeletonComponent,
  ],
  providers: [provideIcons({ hugeAdd01 })],
  template: `
    <app-content-header pageTitle="Polls">
      <button
        app-button
        routerLink="/~/polls/new"
        class="gap-2"
        data-test-id="poll-list-create-button"
      >
        <ng-icon name="hugeAdd01" />
        Create Poll
      </button>
    </app-content-header>

    <div class="maxview-container p-5" data-test-id="poll-list-page">
      <div class="mb-4">
        <button app-button variant="secondary" size="sm" routerLink="/~/polls">Back</button>
      </div>
      <div class="flex flex-col space-y-10" data-test-id="poll-list">
        @if (loading) {
          @for (skeleton of [1, 2, 3, 4]; track skeleton) {
            <app-poll-card-skeleton data-test-id="poll-list-skeleton"></app-poll-card-skeleton>
          }
        } @else if (polls.length === 0) {
          <p data-test-id="poll-list-empty-state">No polls found for this filter.</p>
        } @else {
          @for (poll of polls; track poll.id) {
            <app-poll-card [poll]="poll" [attr.data-test-id]="'poll-card-' + poll.id" />
          }
          @if (loadingMore()) {
            <app-poll-card-skeleton data-test-id="poll-list-loading-more"></app-poll-card-skeleton>
          }
        }
      </div>
    </div>
  `,
})
export class CreatedPollListComponent implements OnInit {
  polls: Poll[] = [];
  loading = true;
  currentUser: User | null = null;

  private currentPage = 0;
  private readonly pageSize = 10;
  protected readonly loadingMore = signal(false);
  protected readonly hasMorePages = signal(true);

  private pollService = inject(PollService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.loadPolls();
  }

  private loadPolls(page: number = 0): void {
    if (page === 0) {
      this.loading = true;
    } else {
      this.loadingMore.set(true);
    }
    this.cdr.markForCheck();

    this.pollService.getUserCreatedPolls(page, this.pageSize).subscribe({
      next: (res) => {
        const newPolls = res.content || [];

        if (page === 0) {
          this.polls = newPolls;
          this.loading = false;
        } else {
          this.polls = [...this.polls, ...newPolls];
          this.loadingMore.set(false);
        }

        this.currentPage = page;
        this.hasMorePages.set(newPolls.length === this.pageSize);
        this.cdr.markForCheck();
      },
      error: () => {
        if (page === 0) {
          this.loading = false;
        } else {
          this.loadingMore.set(false);
        }
        this.cdr.markForCheck();
      },
    });
  }

  protected loadMore(): void {
    if (this.loadingMore() || !this.hasMorePages()) {
      return;
    }
    this.loadPolls(this.currentPage + 1);
  }

  @HostListener('window:scroll', [])
  protected onScroll(): void {
    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    const threshold = 200;

    if (scrollPosition >= documentHeight - threshold) {
      this.loadMore();
    }
  }
}
