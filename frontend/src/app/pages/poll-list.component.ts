import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeAdd01 } from '@ng-icons/huge-icons';
import { User } from '@/models';
import { PollService } from '@/services/poll.service';
import { AuthService } from '@/services/auth.service';
import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { ContentHeaderComponent } from '@/components/ui/content-header.component';
import { PollCardComponent } from '@/components/ui/poll-card.component';
import { SecondaryNavbarComponent } from '@/components/ui/navbar.component';
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
    SecondaryNavbarComponent,
  ],
  providers: [provideIcons({ hugeAdd01 })],
  template: `
    <app-content-header pageTitle="Polls">
      <button app-button routerLink="/~/polls/new" class="gap-2">
        <ng-icon name="hugeAdd01" />
        Create Poll
      </button>
    </app-content-header>

    <div class="maxview-container p-5">
      <app-secondary-navbar [navLinks]="navLinks" />
      <div class="flex flex-col space-y-10">
        @if (loading) {
          @for (skeleton of [1, 2, 3, 4]; track skeleton) {
            <app-poll-card-skeleton></app-poll-card-skeleton>
          }
        } @else if (filteredPolls.length === 0) {
          <p>No polls found for this filter.</p>
        } @else {
          @for (poll of filteredPolls; track poll.id) {
            <app-poll-card [poll]="poll"></app-poll-card>
          }
        }
      </div>
    </div>
  `,
})
export class PollListComponent implements OnInit {
  polls: any[] = [];
  filteredPolls: any[] = [];
  loading = true;
  currentFilter: PollFilter = 'all';
  currentUser: User | null = null;

  protected navLinks = [
    { label: 'All', path: '/~/polls', queryParams: { filter: 'all' } },
    { label: 'Active Polls', path: '/~/polls', queryParams: { filter: 'active' } },
    { label: 'My Department', path: '/~/polls', queryParams: { filter: 'department' } },
    { label: 'Created by Me', path: '/~/polls', queryParams: { filter: 'me' } },
  ];

  private pollService = inject(PollService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      const filter = params.get('filter');

      if (!filter) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { filter: 'all' },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        return;
      }

      this.currentFilter = this.isValidFilter(filter) ? filter : 'all';

      if (!this.isValidFilter(filter)) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { filter: 'all' },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
      this.applyFilter();
      this.cdr.markForCheck();
    });

    this.authService.getProfile().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.applyFilter();
        this.cdr.markForCheck();
      },
    });

    this.pollService.getAll().subscribe({
      next: (res) => {
        this.polls = res.content || [];
        this.loading = false;
        this.applyFilter();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private applyFilter() {
    this.filteredPolls = this.polls.filter((poll) => {
      switch (this.currentFilter) {
        case 'active':
          return poll.active === true;
        case 'department':
          return this.isInMyDepartment(poll);
        case 'me':
          return this.isCreatedByMe(poll);
        case 'all':
        default:
          return true;
      }
    });
  }

  private isCreatedByMe(poll: any) {
    if (!this.currentUser) {
      return false;
    }

    return (
      poll.creatorId === this.currentUser.id ||
      poll.creator_id === this.currentUser.id ||
      poll.creatorName === this.currentUser.fullName
    );
  }

  private isInMyDepartment(poll: any) {
    if (!this.currentUser) {
      return false;
    }

    return (
      poll.departmentId === (this.currentUser as any).departmentId ||
      poll.department_id === (this.currentUser as any).department_id
    );
  }

  private isValidFilter(filter: string): filter is PollFilter {
    return filter === 'all' || filter === 'active' || filter === 'department' || filter === 'me';
  }
}

type PollFilter = 'all' | 'active' | 'department' | 'me';
