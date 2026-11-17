import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { API_URL } from './api.config';
import { Order } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  list(): Observable<Order[]> {
    return this.http.get<Order[]>(`${API_URL}/orders`, { headers: this.auth.authorizationHeaders });
  }

  place(gameIds: number[], paymentMethod: 'pix' | 'cartao'): Observable<Order> {
    return this.http.post<Order>(`${API_URL}/orders`, { gameIds, paymentMethod },
      { headers: this.auth.authorizationHeaders });
  }
}
