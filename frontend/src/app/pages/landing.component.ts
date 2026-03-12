import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent],
  template: `
    <div class="grid min-h-screen place-items-center">
      <div class="">
        <button routerLink="~" app-button data-test-id="landing-go-to-dashboard-button">
          Go to Dashboard
        </button>
      </div>
    </div>
  `,
})
export class LandingComponent {}
