import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminService, AdminStats, AdminOrder, GameInput } from '../../core/services/admin.service';
import { Game, PLATFORMS, imageUrl } from '../../core/models/game.model';
import { apiErrorMessage } from '../../core/services/api.config';

@Component({
  selector: 'app-admin', standalone: true,
  imports: [FormsModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './admin.component.html', styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  readonly platforms = PLATFORMS;
  readonly imageUrl = imageUrl;
  section = 'painel';
  stats: AdminStats | null = null;
  games: Game[] = [];
  orders: AdminOrder[] = [];
  q = ''; platform = '';
  loading = false; busy = false; error = ''; success = '';
  editingId: number | null = null;
  formOpen = false;
  price: number | null = 0;
  form: GameInput = this.emptyForm();

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.section = params.get('area') || 'painel';
      this.error = ''; this.success = ''; this.formOpen = false;
      this.load();
    });
  }
  private emptyForm(): GameInput {
    return { title: '', description: '', platform: 'PC', genre: '', priceCents: 0,
      cover: '', available: true, featured: false, releaseYear: new Date().getFullYear() };
  }
  load(): void {
    this.loading = true;
    const fail = (error: unknown) => { this.loading = false; this.error = apiErrorMessage(error); };
    if (this.section === 'jogos') this.api.games(this.q.trim(), this.platform).subscribe({
      next: games => { this.games = games; this.loading = false; }, error: fail
    });
    else if (this.section === 'pedidos') this.api.orders().subscribe({
      next: orders => { this.orders = orders; this.loading = false; }, error: fail
    });
    else this.api.stats().subscribe({ next: stats => { this.stats = stats; this.loading = false; }, error: fail });
  }
  edit(game?: Game): void {
    this.error = ''; this.success = ''; this.formOpen = true;
    this.editingId = game?.id ?? null;
    this.form = game ? { ...game } : this.emptyForm();
    this.price = this.form.priceCents / 100;
  }
  save(): void {
    if (this.busy) return;
    this.error = ''; this.success = '';
    if (this.price === null || !Number.isFinite(this.price) || this.price < 0 || this.price > 1000000 ||
        Math.abs(this.price * 100 - Math.round(this.price * 100)) > 0.000001) {
      this.error = 'Informe um preço válido com até duas casas decimais.'; return;
    }
    this.busy = true;
    const data = { ...this.form, priceCents: Math.round(this.price * 100) };
    const request = this.editingId === null ? this.api.create(data) : this.api.update(this.editingId, data);
    request.subscribe({
      next: () => { this.busy = false; this.formOpen = false; this.success = 'Jogo salvo com sucesso.'; this.load(); },
      error: error => { this.busy = false; this.error = apiErrorMessage(error); }
    });
  }
  remove(game: Game): void {
    if (this.busy || !window.confirm(`Excluir “${game.title}”? Os pedidos anteriores serão preservados.`)) return;
    this.busy = true; this.error = ''; this.success = '';
    this.api.delete(game.id).subscribe({
      next: () => { this.busy = false; this.success = 'Jogo excluído com sucesso.'; this.load(); },
      error: error => { this.busy = false; this.error = apiErrorMessage(error); }
    });
  }
}
