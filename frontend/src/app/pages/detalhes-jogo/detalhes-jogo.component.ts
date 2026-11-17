import { imageUrl } from '../../core/models/game.model';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Game } from '../../core/models/game.model';
import { GamesService } from '../../core/services/games.service';
import { CartService } from '../../core/services/cart.service';
import { apiErrorMessage } from '../../core/services/api.config';

@Component({ selector: 'app-detalhes-jogo', standalone: true, imports: [CurrencyPipe, RouterLink], templateUrl: './detalhes-jogo.component.html', styleUrl: './detalhes-jogo.component.css' })
export class DetalhesJogoComponent implements OnInit, OnDestroy {
  readonly imageUrl = imageUrl;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly games = inject(GamesService);
  readonly cart = inject(CartService);
  private sub?: Subscription;
  game: Game | null = null;
  loading = true;
  error = '';
  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      this.loading = true; this.error = ''; this.game = null;
      if (!Number.isSafeInteger(id) || id < 1) { this.error = 'Jogo inválido.'; this.loading = false; return; }
      this.games.get(id).subscribe({
        next: game => { this.game = game; this.loading = false; },
        error: error => { this.error = apiErrorMessage(error); this.loading = false; }
      });
    });
  }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }
  add(): void { if (this.game) { this.cart.add(this.game); this.router.navigate(['/carrinho']); } }
}
