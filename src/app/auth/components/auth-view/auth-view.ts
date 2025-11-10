import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { Login } from '../login/login';
import { Register } from '../register/register';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-view',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ToastModule,
    Login,
    Register
  ],
  providers: [MessageService],
  templateUrl: './auth-view.html',
  styleUrl: './auth-view.scss',
})
export class AuthView implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);

  activeTab: 'login' | 'register' = 'login';
  loadingGoogle = false;

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      if (data['mode'] === 'register') {
        this.activeTab = 'register';
      } else {
        this.activeTab = 'login';
      }
    });
  }

  switchTab(tab: 'login' | 'register'): void {
    this.activeTab = tab;
  }

  loginWithGoogle(): void {
    this.loadingGoogle = true;
    
    this.authService.loginWithGoogle()
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'info',
            summary: 'Redirigiendo',
            detail: 'Redirigiendo a Google para autenticación...'
          });
        },
        error: (error) => {
          this.loadingGoogle = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo iniciar sesión con Google'
          });
        }
      });
  }

  goToPasswordRecovery(): void {
    this.router.navigate(['/auth/password-recovery']);
  }
}
