import { Router, RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  ValidatorFn,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';

import { AuthService } from '@/services/auth.service';
import { DepartmentService } from '@/services/department.service';
import { Department } from '@/models';
import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { InputComponent } from '@/components/ui/primitives/input.component';
import { ComboboxComponent } from '@/components/ui/primitives/combobox.component';
import { PasswordFieldComponent } from '@/components/ui/primitives/password-field.component';

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    InputComponent,
    ReactiveFormsModule,
    RouterLink,
    ComboboxComponent,
    PasswordFieldComponent,
  ],
  template: `
    <div class="max-w-100 m-15 mx-auto flex flex-col">
      <h1 class="mb-8 text-xl md:text-3xl font-semibold text-center">Welcome to Quickpoll</h1>
      @if (error) {
        <p data-test-id="register-error-alert" class="text-destructive text-xs mb-8">{{ error }}</p>
      }
      <form
        id="register-form"
        data-test-id="register-form"
        class="flex flex-col gap-5"
        [formGroup]="registerForm"
        (ngSubmit)="onSubmit()"
      >
        <div class="flex gap-3">
          <div class="flex-1">
            <input
              app-input
              type="text"
              name="firstName"
              formControlName="firstName"
              placeholder="First name"
              data-test-id="register-first-name-input"
              required
            />
            @if (registerForm.get('firstName')?.touched && registerForm.get('firstName')?.invalid) {
              <div
                id="first-name-error"
                data-test-id="register-first-name-error-alert"
                class="form-field-error"
                role="alert"
                aria-live="assertive"
              >
                @if (registerForm.get('firstName')?.errors?.['required']) {
                  <span>First name is required.</span>
                }
              </div>
            }
          </div>
          <div class="flex-1">
            <input
              app-input
              type="text"
              name="lastName"
              formControlName="lastName"
              placeholder="Last name"
              data-test-id="register-last-name-input"
              required
            />
            @if (registerForm.get('lastName')?.touched && registerForm.get('lastName')?.invalid) {
              <div
                id="last-name-error"
                data-test-id="register-last-name-error-alert"
                class="form-field-error"
                role="alert"
                aria-live="assertive"
              >
                @if (registerForm.get('lastName')?.errors?.['required']) {
                  <span>Last name is required.</span>
                }
              </div>
            }
          </div>
        </div>

        <div>
          <input
            app-input
            type="email"
            name="email"
            formControlName="email"
            placeholder="Email address"
            data-test-id="register-email-input"
            required
          />
          @if (registerForm.get('email')?.touched && registerForm.get('email')?.invalid) {
            <div
              id="email-error"
              data-test-id="register-email-error-alert"
              class="form-field-error"
              role="alert"
              aria-live="assertive"
            >
              @if (registerForm.get('email')?.errors?.['required']) {
                <span>Email address is required.</span>
              }
              @if (registerForm.get('email')?.errors?.['email']) {
                <span>Please enter a valid email address.</span>
              }
            </div>
          }
        </div>

        <div>
          <app-password-field
            name="password"
            formControlName="password"
            placeholder="Password"
            data-test-id="register-password-input"
            required
          />
          @if (registerForm.get('password')?.touched && registerForm.get('password')?.invalid) {
            <div
              id="password-error"
              data-test-id="register-password-error-alert"
              class="form-field-error"
              role="alert"
              aria-live="assertive"
            >
              @if (registerForm.get('password')?.errors?.['required']) {
                <span>Password is required.</span>
              }
              @if (registerForm.get('password')?.errors?.['minlength']) {
                <span>Password must be at least 8 characters.</span>
              }
              @if (registerForm.get('password')?.errors?.['pattern']) {
                <span
                  >Password must contain at least one uppercase letter, one lowercase letter, and
                  one special character.</span
                >
              }
            </div>
          }
        </div>

        <div>
          <app-password-field
            name="confirmPassword"
            formControlName="confirmPassword"
            placeholder="Confirm password"
            data-test-id="register-confirm-password-input"
            required
          />
          @if (
            registerForm.get('confirmPassword')?.touched &&
            (registerForm.get('confirmPassword')?.invalid ||
              registerForm.hasError('passwordMismatch'))
          ) {
            <div
              id="confirm-password-error"
              data-test-id="register-confirm-password-error-alert"
              class="form-field-error"
              role="alert"
              aria-live="assertive"
            >
              @if (registerForm.get('confirmPassword')?.errors?.['required']) {
                <span>Please confirm your password.</span>
              }
              @if (
                !registerForm.get('confirmPassword')?.errors?.['required'] &&
                registerForm.hasError('passwordMismatch')
              ) {
                <span>Passwords do not match.</span>
              }
            </div>
          }
        </div>

        <div>
          <app-combobox
            [options]="departmentNames()"
            [value]="selectedDepartmentName()"
            placeholder="Select a department"
            data-test-id="register-department-combobox"
            (valueChange)="onDepartmentChange($event)"
          />
          @if (departmentsError()) {
            <p data-test-id="register-department-error-alert" class="text-destructive text-xs mt-1">
              {{ departmentsError() }}
            </p>
          }
        </div>

        <button
          app-button
          type="submit"
          data-test-id="register-submit-button"
          (click)="registerForm.markAllAsTouched()"
          class="rounded-full!"
          [disabled]="loading()"
        >
          @if (loading()) {
            Registering...
          } @else {
            Register
          }
        </button>
      </form>
      <div class="mt-6 text-center text-xs inline-flex items-center justify-center gap-1">
        <p>Already have an account?</p>
        <a routerLink="/auth/login" data-test-id="register-login-link" class="font-medium">Login</a>
      </div>
    </div>
  `,
})
export class RegisterComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly departmentService = inject(DepartmentService);
  private readonly router = inject(Router);

  protected readonly departments = signal<Department[]>([]);
  protected readonly departmentsError = signal<string | null>(null);
  protected readonly loading = signal(false);

  protected readonly departmentNames = () => this.departments().map((d) => d.name);

  protected readonly selectedDepartmentName = () => {
    const id = this.registerForm.get('department')?.value as number | null;
    return this.departments().find((d) => d.id === id)?.name;
  };

  protected registerForm = this.formBuilder.group(
    {
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};\':"\\\\|,.<>\\/?]).{8,72}$',
          ),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
      department: [null as number | null],
    },
    { validators: passwordMatchValidator },
  );

  protected error: string | null = null;

  ngOnInit(): void {
    this.departmentService.getAll().subscribe({
      next: (departments) => this.departments.set(departments),
      error: () => this.departmentsError.set('Unable to load departments.'),
    });
  }

  protected onDepartmentChange(name: string | undefined): void {
    const match = this.departments().find((d) => d.name === name);
    this.registerForm.patchValue({ department: match?.id ?? null });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading.set(true);

    const { firstName, lastName, email, password, department } = this.registerForm.value;
    const name = `${firstName!.trim()} ${lastName!.trim()}`;
    const deptId = department ?? undefined;

    this.authService.register(name, email!, password!, deptId).subscribe({
      next: () => this.router.navigateByUrl('/~/polls'),
      error: () => {
        this.error = 'Registration failed. Please try again.';
        this.loading.set(false);
      },
    });
  }
}
