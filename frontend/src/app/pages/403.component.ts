import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  template: `
    <div class="h-screen grid place-items-center">
      <div class="flex flex-col items-center gap-3">
        <h1 class="text-4xl md:text-8xl mb-4 font-semibold">403</h1>
        <h2 class="text-base">Access Denied</h2>
        <p class="text-sm text-muted-foreground">You probably have the wrong link.</p>
        <button
          app-button
          variant="outline"
          (click)="goHome()"
          class="px-5! py-2! shadow-2xs! w-fit rounded-full! cursor-pointer"
        >
          Go Home
        </button>
      </div>
    </div>
  `,
})
export class PermissionDeniedComponent {
  private router = inject(Router);

  goHome(): void {
    this.router.navigateByUrl('~')
  }
}
