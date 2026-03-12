import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@/services/auth.service';
import { User } from '@/models';
import { UserAvatarComponent } from '@/components/ui/user-avatar.component';
import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { InputComponent } from '@/components/ui/primitives/input.component';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, InputComponent, FormsModule, UserAvatarComponent],
  template: `
    @if (!isLoading()) {
      <div class="flex max-lg:flex-col gap-16" data-test-id="profile-page">
        <div class="flex flex-col gap-5 md:min-w-90">
          <app-user-avatar
            class="w-full aspect-square"
            [name]="user()?.name"
            size="xl"
            data-test-id="profile-avatar"
          />
          <div class="flex gap-2">
            @if (isEditing()) {
              <button
                app-button
                variant="primary"
                (click)="saveEdit()"
                data-test-id="profile-save-button"
              >
                Save
              </button>
              <button
                app-button
                variant="outline"
                (click)="cancelEdit()"
                data-test-id="profile-cancel-button"
              >
                Cancel
              </button>
            } @else {
              <button
                app-button
                variant="primary"
                (click)="startEdit()"
                data-test-id="profile-edit-button"
              >
                Edit Profile
              </button>
            }
            <button
              app-button
              variant="destructive"
              (click)="logout()"
              data-test-id="profile-logout-button"
            >
              Logout
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-3 w-full">
          <div class="border bg-surface flex flex-col gap-2 px-4 py-6 rounded-lg">
            <p class="text-sm text-muted-foreground font-medium">Name</p>
            @if (isEditing()) {
              <input app-input [(ngModel)]="editName" data-test-id="profile-name-input" />
            } @else {
              <p class="text-sm" data-test-id="profile-name-value">{{ user()?.name }}</p>
            }
          </div>

          <div class="border bg-surface flex flex-col gap-2 px-4 py-6 rounded-lg">
            <p class="text-sm text-muted-foreground font-medium">Email</p>
            <p class="text-sm" data-test-id="profile-email-value">{{ user()?.email }}</p>
          </div>

          <div class="border bg-surface flex flex-col gap-2 px-4 py-6 rounded-lg">
            <p class="text-sm text-muted-foreground font-medium">Role</p>
            <p class="text-sm" data-test-id="profile-role-value">{{ user()?.role }}</p>
          </div>
        </div>
      </div>
    } @else {
      <div class="flex max-lg:flex-col gap-16 animate-pulse">
        <div class="flex flex-col gap-5 md:min-w-90">
          <div class="w-full aspect-square rounded-full border bg-muted/60"></div>
          <div class="flex gap-2">
            <div class="h-10 flex-1 rounded-md bg-muted"></div>
            <div class="h-10 flex-1 rounded-md bg-muted"></div>
          </div>
        </div>

        <div class="flex flex-col gap-3 w-full">
          <div class="border bg-surface flex flex-col gap-2 px-4 py-6 rounded-lg">
            <div class="h-4 w-16 rounded-md bg-muted"></div>
            <div class="h-5 w-40 rounded-md bg-muted"></div>
          </div>

          <div class="border bg-surface flex flex-col gap-2 px-4 py-6 rounded-lg">
            <div class="h-4 w-16 rounded-md bg-muted"></div>
            <div class="h-5 w-56 rounded-md bg-muted"></div>
          </div>

          <div class="border bg-surface flex flex-col gap-2 px-4 py-6 rounded-lg">
            <div class="h-4 w-16 rounded-md bg-muted"></div>
            <div class="h-5 w-24 rounded-md bg-muted"></div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  protected user = signal<User | null>(null);
  protected isLoading = signal(true);
  protected isEditing = signal(false);
  protected editName = '';

  ngOnInit() {
    this.authService.getProfile().subscribe((profile) => {
      this.user.set(profile);
      this.isLoading.set(false);
    });
  }

  startEdit() {
    this.editName = this.user()?.name || '...';
    this.isEditing.set(true);
  }

  cancelEdit() {
    this.isEditing.set(false);
  }

  saveEdit() {
    this.authService.updateUser(this.editName).subscribe((updated) => {
      this.user.set(updated);
      this.isEditing.set(false);
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
