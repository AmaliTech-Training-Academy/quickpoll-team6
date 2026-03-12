import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-user-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  template: `
    <div
      class="inline-flex items-center justify-center rounded-full border bg-secondary/50 text-foreground font-semibold select-none"
      [class]="sizeClass()"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="name() || 'User avatar'"
    >
      <span [class]="textClass()">
        {{ initials() }}
      </span>
    </div>
  `,
})
export class UserAvatarComponent {
  readonly name = input<string | null | undefined>(null);
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');

  protected readonly initials = computed(() => {
    const value = this.name()?.trim();

    if (!value) {
      return '?';
    }

    const parts = value.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  });

  protected readonly sizeClass = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'size-8';
      case 'lg':
        return 'size-16';
      case 'xl':
        return 'size-full';
      case 'md':
      default:
        return 'size-9';
    }
  });

  protected readonly textClass = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-4xl';
      case 'xl':
        return 'text-7xl';
      case 'md':
      default:
        return 'text-xs';
    }
  });

  protected readonly ariaLabel = computed(() => this.name() ? `${this.name()} avatar` : 'User avatar');
}
