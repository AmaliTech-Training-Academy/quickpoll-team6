import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-user-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  template: `
    <div class="flex items-center gap-2 animate-pulse">
      <div
        class="rounded-full border bg-muted/60 shrink-0"
        [class]="avatarSizeClass()"
      ></div>

      @if (showDetails()) {
        <div class="hidden md:flex flex-col items-end gap-2 flex-1">
          <div class="h-3 w-24 rounded-md bg-muted"></div>
          <div class="h-3 w-32 rounded-md bg-muted"></div>
        </div>
      }
    </div>
  `,
})
export class UserSkeletonComponent {
  readonly showDetails = input(true);
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');

  protected avatarSizeClass(): string {
    switch (this.size()) {
      case 'sm': return 'size-8';
      case 'lg': return 'size-16';
      case 'xl': return 'size-24';
      case 'md':
      default: return 'size-9';
    }
  }
}
