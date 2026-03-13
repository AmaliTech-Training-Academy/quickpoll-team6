import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { NgpDialogTrigger } from 'ng-primitives/dialog';
import { PollService } from '@/services/poll.service';
import { ContentHeaderComponent } from '../ui/content-header.component';
import { ButtonComponent } from '../ui/primitives/button.component';
import { DialogComponent } from '../ui/primitives/dialog.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeSquareLock01 } from '@ng-icons/huge-icons';

@Component({
  selector: 'app-poll-details-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    ContentHeaderComponent,
    ButtonComponent,
    DialogComponent,
    NgpDialogTrigger,
    NgIcon,
  ],
  providers: [provideIcons({ hugeSquareLock01 })],
  template: `
    <app-content-header pageTitle="Poll Metrics">
      <div class="flex items-center gap-2">
        <button
          app-button
          variant="outline"
          [ngpDialogTrigger]="deletePollDialog"
          [disabled]="isDeleting()"
          data-test-id="poll-details-delete-poll-button"
        >
          Delete poll
        </button>
        <button
          app-button
          [ngpDialogTrigger]="closePollDialog"
          [disabled]="isClosing()"
          data-test-id="poll-details-close-poll-button"
        >
          <ng-icon name="hugeSquareLock01" />
          Close poll
        </button>
      </div>
    </app-content-header>
    <div class="maxview-container flex flex-col p-5">
      <router-outlet />
    </div>

    <ng-template #closePollDialog let-close="close">
      <app-dialog header="Close this poll?" data-test-id="close-poll-confirmation-dialog">
        <p class="text-sm text-muted-foreground">
          Are you sure you want to close this poll? This action cannot be undone and no further
          votes will be accepted.
        </p>
        <div slot="actions" class="flex justify-end gap-2">
          <button
            variant="outline"
            app-button
            (click)="close()"
            data-test-id="close-poll-cancel-button"
          >
            Cancel
          </button>
          <button
            variant="destructive"
            app-button
            (click)="closePoll(close)"
            [disabled]="isClosing()"
            data-test-id="close-poll-confirm-button"
          >
            @if (isClosing()) {
              Closing...
            } @else {
              Close poll
            }
          </button>
        </div>
      </app-dialog>
    </ng-template>

    <ng-template #deletePollDialog let-close="close">
      <app-dialog header="Delete this poll?" data-test-id="delete-poll-confirmation-dialog">
        <p class="text-sm text-muted-foreground">
          Are you sure you want to delete this poll? This action cannot be undone and all poll data
          will be permanently removed.
        </p>
        <div slot="actions" class="flex justify-end gap-2">
          <button
            variant="outline"
            app-button
            (click)="close()"
            data-test-id="delete-poll-cancel-button"
          >
            Cancel
          </button>
          <button
            variant="destructive"
            app-button
            (click)="deletePoll(close)"
            [disabled]="isDeleting()"
            data-test-id="delete-poll-confirm-button"
          >
            @if (isDeleting()) {
              Deleting...
            } @else {
              Delete poll
            }
          </button>
        </div>
      </app-dialog>
    </ng-template>
  `,
})
export class PollDetailsLayoutComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pollService = inject(PollService);

  readonly isClosing = signal(false);
  readonly isDeleting = signal(false);

  closePoll(closeDialog: () => void): void {
    const pollId = Number(this.route.snapshot.paramMap.get('id'));
    if (!pollId) return;

    this.isClosing.set(true);

    this.pollService.closePoll(pollId).subscribe({
      next: () => {
        closeDialog();
        this.router.navigate(['/~/polls']);
      },
      error: () => {
        this.isClosing.set(false);
      },
    });
  }

  deletePoll(closeDialog: () => void): void {
    const pollId = Number(this.route.snapshot.paramMap.get('id'));
    if (!pollId) return;

    this.isDeleting.set(true);

    this.pollService.deletePoll(pollId).subscribe({
      next: () => {
        closeDialog();
        this.router.navigate(['/~/polls']);
      },
      error: () => {
        this.isDeleting.set(false);
      },
    });
  }
}
