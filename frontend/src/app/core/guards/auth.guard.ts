import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

export const authGuard: CanActivateFn = () => {
  const storage = inject(StorageService);
  const router = inject(Router);
  return storage.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const storage = inject(StorageService);
  const router = inject(Router);
  return !storage.isLoggedIn() ? true : router.createUrlTree(['/dashboard']);
};

export const adminGuard: CanActivateFn = () => {
  const storage = inject(StorageService);
  const router = inject(Router);
  if (!storage.isLoggedIn()) return router.createUrlTree(['/login']);
  return storage.user()?.role === 'admin' ? true : router.createUrlTree(['/dashboard']);
};
