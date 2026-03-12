import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map, switchMap, take } from 'rxjs';

import { AuthService } from '@/services/auth.service';
import { PollService } from '@/services/poll.service';

export const pollCreatorGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const pollService = inject(PollService);
  const router = inject(Router);

  const pollId = Number(route.paramMap.get('id'));
  if (!pollId || isNaN(pollId)) {
    console.log("could not get poll id")
    router.navigate(['/403']);
    return false;
  }

  return authService.getProfile().pipe(
    take(1),
    switchMap((user) => {
      return pollService.getById(pollId).pipe(
        take(1),
        map((poll) => {
          const creatorEmail = poll.creatorEmail;
          if (creatorEmail === user.email) {
            return true;
          }
          router.navigate(['/403']);
          return false;
        }),
      );
    }),
  );
};
