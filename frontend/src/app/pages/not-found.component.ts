import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ButtonComponent } from '@/components/ui/button.component';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  template: `
    <div class="h-screen grid place-items-center">
      <div class="flex flex-col items-center gap-3">
        <h1 class="text-4xl md:text-8xl mb-4 font-semibold">404</h1>
        <h2 class="text-sm text-neutral-600">Page Not Found. You probably have the wrong link.</h2>
        <button
          app-button
          variant="outline"
          (click)="goBack()"
          class="px-5! py-2! shadow-2xs! w-fit rounded-full! cursor-pointer"
        >
          Go Back
        </button>
      </div>
    </div>
  `,
})
export class NotFoundComponent {
  private location = inject(Location);

  goBack(): void {
    this.location.back();
  }
}
