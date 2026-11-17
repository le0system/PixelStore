import { imageUrl } from '../../core/models/game.model';
import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { apiErrorMessage } from '../../core/services/api.config';

@Component({ selector: 'app-carrinho', standalone: true, imports: [CurrencyPipe, RouterLink], templateUrl: './carrinho.component.html', styleUrl: './carrinho.component.css' })
export class CarrinhoComponent implements OnInit {
  readonly imageUrl = imageUrl;
  readonly cart = inject(CartService);
  loading = true; error = ''; notice = '';
  ngOnInit(): void {
    this.cart.refresh().subscribe({
      next: changed => { this.loading = false; if (changed) this.notice = 'Carrinho atualizado: preços e dados foram revisados; jogos excluídos ou indisponíveis foram removidos.'; },
      error: error => { this.loading = false; this.error = apiErrorMessage(error); }
    });
  }
}
