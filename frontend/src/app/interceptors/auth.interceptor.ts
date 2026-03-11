import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
    'Access-Control-Allow-Origin': ''
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  req = req.clone({
    setHeaders: headers,
  });

  return next(req);
};
