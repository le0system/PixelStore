import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuthService } from './auth.service';
import { API_URL } from './api.config';
import { Game } from '../models/game.model';
import { Order } from '../models/order.model';
export type GameInput = Omit<Game, 'id' | 'slug'>;
export interface AdminStats { games: number; users: number; orders: number; }
export interface AdminOrder extends Order { userId: number; }
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private get options() { return { headers: this.auth.authorizationHeaders }; }
  stats() { return this.http.get<AdminStats>(`${API_URL}/admin/stats`, this.options); }
  orders() { return this.http.get<AdminOrder[]>(`${API_URL}/admin/orders`, this.options); }
  games(q: string, platform: string) {
    return this.http.get<Game[]>(`${API_URL}/games`, { params: new HttpParams().set('q', q).set('platform', platform) });
  }
  create(game: GameInput) { return this.http.post<Game>(`${API_URL}/games`, game, this.options); }
  update(id: number, game: GameInput) { return this.http.put<Game>(`${API_URL}/games/${id}`, game, this.options); }
  delete(id: number) { return this.http.delete<void>(`${API_URL}/games/${id}`, this.options); }
}
