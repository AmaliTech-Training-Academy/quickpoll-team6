import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PollService } from '@/services/poll.service';
import { Poll } from '@/models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-poll-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    @if (loading()) {
      <div class="animate-pulse space-y-4">
        <div class="h-6 bg-muted rounded w-1/3"></div>
        <div class="h-4 bg-muted rounded w-2/3"></div>
        <div class="h-40 bg-muted rounded"></div>
      </div>
    } @else if (error()) {
      <div class="text-center py-12">
        <p class="text-muted-foreground">{{ error() }}</p>
      </div>
    } @else if (poll()) {
      <div class="space-y-6">
        <div class="bg-surface border rounded-xl p-5 space-y-4">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold">{{ poll()!.question }}</h2>
              @if (poll()!.description) {
                <p class="mt-1 text-sm text-muted-foreground">{{ poll()!.description }}</p>
              }
            </div>
            <span
              class="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full shrink-0"
              [class.bg-green-100]="poll()!.status === 'ACTIVE'"
              [class.text-green-700]="poll()!.status === 'ACTIVE'"
              [class.bg-muted]="poll()!.status !== 'ACTIVE'"
              [class.text-muted-foreground]="poll()!.status !== 'ACTIVE'"
            >
              {{ poll()!.status }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div class="text-muted-foreground">Creator</div>
            <div>{{ poll()!.creatorName }}</div>
            <div class="text-muted-foreground">Max selections</div>
            <div>{{ poll()!.maxSelections }}</div>
            <div class="text-muted-foreground">Created</div>
            <div>{{ poll()!.createdAt | date: 'medium' }}</div>
            <div class="text-muted-foreground">Expires</div>
            <div>{{ poll()!.expiresAt ? (poll()!.expiresAt | date: 'medium') : 'No expiry' }}</div>
          </div>
        </div>

        <div class="bg-surface border rounded-xl p-5">
          <h3 class="text-sm font-medium mb-3">Options</h3>
          <ul class="space-y-2">
            @for (opt of poll()!.options; track opt.id) {
              <li class="flex items-center justify-between px-3 py-2 border rounded-md text-sm">
                <span>{{ opt.text }}</span>
                @if (opt.vote_count !== null && opt.vote_count !== undefined) {
                  <span class="text-muted-foreground">{{ opt.vote_count }} votes</span>
                }
              </li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class PollDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pollService = inject(PollService);

  readonly poll = signal<Poll | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    const id = Number(this.route.parent?.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('Poll not found');
      this.loading.set(false);
      return;
    }

    this.pollService.getById(id).subscribe({
      next: (poll: Poll) => {
        this.poll.set(poll);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load poll details.');
        this.loading.set(false);
      },
    });
  }
}
