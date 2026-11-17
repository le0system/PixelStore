import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { OrdersService } from '../../core/services/orders.service';
import { apiErrorMessage } from '../../core/services/api.config';
import { Order } from '../../core/models/order.model';

@Component({ selector: 'app-checkout', standalone: true, imports: [CurrencyPipe, RouterLink], templateUrl: './checkout.component.html', styleUrl: './checkout.component.css' })
export class CheckoutComponent implements OnInit {
  loading = true;
  cartReady = false;
  notice = "";
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  private readonly orders = inject(OrdersService);
  paymentMethod: 'pix' | 'cartao' = 'pix';
  submitting = false;
  error = '';
  completed: Order | null = null;

  ngOnInit(): void {
    this.cart.refresh().subscribe({
      next: changed => { this.loading = false; this.cartReady = true; if (changed) this.notice = 'Carrinho atualizado com os dados atuais. Confira os itens e o total antes de confirmar.'; },
      error: error => { this.loading = false; this.error = apiErrorMessage(error); }
    });
  }

  select(method: 'pix' | 'cartao'): void { this.paymentMethod = method; }
  confirm(): void {
    if (this.submitting || !this.cartReady || !this.cart.count()) return;
    this.submitting = true; this.error = '';
    this.orders.place(this.cart.items().map(item => item.id), this.paymentMethod).subscribe({
      next: order => { this.completed = order; this.cart.clear(); this.submitting = false; },
      error: error => {
        this.error = apiErrorMessage(error);
        this.submitting = false;
        if ((error as { status?: number }).status === 401) this.auth.clearSession();
      }
    });
  }
}
