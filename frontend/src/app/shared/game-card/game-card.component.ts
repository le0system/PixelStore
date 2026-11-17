import { imageUrl } from '../../core/models/game.model';
import { Component, Input, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Game } from '../../core/models/game.model';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-game-card', standalone: true, imports: [CurrencyPipe, RouterLink],
  templateUrl: './game-card.component.html', styleUrl: './game-card.component.css'
})
export class GameCardComponent {
  readonly imageUrl = imageUrl;
  @Input({ required: true }) game!: Game;
  readonly cart = inject(CartService);
  add(): void { this.cart.add(this.game); }
}
