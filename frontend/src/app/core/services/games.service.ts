import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Game, GameSort, Platform } from '../models/game.model';
import { API_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class GamesService {
  private readonly http = inject(HttpClient);

  list(filters: { platform?: Platform | ''; q?: string; sort?: GameSort } = {}): Observable<Game[]> {
    let params = new HttpParams();
    if (filters.platform) params = params.set('platform', filters.platform);
    if (filters.q) params = params.set('q', filters.q);
    if (filters.sort) params = params.set('sort', filters.sort);
    return this.http.get<Game[]>(`${API_URL}/games`, { params });
  }

  get(id: number): Observable<Game> { return this.http.get<Game>(`${API_URL}/games/${id}`); }
}
