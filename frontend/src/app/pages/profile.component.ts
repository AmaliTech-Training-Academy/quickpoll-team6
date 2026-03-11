import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@/services/auth.service';
import { User } from '@/models';
import { ButtonComponent } from '@/components/ui/primitives/button.component';
import { InputComponent } from '@/components/ui/primitives/input.component';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, InputComponent, FormsModule],
  template: `
    <div class="flex max-lg:flex-col gap-16">
      <div class="flex flex-col gap-5 md:min-w-100">
        <div class="w-full aspect-square border rounded-xl bg-secondary/50"></div>
        <div class="flex gap-2">
          @if (isEditing()) {
            <button app-button variant="primary" (click)="saveEdit()">Save</button>
            <button app-button variant="outline" (click)="cancelEdit()">Cancel</button>
          } @else {
            <button app-button variant="primary" (click)="startEdit()">Edit Profile</button>
          }
          <button app-button variant="destructive" (click)="logout()">Logout</button>
        </div>
      </div>

      <div class="flex flex-col gap-3 w-full">
        <div class="border bg-surface flex flex-col gap-2 px-4 py-6 rounded-lg">
          <p class="text-sm text-muted-foreground font-medium">Name</p>
          @if (isEditing()) {
            <input app-input [(ngModel)]="editName" />
          } @else {
            <p class="text-sm">{{ user()?.fullName }}</p>
          }
        </div>

        <div class="border bg-surface flex flex-col gap-2 px-4 py-6 rounded-lg">
          <p class="text-sm text-muted-foreground font-medium">Email</p>
          <p class="text-sm">{{ user()?.email }}</p>
        </div>

        <div class="border bg-surface flex flex-col gap-2 px-4 py-6 rounded-lg">
          <p class="text-sm text-muted-foreground font-medium">Role</p>
          <p class="text-sm">{{ user()?.role }}</p>
        </div>
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  protected user = signal<User | null>(null);
  protected isEditing = signal(false);
  protected editName = '';

  ngOnInit() {
    this.authService.getProfile().subscribe((profile) => {
      this.user.set(profile);
    });
  }

  startEdit() {
    this.editName = this.user()?.fullName ?? '';
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
