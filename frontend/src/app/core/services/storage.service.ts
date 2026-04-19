import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthResponse, UserDto } from '../models/models';

const TOKEN_KEY = 'finflow_token';
const REFRESH_KEY = 'finflow_refresh';
const USER_KEY = 'finflow_user';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private _user = signal<UserDto | null>(this.loadUser());

  readonly user = this._user.asReadonly();

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setAuth(auth: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, auth.accessToken);
    localStorage.setItem(REFRESH_KEY, auth.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    this._user.set(auth.user);
  }

  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private loadUser(): UserDto | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as UserDto;
      // Se o objeto salvo não tem `role` (sessão anterior ao suporte de roles),
      // invalida a sessão para forçar novo login com dados atualizados.
      if (!parsed.role) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
