import { Routes } from '@angular/router';
import { PollListComponent } from './pages/poll-list.component';
import { PollDetailsComponent } from './pages/poll-details.component';
import { PollMetricsComponent } from './pages/poll-metrics.component';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register.component';
import { CreatePollComponent } from './pages/create-poll.component';
import { NotFoundComponent } from './pages/not-found.component';
import { LandingComponent } from './pages/landing.component';
import { ProfileComponent } from './pages/profile.component';
import { authGuard } from './guards/auth.guard';
import { AuthLayoutComponent } from './components/layout/auth-layout.component';

import { AccountLayoutComponent } from './components/layout/account-layout.component';
import { LayoutComponent } from './components/layout/layout.component';
import { PollDetailsLayoutComponent } from './components/layout/poll-details-layout.component';

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
          {
            path: ':id',
            component: PollDetailsLayoutComponent,
            children: [
              { path: '', redirectTo: 'metrics', pathMatch: 'full' },
              { path: 'details', component: PollDetailsComponent },
              { path: 'metrics', component: PollMetricsComponent },
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
          // { path: 'teams', component: CreatePollComponent },
          // { path: 'settings', component: PollListComponent },
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
  { path: '**', component: NotFoundComponent },
];
