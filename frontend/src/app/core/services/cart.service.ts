import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { map } from 'rxjs';
import { GamesService } from './games.service';
import { Game } from '../models/game.model';

export interface CartItem {
  id: number; title: string; platform: string;
  priceCents: number; cover: string; genre: string;
}
const KEY = 'pixelstore.cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly games = inject(GamesService);
  readonly items = signal<CartItem[]>(this.restore());
  readonly count = computed(() => this.items().length);
  readonly totalCents = computed(() => this.items().reduce((total, game) => total + game.priceCents, 0));

  constructor() { effect(() => localStorage.setItem(KEY, JSON.stringify(this.items()))); }

  add(game: Game): void {
    if (!game.available || this.has(game.id)) return; // licença digital: uma unidade por plataforma/jogo
    this.items.update(items => [...items, {
      id: game.id, title: game.title, platform: game.platform,
      priceCents: game.priceCents, cover: game.cover, genre: game.genre
    }]);
  }

  refresh() {
    return this.games.list().pipe(map(games => {
      const current = this.items();
      const next = current.flatMap(item => {
        const game = games.find(game => game.id === item.id && game.available);
        return game ? [{ id: game.id, title: game.title, platform: game.platform,
          priceCents: game.priceCents, cover: game.cover, genre: game.genre }] : [];
      });
      const changed = JSON.stringify(current) !== JSON.stringify(next);
      if (changed) this.items.set(next);
      return changed;
    }));
  }

  has(gameId: number): boolean { return this.items().some(game => game.id === gameId); }
  remove(gameId: number): void { this.items.update(items => items.filter(game => game.id !== gameId)); }
  clear(): void { this.items.set([]); }

  private restore(): CartItem[] {
    try {
      const data: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(data)) return [];
      return data.filter(item => item && Number.isSafeInteger(item.id) && typeof item.title === 'string'
        && Number.isSafeInteger(item.priceCents) && typeof item.cover === 'string') as CartItem[];
    } catch { return []; }
  }
}
