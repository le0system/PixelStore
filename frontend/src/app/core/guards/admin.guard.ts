import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService), router = inject(Router);
  if (!auth.isLoggedIn) return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
  return auth.me().pipe(
    map(user => user.role === 'admin' ? true : router.createUrlTree(['/home'])),
    catchError(() => of(router.createUrlTree(['/login'], { queryParams: { next: state.url } })))
  );
};
