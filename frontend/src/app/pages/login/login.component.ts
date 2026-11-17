import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/services/api.config';

@Component({ selector: 'app-login', standalone: true, imports: [FormsModule, RouterLink], templateUrl: './login.component.html', styleUrl: './login.component.css' })
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  email = '';
  password = '';
  busy = false;
  error = '';

  submit(): void {
    if (!this.email.trim() || !this.password) return;
    this.busy = true; this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.busy = false;
        const next = this.route.snapshot.queryParamMap.get('next') || (this.auth.currentUser()?.role === 'admin' ? '/admin' : '/home');
        this.router.navigateByUrl(next.startsWith('/') && !next.startsWith('//') ? next : '/home');
      },
      error: error => { this.busy = false; this.error = apiErrorMessage(error); }
    });
  }
}
