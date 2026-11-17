import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthPayload, User } from '../models/user.model';
import { API_URL } from './api.config';

const TOKEN_KEY = 'pixelstore.token';
const USER_KEY = 'pixelstore.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly currentUser = signal<User | null>(this.restoreUser());

  get token(): string { return localStorage.getItem(TOKEN_KEY) || ''; }
  get isLoggedIn(): boolean { return !!this.token; }
  get authorizationHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.token}` });
  }

  login(email: string, password: string): Observable<AuthPayload> {
    return this.http.post<AuthPayload>(`${API_URL}/auth/login`, { email, password })
      .pipe(tap(result => this.saveSession(result)));
  }

  register(name: string, email: string, password: string): Observable<AuthPayload> {
    return this.http.post<AuthPayload>(`${API_URL}/auth/register`, { name, email, password })
      .pipe(tap(result => this.saveSession(result)));
  }

  me(): Observable<User> {
    return this.http.get<User>(`${API_URL}/auth/me`, { headers: this.authorizationHeaders })
      .pipe(tap(user => { this.currentUser.set(user); localStorage.setItem(USER_KEY, JSON.stringify(user)); }));
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/logout`, {}, { headers: this.authorizationHeaders })
      .pipe(tap(() => this.clearSession()));
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
  }

  private saveSession({ token, user }: AuthPayload): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private restoreUser(): User | null {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') as User | null; }
    catch { return null; }
  }
}
