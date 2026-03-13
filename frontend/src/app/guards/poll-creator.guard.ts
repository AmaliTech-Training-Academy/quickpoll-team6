import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map, of, switchMap, take } from 'rxjs';

import { AuthService } from '@/services/auth.service';
import { PollService } from '@/services/poll.service';

export const pollCreatorGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const pollService = inject(PollService);
  const router = inject(Router);

  const pollId = Number(route.paramMap.get('id'));
  if (!pollId || isNaN(pollId)) {
    router.navigate(['/403']);
    return false;
  }

  return authService.getProfile().pipe(
    take(1),
    switchMap((value, idx) => {
      if (value.role.toLowerCase() === 'admin') {
        return of(true);
      }
      return pollService.getById(pollId).pipe(
        take(1),
        map((poll) => {
          const creatorEmail = poll.creatorEmail;
          if (creatorEmail === value.email) {
            return true;
          }
          router.navigate(['/403']);
          return false;
        }),
      );
    }),
  );
};
