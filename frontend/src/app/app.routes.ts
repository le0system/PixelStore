import { adminGuard } from './core/guards/admin.guard';
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'login', title: 'Entrar | Pixel Store', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'cadastro', title: 'Criar conta | Pixel Store', loadComponent: () => import('./pages/cadastro/cadastro.component').then(m => m.CadastroComponent) },
  { path: 'home', title: 'Pixel Store | Início', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'catalogo', title: 'Catálogo | Pixel Store', loadComponent: () => import('./pages/catalogo/catalogo.component').then(m => m.CatalogoComponent) },
  { path: 'jogo/:id', title: 'Detalhes do jogo | Pixel Store', loadComponent: () => import('./pages/detalhes-jogo/detalhes-jogo.component').then(m => m.DetalhesJogoComponent) },
  { path: 'carrinho', title: 'Carrinho | Pixel Store', loadComponent: () => import('./pages/carrinho/carrinho.component').then(m => m.CarrinhoComponent) },
  { path: 'checkout', title: 'Finalizar pedido | Pixel Store', canActivate: [authGuard], loadComponent: () => import('./pages/checkout/checkout.component').then(m => m.CheckoutComponent) },
  { path: 'perfil', title: 'Meu perfil | Pixel Store', canActivate: [authGuard], loadComponent: () => import('./pages/perfil/perfil.component').then(m => m.PerfilComponent) },
  { path: 'admin', title: 'Administração | Pixel Store', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent) },
  { path: '**', redirectTo: 'home' }
];
