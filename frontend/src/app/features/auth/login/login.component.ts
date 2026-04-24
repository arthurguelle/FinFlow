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
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDividerModule
  ],
  template: `
    <div class="login-page">
      <aside class="login-hero" aria-label="Apresentação">
        <div class="hero-inner">
          <div class="hero-brand">
            <mat-icon class="hero-icon" aria-hidden="true">account_balance_wallet</mat-icon>
            <span class="hero-title">FinFlow</span>
          </div>
          <p class="hero-lead">
            Controle de gastos com categorias, dashboard e extração por IA — pensado para clareza e sobriedade visual.
          </p>
          <ul class="hero-list">
            <li><mat-icon inline>check_circle</mat-icon> Dashboard com receitas, dívidas e saldo</li>
            <li><mat-icon inline>check_circle</mat-icon> Categorias e filtros nos gastos</li>
            <li><mat-icon inline>check_circle</mat-icon> Conta demo para explorar sem cadastro</li>
          </ul>
        </div>
      </aside>

      <div class="login-panel">
        <mat-card class="login-card">
          <mat-card-header>
            <div class="card-heading">
              <h1>Entrar</h1>
              <p class="subtitle">Use sua conta ou experimente o modo visitante.</p>
            </div>
          </mat-card-header>

          <mat-card-content>
            <button mat-stroked-button type="button" class="demo-btn" (click)="entrarComoDemo()"
              [disabled]="loading">
              @if (demoLoading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>travel_explore</mat-icon>
              }
              Experimentar conta demo
            </button>
            <p class="demo-hint">A importação de PDF está desativada na demo; o restante das funcionalidades está disponível.</p>

            <div class="divider-row">
              <mat-divider class="grow"></mat-divider>
              <span>ou e-mail</span>
              <mat-divider class="grow"></mat-divider>
            </div>

            <form [formGroup]="form" (ngSubmit)="submit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>E-mail</mat-label>
                <input matInput type="email" formControlName="email" placeholder="seu@email.com" autocomplete="username">
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
                <input matInput [type]="showPassword ? 'text' : 'password'" formControlName="password" autocomplete="current-password">
                <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword">
                  <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (form.get('password')?.hasError('required')) {
                  <mat-error>Senha obrigatória</mat-error>
                }
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit"
                class="full-width submit-btn" [disabled]="loading">
                @if (loading && !demoLoading) { <mat-spinner diameter="20"></mat-spinner> }
                @else { Entrar }
              </button>
            </form>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr minmax(360px, 440px);
      background: var(--color-background);
    }
    @media (max-width: 960px) {
      .login-page { grid-template-columns: 1fr; }
      .login-hero { min-height: auto; padding: 2rem 1.5rem 1rem; }
    }
    .login-hero {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem;
      background: linear-gradient(160deg, rgba(45, 106, 79, 0.12) 0%, rgba(244, 247, 244, 0.95) 55%, var(--color-background) 100%);
      border-right: 1px solid var(--color-border);
    }
    @media (max-width: 960px) {
      .login-hero { border-right: none; border-bottom: 1px solid var(--color-border); }
    }
    .hero-inner { max-width: 420px; }
    .hero-brand { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
    .hero-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; color: var(--color-primary); }
    .hero-title {
      font-family: "DM Sans", Roboto, sans-serif;
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text-primary);
      letter-spacing: -0.02em;
    }
    .hero-lead {
      margin: 0 0 1.25rem;
      font-size: 1.05rem;
      line-height: 1.55;
      color: var(--color-text-secondary);
    }
    .hero-list {
      margin: 0;
      padding: 0;
      list-style: none;
      color: var(--color-text-primary);
      font-size: 0.95rem;
      line-height: 1.7;
    }
    .hero-list li { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.35rem; }
    .hero-list mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: var(--color-primary); margin-top: 0.15rem; }

    .login-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 1.75rem 1.75rem 2rem;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(45, 106, 79, 0.12);
    }
    .card-heading { width: 100%; padding-bottom: 0.25rem; }
    .card-heading h1 {
      margin: 0;
      font-family: "DM Sans", Roboto, sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }
    .subtitle { margin: 0.35rem 0 0; color: var(--color-text-secondary); font-size: 0.9rem; }
    .demo-btn {
      width: 100%;
      height: 48px;
      margin-bottom: 0.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-weight: 600;
    }
    .demo-hint {
      margin: 0 0 1rem;
      font-size: 0.8rem;
      line-height: 1.4;
      color: var(--color-text-secondary);
    }
    .divider-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0.5rem 0 1rem;
      color: var(--color-text-secondary);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .divider-row .grow { flex: 1; min-width: 0; }
    .full-width { width: 100%; }
    .submit-btn { height: 48px; margin-top: 0.5rem; font-size: 1rem; font-weight: 600; }
    mat-card-header { display: block; padding: 0; margin-bottom: 0.5rem; }
  `]
})
export class LoginComponent {
  form: ReturnType<FormBuilder['group']>;
  loading = false;
  demoLoading = false;
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
    this.demoLoading = false;
    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: res => {
        if (res.success) this.router.navigate(['/dashboard']);
        else this.showError(res.error ?? 'Erro ao fazer login');
      },
      error: () => this.showError('Credenciais inválidas. Verifique e tente novamente.'),
      complete: () => { this.loading = false; }
    });
  }

  entrarComoDemo(): void {
    this.loading = true;
    this.demoLoading = true;
    this.auth.login(environment.demoEmail, environment.demoPassword).subscribe({
      next: res => {
        if (res.success) {
          this.snack.open('Modo visitante: explore o app; PDF permanece desativado.', 'OK', { duration: 5000 });
          this.router.navigate(['/dashboard']);
        } else {
          this.showError(res.error ?? 'Conta demo indisponível. Execute o script SQL 005 no banco.');
        }
      },
      error: () => this.showError('Não foi possível entrar na conta demo. Verifique a API e o seed 005.'),
      complete: () => {
        this.loading = false;
        this.demoLoading = false;
      }
    });
  }

  private showError(msg: string): void {
    this.loading = false;
    this.demoLoading = false;
    this.snack.open(msg, 'Fechar', { duration: 5000 });
  }
}
