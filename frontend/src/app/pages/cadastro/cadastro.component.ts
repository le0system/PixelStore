import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/services/api.config';

@Component({ selector: 'app-cadastro', standalone: true, imports: [FormsModule, RouterLink], templateUrl: './cadastro.component.html', styleUrl: './cadastro.component.css' })
export class CadastroComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  busy = false;
  error = '';

  submit(): void {
    if (this.password !== this.confirmPassword) { this.error = 'As senhas não coincidem.'; return; }
    if (this.password.length < 6) { this.error = 'Use pelo menos 6 caracteres na senha.'; return; }
    this.busy = true; this.error = '';
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: () => { this.busy = false; this.router.navigate(['/home']); },
      error: error => { this.busy = false; this.error = apiErrorMessage(error); }
    });
  }
}
