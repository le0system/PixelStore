import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameCardComponent } from '../../shared/game-card/game-card.component';
import { GamesService } from '../../core/services/games.service';
import { Game, GameSort, Platform, PLATFORMS } from '../../core/models/game.model';
import { apiErrorMessage } from '../../core/services/api.config';

@Component({ selector: 'app-catalogo', standalone: true, imports: [FormsModule, GameCardComponent], templateUrl: './catalogo.component.html', styleUrl: './catalogo.component.css' })
export class CatalogoComponent implements OnInit, OnDestroy {
  private readonly gamesService = inject(GamesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private routeSub?: Subscription;
  private loadSub?: Subscription;
  readonly platforms = PLATFORMS;
  games: Game[] = [];
  selectedPlatform = '';
  searchTerm = '';
  sort: GameSort = 'featured';
  loading = true;
  error = '';

  ngOnInit(): void {
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const platform = params.get('platform') || '';
      this.selectedPlatform = this.platforms.includes(platform as Platform) ? platform : '';
      this.searchTerm = params.get('q') || '';
      const sort = params.get('sort') || 'featured';
      this.sort = ['featured','price_asc','price_desc','recent','title'].includes(sort) ? sort as GameSort : 'featured';
      this.load();
    });
  }
  ngOnDestroy(): void { this.routeSub?.unsubscribe(); this.loadSub?.unsubscribe(); }
  apply(): void {
    this.router.navigate(['/catalogo'], { queryParams: {
      platform: this.selectedPlatform || null,
      q: this.searchTerm.trim() || null,
      sort: this.sort === 'featured' ? null : this.sort
    } });
  }
  selectPlatform(platform: string): void { this.selectedPlatform = platform; this.apply(); }
  clear(): void { this.selectedPlatform = ''; this.searchTerm = ''; this.sort = 'featured'; this.apply(); }
  private load(): void {
    this.loadSub?.unsubscribe(); this.loading = true; this.error = '';
    this.loadSub = this.gamesService.list({ platform: this.selectedPlatform as Platform, q: this.searchTerm, sort: this.sort }).subscribe({
      next: games => { this.games = games; this.loading = false; },
      error: error => { this.error = apiErrorMessage(error); this.loading = false; }
    });
  }
}
