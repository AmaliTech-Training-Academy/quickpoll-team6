import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

import { Department } from '@/models';
import { DepartmentService } from '@/services/department.service';
import { ComboboxComponent } from '@/components/ui/primitives/combobox.component';
import { RadioGroupComponent } from '@/components/ui/primitives/radio-group.component';
import { RadioItemComponent } from '@/components/ui/primitives/radio-item.component';

type PollAudience = 'company-wide' | 'department';

@Component({
  selector: 'app-poll-department-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComboboxComponent, RadioGroupComponent, RadioItemComponent, AsyncPipe, FormsModule],
  template: `
    <div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h2 class="text-base font-medium text-foreground">Audience</h2>
          <p class="text-sm text-muted-foreground">
            Choose whether this poll is visible to everyone or only to a specific department.
          </p>
        </div>

        <app-radio-group [(ngModel)]="audience" class="grid! sm:grid-cols-2! gap-3">
          <app-radio-item value="company-wide">
            <span class="block text-sm font-medium text-inherit">Company-Wide</span>
            <span class="mt-1 block text-xs text-muted-foreground">
              Anyone in the company can access and vote on this poll.
            </span>
          </app-radio-item>

          <app-radio-item value="department">
            <span class="block text-sm font-medium text-inherit">Department</span>
            <span class="mt-1 block text-xs text-muted-foreground">
              Limit this poll to people in one department.
            </span>
          </app-radio-item>
        </app-radio-group>

        @if (audience() === 'department') {
          <div class="flex flex-col gap-2">
            <app-combobox
              [options]="departmentNames()"
              [value]="selectedDepartmentName()"
              placeholder="Select a department"
              (valueChange)="onDepartmentChange($event)"
            />

            @if (loading()) {
              <p class="text-xs text-muted-foreground">Loading departments…</p>
            }

            @if (error()) {
              <p class="text-xs text-destructive">{{ error() }}</p>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class PollDepartmentSectionComponent {
  readonly departmentId = model<number | null>(null);
  readonly audience = model<PollAudience>('company-wide');
  readonly allowNoDepartment = input(true);

  private readonly departmentService = inject(DepartmentService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly departments = signal<Department[]>([]);

  protected readonly departmentNames = () =>
    this.departments().map((department) => department.name);

  protected readonly selectedDepartmentName = () => {
    const selected = this.departments().find((department) => department.id === this.departmentId());
    return selected?.name;
  };

  constructor() {
    this.departmentService.getAll().subscribe({
      next: (departments) => {
        this.departments.set(departments);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load departments.');
        this.loading.set(false);
      },
    });

    effect(() => {
      if (this.departmentId() !== null && this.audience() !== 'department') {
        this.audience.set('department');
      }
    });

    effect(() => {
      if (this.audience() === 'company-wide' && this.departmentId() !== null) {
        this.departmentId.set(null);
      }
    });
  }

  protected onDepartmentChange(value: string | undefined): void {
    const selected = this.departments().find((department) => department.name === value);
    this.departmentId.set(selected?.id ?? null);
  }
}
