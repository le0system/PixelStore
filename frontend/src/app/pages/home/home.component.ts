import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameCardComponent } from '../../shared/game-card/game-card.component';
import { GamesService } from '../../core/services/games.service';
import { Game } from '../../core/models/game.model';
import { apiErrorMessage } from '../../core/services/api.config';

@Component({ selector: 'app-home', standalone: true, imports: [RouterLink, GameCardComponent], templateUrl: './home.component.html', styleUrl: './home.component.css' })
export class HomeComponent implements OnInit {
  private readonly gamesService = inject(GamesService);
  featured: Game[] = [];
  totalGames = 0;
  loading = true;
  error = '';
  ngOnInit(): void {
    this.gamesService.list({ sort: 'featured' }).subscribe({
      next: games => { this.totalGames = games.length; this.featured = games.filter(g => g.featured).slice(0, 8); this.loading = false; },
      error: error => { this.error = apiErrorMessage(error); this.loading = false; }
    });
  }
}
