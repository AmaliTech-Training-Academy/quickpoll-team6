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
import { SwitchComponent } from '@/components/ui/primitives/switch.component';

@Component({
  selector: 'app-poll-department-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComboboxComponent, SwitchComponent, AsyncPipe, FormsModule],
  template: `
    <div>
      <div class="flex flex-col gap-4">
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-base font-medium text-foreground">Department</h2>
            <p class="text-sm text-muted-foreground">
              Enable department selection to assign this poll to a department.
            </p>
          </div>

          <app-switch [(ngModel)]="enabled" />
        </div>

        @if (enabled()) {
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
  readonly allowNoDepartment = input(true);

  private readonly departmentService = inject(DepartmentService);

  protected readonly enabled = signal(false);
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
      if (!this.enabled()) {
        this.departmentId.set(null);
      }
    });
  }

  protected onDepartmentChange(value: string | undefined): void {
    const selected = this.departments().find((department) => department.name === value);
    this.departmentId.set(selected?.id ?? null);
  }

  protected clearDepartment(): void {
    this.departmentId.set(null);
  }
}
