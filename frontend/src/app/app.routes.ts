import { Routes } from '@angular/router';
import { PollListComponent } from './pages/poll-list.component';
import { PollDetailsComponent } from './pages/poll-details.component';
import { PollMetricsComponent } from './pages/poll-metrics.component';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register.component';
import { CreatePollComponent } from './pages/create-poll.component';
import { NotFoundComponent } from './pages/404.component';
import { LandingComponent } from './pages/landing.component';
import { ProfileComponent } from './pages/profile.component';
import { authGuard } from './guards/auth.guard';
import { AuthLayoutComponent } from './components/layout/auth-layout.component';
import { AccountLayoutComponent } from './components/layout/account-layout.component';
import { LayoutComponent } from './components/layout/layout.component';
import { PollDetailsLayoutComponent } from './components/layout/poll-details-layout.component';
import { pollCreatorGuard } from './guards/poll-creator.guard';
import { PermissionDeniedComponent } from './pages/403.component';
import { CreatedPollListComponent } from './pages/created-poll-list.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: LandingComponent },
  {
    path: 'account',
    component: AuthLayoutComponent,
  },
  {
    path: '~',
    canActivate: [authGuard],
    component: LayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'polls',
        pathMatch: 'full',
      },
      {
        path: 'polls',
        children: [
          { path: '', component: PollListComponent },
          { path: 'new', component: CreatePollComponent },
          { path: 'me', component: CreatedPollListComponent },
          {
            path: ':id',
            canActivate: [pollCreatorGuard],
            component: PollDetailsLayoutComponent,
            children: [
              { path: '', component: PollMetricsComponent },
              { path: 'details', component: PollDetailsComponent },
            ],
          },
        ],
      },
      {
        path: 'account',
        component: AccountLayoutComponent,
        children: [
          { path: '', redirectTo: 'profile', pathMatch: 'full' },
          { path: 'profile', component: ProfileComponent },
          { path: 'teams', component: NotFoundComponent },
          { path: 'settings', component: NotFoundComponent },
        ],
      },
    ],
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: '', redirectTo: 'register', pathMatch: 'full' },
      { path: 'register', component: RegisterComponent },
      { path: 'login', component: LoginComponent },
    ],
  },
  { path: '403', component: PermissionDeniedComponent },
  { path: '**', component: NotFoundComponent },
];
