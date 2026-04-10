import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthResponse } from '../models/models';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly url = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient, private storage: StorageService) {}

  login(email: string, password: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.url}/login`, { email, password }).pipe(
      tap(res => { if (res.success && res.data) this.storage.setAuth(res.data); })
    );
  }

  register(name: string, email: string, password: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.url}/register`, { name, email, password }).pipe(
      tap(res => { if (res.success && res.data) this.storage.setAuth(res.data); })
    );
  }

  logout(): void {
    const token = this.storage.getRefreshToken();
    if (token) {
      this.http.post(`${this.url}/revoke`, { token }).subscribe();
    }
    this.storage.clearAuth();
  }

  refresh(): Observable<ApiResponse<AuthResponse>> {
    const token = this.storage.getRefreshToken() ?? '';
    return this.http.post<ApiResponse<AuthResponse>>(`${this.url}/refresh`, { token }).pipe(
      tap(res => { if (res.success && res.data) this.storage.setAuth(res.data); })
    );
  }
}
