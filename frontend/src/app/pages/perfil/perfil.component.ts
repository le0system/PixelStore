import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OrdersService } from '../../core/services/orders.service';
import { CartService } from '../../core/services/cart.service';
import { Order } from '../../core/models/order.model';
import { apiErrorMessage } from '../../core/services/api.config';

@Component({ selector: 'app-perfil', standalone: true, imports: [CurrencyPipe, DatePipe, RouterLink], templateUrl: './perfil.component.html', styleUrl: './perfil.component.css' })
export class PerfilComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly ordersService = inject(OrdersService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  orders: Order[] = [];
  loading = true;
  error = '';
  ngOnInit(): void {
    this.auth.me().subscribe({
      next: () => this.loadOrders(),
      error: error => {
        this.error = apiErrorMessage(error); this.loading = false;
        if ((error as { status?: number }).status === 401) { this.auth.clearSession(); this.router.navigate(['/login']); }
      }
    });
  }
  private loadOrders(): void {
    this.ordersService.list().subscribe({
      next: orders => { this.orders = orders; this.loading = false; },
      error: error => { this.error = apiErrorMessage(error); this.loading = false; }
    });
  }
  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.endSession(),
      error: () => this.endSession() // encerra a sessão local mesmo se a API não responder
    });
  }
  private endSession(): void { this.auth.clearSession(); this.cart.clear(); this.router.navigate(['/home']); }
}
