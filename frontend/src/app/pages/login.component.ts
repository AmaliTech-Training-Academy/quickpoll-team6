import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

import { AuthService } from '@/services/auth.service';
import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { InputComponent } from '@/components/ui/primitives/input.component';
import { PasswordFieldComponent } from '@/components/ui/primitives/password-field.component';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    InputComponent,
    ReactiveFormsModule,
    RouterLink,
    PasswordFieldComponent,
  ],
  template: `
    <div class="max-w-100 m-15 mx-auto flex flex-col" data-test-id="login-page">
      <h1 class="mb-8 text-xl md:text-3xl font-semibold text-center">Welcome back</h1>
      @if (error) {
        <p class="text-destructive text-sm mb-8" data-test-id="login-error-message">{{ error }}</p>
      }
      <form
        class="flex flex-col gap-5"
        [formGroup]="loginForm"
        (ngSubmit)="onSubmit()"
        data-test-id="login-form"
      >
        <div>
          <input
            app-input
            type="email"
            name="email"
            formControlName="email"
            placeholder="Email address"
            required
            data-test-id="login-email-input"
          />
          @if (loginForm.get('email')?.touched && loginForm.get('email')?.invalid) {
            <div
              id="email-error"
              role="alert"
              aria-live="assertive"
              data-test-id="login-email-error-message"
            >
              @if (loginForm.get('email')?.errors?.['required']) {
                <span class="form-field-error">Email address is required.</span>
              }
              @if (loginForm.get('email')?.errors?.['email']) {
                <span class="form-field-error">Please enter a valid email address.</span>
              }
            </div>
          }
        </div>

        <div>
          <app-password-field
            placeholder="Password"
            formControlName="password"
            name="password"
            required
            data-test-id="login-password-input"
          />
          @if (loginForm.get('password')?.touched && loginForm.get('password')?.invalid) {
            <div
              id="password-error"
              role="alert"
              aria-live="assertive"
              data-test-id="login-password-error-message"
            >
              @if (loginForm.get('password')?.errors?.['required']) {
                <span class="form-field-error">Password is required.</span>
              }
              @if (loginForm.get('password')?.errors?.['minlength']) {
                <span class="form-field-error">Password must be at least 8 characters.</span>
              }
            </div>
          }
        </div>
        <button
          app-button
          variant="primary"
          type="submit"
          class="rounded-full!"
          data-test-id="login-submit-button"
        >
          Continue
        </button>
      </form>
      <div class="mt-8 text-center text-xs inline-flex items-center justify-center gap-1">
        <p>Don't have an account?</p>
        <a routerLink="/auth/register" class="font-medium" data-test-id="login-register-link">
          Register
        </a>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  protected loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected error: string | null = null;

  ngOnInit() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      this.error = 'You must be signed in to continue.';
    }
  }

  onSubmit() {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.value;
    this.authService.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/~']),
      error: (err) => (this.error = 'Problem signing in: ' + err.message),
    });
  }
}
