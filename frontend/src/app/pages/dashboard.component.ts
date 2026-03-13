import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';
import {
  DonutChartComponent,
  BarChartComponent,
  BulletLegendItemInterface,
} from 'angular-chrts';

import { DashboardService } from '@/services/dashboard.service';
import { DepartmentService } from '@/services/department.service';
import { AuthService } from '@/services/auth.service';
import { ContentHeaderComponent } from '@/components/ui/content-header.component';
import { InputComponent } from '@/components/ui/primitives/input.component';
import { TextareaComponent } from '@/components/ui/primitives/textarea.component';
import { ButtonComponent } from '@/components/ui/primitives/button.component';
import {
  DashboardSummary,
  ActivePollItem,
  RecentResultItem,
  TopUser,
  User,
  Department,
  DepartmentResponse,
} from '@/models';

interface PollVoteRow {
  poll: string;
  votes: number;
}

interface UserVoteRow {
  user: string;
  votesCast: number;
  pollsJoined: number;
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ContentHeaderComponent,
    RouterLink,
    DatePipe,
    DecimalPipe,
    FormsModule,
    InputComponent,
    TextareaComponent,
    ButtonComponent,
    DonutChartComponent,
    BarChartComponent,
  ],
  template: `
    <app-content-header pageTitle="Dashboard" />

    <div class="maxview-container p-5 space-y-6">
      @if (loading()) {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="bg-surface border rounded-xl p-5 animate-pulse">
              <div class="h-4 bg-muted rounded w-2/3 mb-3"></div>
              <div class="h-8 bg-muted rounded w-1/2"></div>
            </div>
          }
        </div>
        <div class="grid lg:grid-cols-2 gap-4">
          <div class="h-72 bg-surface border rounded-xl animate-pulse"></div>
          <div class="h-72 bg-surface border rounded-xl animate-pulse"></div>
        </div>
      } @else if (error()) {
        <div class="text-center py-12">
          <p class="text-muted-foreground">{{ error() }}</p>
          <button
            class="mt-4 text-sm underline text-primary"
            (click)="loadDashboard()"
          >
            Retry
          </button>
        </div>
      } @else {
        <!-- KPI Cards Row -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div class="bg-surface border rounded-xl p-5">
            <p class="text-xs text-muted-foreground uppercase tracking-wide">Participation</p>
            <p class="text-3xl font-semibold mt-1">
              {{ summary()?.averageParticipationRate | number: '1.0-1' }}
              <span class="text-base font-normal text-muted-foreground">%</span>
            </p>
          </div>
          <div class="bg-surface border rounded-xl p-5">
            <p class="text-xs text-muted-foreground uppercase tracking-wide">Active Polls</p>
            <p class="text-3xl font-semibold mt-1 text-green-600">{{ summary()?.activePollCount ?? 0 }}</p>
          </div>
          <div class="bg-surface border rounded-xl p-5">
            <p class="text-xs text-muted-foreground uppercase tracking-wide">Closed Polls</p>
            <p class="text-3xl font-semibold mt-1 text-muted-foreground">{{ summary()?.closedPollCount ?? 0 }}</p>
          </div>
          <div class="bg-surface border rounded-xl p-5">
            <p class="text-xs text-muted-foreground uppercase tracking-wide">Total Votes</p>
            <p class="text-3xl font-semibold mt-1">{{ summary()?.totalVotesCast ?? 0 }}</p>
          </div>
          <div class="bg-surface border rounded-xl p-5">
            <p class="text-xs text-muted-foreground uppercase tracking-wide">Total Polls</p>
            <p class="text-3xl font-semibold mt-1">{{ summary()?.totalPollCount ?? 0 }}</p>
          </div>
        </div>

        <!-- Charts Row: Poll Status Donut + Active Polls Bar -->
        <div class="grid lg:grid-cols-2 gap-4">
          <!-- Poll Status Breakdown (Donut) -->
          <div class="rounded-xl border bg-surface p-6 min-h-[340px] flex flex-col">
            <h2 class="text-sm font-medium mb-4">Poll Status Breakdown</h2>
            @if ((summary()?.activePollCount ?? 0) + (summary()?.closedPollCount ?? 0) === 0) {
              <div class="flex-1 flex flex-col items-center justify-center gap-3">
                <div class="w-32 h-32 rounded-full border-[12px] border-muted opacity-40"></div>
                <p class="text-sm text-muted-foreground">Create polls to see the breakdown</p>
              </div>
            } @else {
              <ngx-donut-chart
                [data]="pollStatusData()"
                [categories]="pollStatusCategories"
                [height]="260"
              />
            }
          </div>

          <!-- Active Polls by Votes (Bar) -->
          <div class="rounded-xl border bg-surface p-6 min-h-[340px] flex flex-col">
            <h2 class="text-sm font-medium mb-4">Active Polls by Votes</h2>
            @if (activePollChartData().length === 0) {
              <div class="flex-1 flex flex-col items-end justify-end gap-1.5 pb-4 px-4">
                <div class="flex items-end gap-3 w-full justify-center">
                  <div class="w-10 bg-muted rounded-t opacity-30" style="height: 40px"></div>
                  <div class="w-10 bg-muted rounded-t opacity-20" style="height: 70px"></div>
                  <div class="w-10 bg-muted rounded-t opacity-30" style="height: 55px"></div>
                  <div class="w-10 bg-muted rounded-t opacity-15" style="height: 90px"></div>
                  <div class="w-10 bg-muted rounded-t opacity-25" style="height: 30px"></div>
                </div>
                <p class="text-sm text-muted-foreground text-center w-full mt-3">Create polls to see vote distribution</p>
              </div>
            } @else {
              <ngx-bar-chart
                [data]="activePollChartData()"
                [categories]="pollBarCategories"
                [height]="260"
                [yAxis]="['votes']"
                yLabel="Votes"
                xLabel="Poll"
              />
            }
          </div>
        </div>

        <!-- Active Polls Table -->
        <div class="bg-surface border rounded-xl p-5">
          <h2 class="text-base font-medium mb-4">Active Polls</h2>
          @if (activePolls().length === 0) {
            <p class="text-sm text-muted-foreground py-4">No active polls yet.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-muted-foreground">
                    <th class="pb-2 font-medium">Title</th>
                    <th class="pb-2 font-medium">Creator</th>
                    <th class="pb-2 font-medium text-right">Votes</th>
                    <th class="pb-2 font-medium text-right">Participation</th>
                    <th class="pb-2 font-medium text-right">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  @for (poll of activePolls(); track poll.pollId) {
                    <tr class="border-b last:border-0 hover:bg-muted/50">
                      <td class="py-3">
                        <a
                          [routerLink]="['/~/polls', poll.pollId]"
                          class="text-foreground hover:underline"
                        >
                          {{ poll.title }}
                        </a>
                      </td>
                      <td class="py-3 text-muted-foreground">{{ poll.creatorName }}</td>
                      <td class="py-3 text-right">{{ poll.totalVotes }}</td>
                      <td class="py-3 text-right">
                        {{ poll.participationRate | number: '1.0-1' }}%
                      </td>
                      <td class="py-3 text-right text-muted-foreground">
                        {{ poll.expiresAt ? (poll.expiresAt | date: 'shortDate') : 'No expiry' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Recent Results -->
        <div class="bg-surface border rounded-xl p-5">
          <h2 class="text-base font-medium mb-4">Recent Results</h2>
          @if (recentResults().length === 0) {
            <p class="text-sm text-muted-foreground py-4">No recent results yet.</p>
          } @else {
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              @for (result of recentResults(); track result.pollId) {
                <a
                  [routerLink]="['/~/polls', result.pollId]"
                  class="block bg-background border rounded-lg p-4 hover:border-primary/40 transition-colors"
                >
                  <div class="flex items-start justify-between mb-2">
                    <h3 class="text-sm font-medium line-clamp-1">{{ result.title }}</h3>
                    <span
                      class="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full shrink-0 ml-2"
                      [class.bg-green-100]="result.status === 'ACTIVE'"
                      [class.text-green-700]="result.status === 'ACTIVE'"
                      [class.bg-muted]="result.status !== 'ACTIVE'"
                      [class.text-muted-foreground]="result.status !== 'ACTIVE'"
                    >
                      {{ result.status }}
                    </span>
                  </div>
                  <p class="text-xs text-muted-foreground mb-3">
                    {{ result.totalVotes }} votes &middot;
                    {{ result.participationRate | number: '1.0-1' }}% participation
                  </p>
                  @if (result.winningOption) {
                    <div class="bg-muted/50 rounded-md px-3 py-2">
                      <p class="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Leading
                      </p>
                      <p class="text-sm font-medium">{{ result.winningOption.optionText }}</p>
                      <p class="text-xs text-muted-foreground">
                        {{ result.winningOption.voteCount }} votes
                        ({{ result.winningOption.votePercentage | number: '1.0-1' }}%)
                      </p>
                    </div>
                  }
                </a>
              }
            </div>
          }
        </div>

        <!-- Admin Section: Top Users Chart + Table -->
        @if (isAdmin() && topUsers().length > 0) {
          <div class="grid lg:grid-cols-2 gap-4">
            <!-- Top Users Bar Chart -->
            <div class="rounded-xl border bg-surface p-6">
              <h2 class="text-sm font-medium mb-4">Top Users by Activity</h2>
              <ngx-bar-chart
                [data]="topUserChartData()"
                [categories]="userBarCategories"
                [height]="280"
                [yAxis]="['votesCast', 'pollsJoined']"
                yLabel="Count"
                xLabel="User"
              />
            </div>

            <!-- Top Users Table -->
            <div class="bg-surface border rounded-xl p-5">
              <h2 class="text-base font-medium mb-4">Top Users</h2>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b text-left text-muted-foreground">
                      <th class="pb-2 font-medium">#</th>
                      <th class="pb-2 font-medium">User</th>
                      <th class="pb-2 font-medium text-right">Votes</th>
                      <th class="pb-2 font-medium text-right">Polls Joined</th>
                      <th class="pb-2 font-medium text-right">Created</th>
                      <th class="pb-2 font-medium text-right">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (user of topUsers(); track user.userId; let i = $index) {
                      <tr class="border-b last:border-0">
                        <td class="py-3 text-muted-foreground">{{ i + 1 }}</td>
                        <td class="py-3">{{ user.userName }}</td>
                        <td class="py-3 text-right">{{ user.totalVotesCast }}</td>
                        <td class="py-3 text-right">{{ user.pollsParticipated }}</td>
                        <td class="py-3 text-right">{{ user.pollsCreated }}</td>
                        <td class="py-3 text-right text-muted-foreground">
                          {{ user.lastActive ? (user.lastActive | date: 'shortDate') : '-' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- Department Management (Admin only) -->
        @if (isAdmin()) {
          <div class="bg-surface border rounded-xl p-5">
            <h2 class="text-base font-medium mb-4">Department Management</h2>

            <div class="grid gap-6 lg:grid-cols-2">
              <!-- Create Department Form -->
              <div class="bg-background border rounded-lg p-5">
                <h3 class="text-sm font-medium mb-4">Create New Department</h3>

                @if (deptSuccess()) {
                  <div class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {{ deptSuccess() }}
                  </div>
                }
                @if (deptError()) {
                  <div class="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {{ deptError() }}
                  </div>
                }
                @if (deptFailedEmails().length > 0) {
                  <div class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                    <p class="font-medium mb-1">Some emails could not be added:</p>
                    <ul class="list-disc pl-4">
                      @for (email of deptFailedEmails(); track email) {
                        <li>{{ email }}</li>
                      }
                    </ul>
                  </div>
                }

                <form (ngSubmit)="createDepartment()" class="flex flex-col gap-4">
                  <div class="flex flex-col gap-1.5">
                    <label for="deptName" class="text-sm font-medium text-foreground">Department Name</label>
                    <input
                      id="deptName"
                      app-input
                      type="text"
                      [(ngModel)]="deptName"
                      name="deptName"
                      placeholder="e.g. Engineering"
                      required
                    />
                  </div>

                  <div class="flex flex-col gap-1.5">
                    <label for="deptEmails" class="text-sm font-medium text-foreground">Member Emails</label>
                    <textarea
                      id="deptEmails"
                      app-textarea
                      [(ngModel)]="deptEmails"
                      name="deptEmails"
                      rows="4"
                      placeholder="Enter emails separated by commas or new lines"
                      required
                    ></textarea>
                    <p class="text-xs text-muted-foreground">Separate multiple emails with commas or new lines.</p>
                  </div>

                  <div class="flex justify-end">
                    <button
                      app-button
                      type="submit"
                      [disabled]="deptSubmitting()"
                    >
                      @if (deptSubmitting()) {
                        Creating...
                      } @else {
                        Create Department
                      }
                    </button>
                  </div>
                </form>
              </div>

              <!-- Existing Departments List -->
              <div class="bg-background border rounded-lg p-5">
                <h3 class="text-sm font-medium mb-4">Existing Departments</h3>
                @if (departmentsLoading()) {
                  <div class="space-y-3">
                    @for (i of [1, 2, 3]; track i) {
                      <div class="h-10 bg-muted rounded animate-pulse"></div>
                    }
                  </div>
                } @else if (departments().length === 0) {
                  <p class="text-sm text-muted-foreground py-4">No departments created yet.</p>
                } @else {
                  <div class="space-y-2">
                    @for (dept of departments(); track dept.id) {
                      <div class="flex items-center justify-between rounded-lg border px-4 py-3">
                        <span class="text-sm font-medium">{{ dept.name }}</span>
                        <span class="text-xs text-muted-foreground">ID: {{ dept.id }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly departmentService = inject(DepartmentService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly activePolls = signal<ActivePollItem[]>([]);
  readonly recentResults = signal<RecentResultItem[]>([]);
  readonly topUsers = signal<TopUser[]>([]);
  readonly isAdmin = signal(false);

  readonly departments = signal<Department[]>([]);
  readonly departmentsLoading = signal(false);
  readonly deptSubmitting = signal(false);
  readonly deptSuccess = signal<string | null>(null);
  readonly deptError = signal<string | null>(null);
  readonly deptFailedEmails = signal<string[]>([]);

  deptName = '';
  deptEmails = '';

  // -- Chart data (computed from signals) --

  readonly pollStatusData = computed(() => {
    const s = this.summary();
    if (!s) return [];
    return [s.activePollCount, s.closedPollCount];
  });

  readonly pollStatusCategories: Record<string, BulletLegendItemInterface> = {
    Active: { name: 'Active', color: 'var(--chart-2)' },
    Closed: { name: 'Closed', color: 'var(--chart-4)' },
  };

  readonly activePollChartData = computed<PollVoteRow[]>(() => {
    return this.activePolls()
      .slice(0, 8)
      .map((p) => ({
        poll: p.title.length > 20 ? p.title.substring(0, 18) + '…' : p.title,
        votes: p.totalVotes,
      }));
  });

  readonly pollBarCategories: Record<string, BulletLegendItemInterface> = {
    votes: { name: 'Votes', color: 'var(--chart-1)' },
  };

  readonly topUserChartData = computed<UserVoteRow[]>(() => {
    return this.topUsers()
      .slice(0, 8)
      .map((u) => ({
        user: u.userName.split(' ')[0],
        votesCast: u.totalVotesCast,
        pollsJoined: u.pollsParticipated,
      }));
  });

  readonly userBarCategories: Record<string, BulletLegendItemInterface> = {
    votesCast: { name: 'Votes Cast', color: 'var(--chart-1)' },
    pollsJoined: { name: 'Polls Joined', color: 'var(--chart-3)' },
  };

  ngOnInit() {
    this.authService.getProfile().subscribe({
      next: (user: User) => {
        this.isAdmin.set(user.role === 'ADMIN');
        this.loadDashboard();
        if (user.role === 'ADMIN') {
          this.loadDepartments();
        }
      },
      error: () => {
        this.loadDashboard();
      },
    });
  }

  loadDashboard() {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      summary: this.dashboardService.getSummary(),
      activePolls: this.dashboardService.getActivePolls(0, 10),
      recentResults: this.dashboardService.getRecentResults(0, 5),
      topUsers: this.isAdmin() ? this.dashboardService.getTopUsers(0, 10) : of(null),
    }).subscribe({
      next: (data) => {
        this.summary.set(data.summary);
        this.activePolls.set(data.activePolls?.content ?? []);
        this.recentResults.set(data.recentResults?.content ?? []);
        if (data.topUsers) {
          this.topUsers.set(data.topUsers.content ?? []);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load dashboard data.');
        this.loading.set(false);
      },
    });
  }

  loadDepartments() {
    this.departmentsLoading.set(true);
    this.departmentService.getAll().subscribe({
      next: (departments) => {
        this.departments.set(departments);
        this.departmentsLoading.set(false);
      },
      error: () => {
        this.departmentsLoading.set(false);
      },
    });
  }

  createDepartment() {
    const name = this.deptName.trim();
    const emails = this.deptEmails
      .split(/[,\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (!name || emails.length === 0) {
      this.deptError.set('Please provide a department name and at least one email.');
      return;
    }

    this.deptSubmitting.set(true);
    this.deptSuccess.set(null);
    this.deptError.set(null);
    this.deptFailedEmails.set([]);

    this.departmentService.create({ name, emails }).subscribe({
      next: (response: DepartmentResponse) => {
        this.deptSubmitting.set(false);
        this.deptName = '';
        this.deptEmails = '';
        this.cdr.markForCheck();

        if (response.failedEmails?.length > 0) {
          this.deptFailedEmails.set(response.failedEmails);
          this.deptSuccess.set(
            `Department "${response.name}" created, but some emails failed.`,
          );
        } else {
          this.deptSuccess.set(`Department "${response.name}" created successfully.`);
        }

        this.loadDepartments();
      },
      error: () => {
        this.deptSubmitting.set(false);
        this.deptError.set('Failed to create department. Please try again.');
      },
    });
  }
}
