import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <div class="logo">
            <mat-icon>account_balance_wallet</mat-icon>
            <h1>FinFlow</h1>
          </div>
          <p class="subtitle">Controle financeiro inteligente</p>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>E-mail</mat-label>
              <input matInput type="email" formControlName="email" placeholder="seu@email.com">
              <mat-icon matSuffix>email</mat-icon>
              @if (form.get('email')?.hasError('required')) {
                <mat-error>E-mail obrigatório</mat-error>
              }
              @if (form.get('email')?.hasError('email')) {
                <mat-error>E-mail inválido</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Senha</mat-label>
              <input matInput [type]="showPassword ? 'text' : 'password'" formControlName="password">
              <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword">
                <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password')?.hasError('required')) {
                <mat-error>Senha obrigatória</mat-error>
              }
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit"
              class="full-width submit-btn" [disabled]="loading">
              @if (loading) { <mat-spinner diameter="20"></mat-spinner> }
              @else { Entrar }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-background);
      padding: 1rem;
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(74, 111, 165, 0.12);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
      width: 100%;
      justify-content: center;
    }
    .logo mat-icon { font-size: 2rem; height: 2rem; width: 2rem; color: var(--color-primary); }
    .logo h1 { margin: 0; font-size: 1.75rem; font-weight: 700; color: var(--color-primary); }
    .subtitle { text-align: center; color: var(--color-text-secondary); margin: 0 0 1.5rem; width: 100%; }
    .full-width { width: 100%; }
    .submit-btn { height: 48px; margin-top: 0.5rem; font-size: 1rem; font-weight: 600; }
    mat-card-header { display: flex; flex-direction: column; align-items: center; padding-bottom: 0; }
  `]
})
export class LoginComponent {
  form: ReturnType<FormBuilder['group']>;
  loading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: res => {
        if (res.success) this.router.navigate(['/dashboard']);
        else this.showError(res.error ?? 'Erro ao fazer login');
      },
      error: () => this.showError('Credenciais inválidas. Verifique e tente novamente.'),
      complete: () => this.loading = false
    });
  }

  private showError(msg: string): void {
    this.loading = false;
    this.snack.open(msg, 'Fechar', { duration: 4000 });
  }
}
