import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule],
  template: `
    <div class="callback-container">
      <p-progressSpinner></p-progressSpinner>
      <p class="callback-message">Procesando autenticación...</p>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%);
    }

    .callback-message {
      margin-top: 2rem;
      font-size: 1.2rem;
      color: var(--text-color);
    }
  `]
})
export class AuthCallback implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit(): void {
    setTimeout(() => {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/auth/login']);
      }
    }, 2000);
  }
}
