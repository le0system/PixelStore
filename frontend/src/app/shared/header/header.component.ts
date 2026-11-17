import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header', standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  query = '';
  menuOpen = false;

  search(): void {
    this.router.navigate(['/catalogo'], { queryParams: this.query.trim() ? { q: this.query.trim() } : {} });
    this.menuOpen = false;
  }
  closeMenu(): void { this.menuOpen = false; }
}
