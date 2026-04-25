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

type View = 'login' | 'register' | 'forgot';

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
      <!-- Hero esquerdo: imagem com moldura centralizada a 70% -->
      <aside class="login-hero" aria-label="Apresentação">
        <div class="hero-frame">
          <img src="/login-hero.png" alt="FinFlow — controle financeiro inteligente" class="hero-img" />
        </div>
      </aside>

      <!-- Painel direito: login / cadastro / recuperar senha -->
      <div class="login-panel">
        <mat-card class="login-card">

          <!-- ══════════ VIEW: LOGIN ══════════ -->
          @if (view === 'login') {
            <mat-card-header>
              <div class="card-heading">
                <h1>Entrar</h1>
                <p class="subtitle">Use sua conta ou experimente o modo visitante.</p>
              </div>
            </mat-card-header>
            <mat-card-content>
              <!-- Zona demo -->
              <div class="demo-zone">
                <p class="demo-zone-title">
                  <mat-icon>auto_awesome</mat-icon>
                  Explorar sem cadastro
                </p>

                <!-- Perfis -->
                <div class="profiles-grid">
                  <!-- Visitante genérico -->
                  <button type="button" class="profile-card profile-card--main"
                    [disabled]="loading" (click)="entrarComoDemo()">
                    <div class="profile-card-icon">
                      @if (demoLoading) { <mat-spinner diameter="18"></mat-spinner> }
                      @else { <mat-icon>travel_explore</mat-icon> }
                    </div>
                    <span class="profile-card-label">Visitante</span>
                  </button>

                  @for (p of demoProfiles; track p.email) {
                    <button type="button" class="profile-card"
                      [disabled]="loading" (click)="loginAsProfile(p)">
                      <div class="profile-card-icon">
                        @if (profileLoading === p.email) {
                          <mat-spinner diameter="18"></mat-spinner>
                        } @else {
                          <mat-icon>{{ p.icon }}</mat-icon>
                        }
                      </div>
                      <span class="profile-card-label">{{ p.label }}</span>
                    </button>
                  }
                </div>

                <p class="demo-hint">PDF desativado na demo · dados fictícios</p>
              </div>

              <div class="divider-row">
                <mat-divider class="grow"></mat-divider>
                <span>ou e-mail</span>
                <mat-divider class="grow"></mat-divider>
              </div>

              <form [formGroup]="loginForm" (ngSubmit)="submitLogin()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>E-mail</mat-label>
                  <input matInput type="email" formControlName="email" placeholder="seu@email.com" autocomplete="username">
                  <mat-icon matSuffix>email</mat-icon>
                  @if (loginForm.get('email')?.hasError('required')) { <mat-error>E-mail obrigatório</mat-error> }
                  @if (loginForm.get('email')?.hasError('email')) { <mat-error>E-mail inválido</mat-error> }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Senha</mat-label>
                  <input matInput [type]="showPassword ? 'text' : 'password'" formControlName="password" autocomplete="current-password">
                  <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword">
                    <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  @if (loginForm.get('password')?.hasError('required')) { <mat-error>Senha obrigatória</mat-error> }
                </mat-form-field>

                <button mat-raised-button color="primary" type="submit" class="full-width submit-btn" [disabled]="loading">
                  @if (loading && !demoLoading) { <mat-spinner diameter="20"></mat-spinner> }
                  @else { Entrar }
                </button>
              </form>

              <div class="action-links">
                <button mat-button type="button" class="link-btn" (click)="setView('forgot')">
                  <mat-icon>lock_reset</mat-icon> Esqueci minha senha
                </button>
                <button mat-button type="button" class="link-btn accent" (click)="setView('register')">
                  <mat-icon>person_add</mat-icon> Criar conta
                </button>
              </div>
            </mat-card-content>
          }

          <!-- ══════════ VIEW: CADASTRO ══════════ -->
          @if (view === 'register') {
            <mat-card-header>
              <div class="card-heading">
                <button mat-icon-button type="button" class="back-btn" (click)="setView('login')" aria-label="Voltar">
                  <mat-icon>arrow_back</mat-icon>
                </button>
                <div>
                  <h1>Criar conta</h1>
                  <p class="subtitle">Preencha os dados abaixo para se cadastrar.</p>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <form [formGroup]="registerForm" (ngSubmit)="submitRegister()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Nome</mat-label>
                  <input matInput formControlName="name" placeholder="Seu nome" autocomplete="name">
                  <mat-icon matSuffix>person</mat-icon>
                  @if (registerForm.get('name')?.hasError('required')) { <mat-error>Nome obrigatório</mat-error> }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>E-mail</mat-label>
                  <input matInput type="email" formControlName="email" placeholder="seu@email.com" autocomplete="username">
                  <mat-icon matSuffix>email</mat-icon>
                  @if (registerForm.get('email')?.hasError('required')) { <mat-error>E-mail obrigatório</mat-error> }
                  @if (registerForm.get('email')?.hasError('email')) { <mat-error>E-mail inválido</mat-error> }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Senha</mat-label>
                  <input matInput [type]="showRegPassword ? 'text' : 'password'" formControlName="password" autocomplete="new-password">
                  <button mat-icon-button matSuffix type="button" (click)="showRegPassword = !showRegPassword">
                    <mat-icon>{{ showRegPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  @if (registerForm.get('password')?.hasError('required')) { <mat-error>Senha obrigatória</mat-error> }
                  @if (registerForm.get('password')?.hasError('minlength')) { <mat-error>Mínimo 6 caracteres</mat-error> }
                </mat-form-field>

                <button mat-raised-button color="primary" type="submit" class="full-width submit-btn" [disabled]="loading">
                  @if (loading) { <mat-spinner diameter="20"></mat-spinner> }
                  @else { Cadastrar }
                </button>
              </form>

              <div class="action-links">
                <button mat-button type="button" class="link-btn" (click)="setView('login')">
                  Já tenho conta — entrar
                </button>
              </div>
            </mat-card-content>
          }

          <!-- ══════════ VIEW: RECUPERAR SENHA ══════════ -->
          @if (view === 'forgot') {
            <mat-card-header>
              <div class="card-heading">
                <button mat-icon-button type="button" class="back-btn" (click)="setView('login')" aria-label="Voltar">
                  <mat-icon>arrow_back</mat-icon>
                </button>
                <div>
                  <h1>Recuperar senha</h1>
                  <p class="subtitle">Informe seu e-mail para receber as instruções.</p>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <div class="info-banner">
                <mat-icon class="info-icon">info</mat-icon>
                <p>
                  <strong>Aviso:</strong> Este é um projeto de portfólio — o envio real de e-mail <em>não está ativado</em>
                  nesta demonstração. A infraestrutura de recuperação de senha (token seguro + expiração) já foi implementada
                  no backend e está pronta para integração com um provedor de e-mail (SendGrid, SES, etc.).
                </p>
              </div>

              <form [formGroup]="forgotForm" (ngSubmit)="submitForgot()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>E-mail cadastrado</mat-label>
                  <input matInput type="email" formControlName="email" placeholder="seu@email.com" autocomplete="username">
                  <mat-icon matSuffix>email</mat-icon>
                  @if (forgotForm.get('email')?.hasError('required')) { <mat-error>E-mail obrigatório</mat-error> }
                  @if (forgotForm.get('email')?.hasError('email')) { <mat-error>E-mail inválido</mat-error> }
                </mat-form-field>

                <button mat-raised-button color="primary" type="submit" class="full-width submit-btn" [disabled]="loading">
                  @if (loading) { <mat-spinner diameter="20"></mat-spinner> }
                  @else { Enviar instruções }
                </button>
              </form>

              <div class="action-links">
                <button mat-button type="button" class="link-btn" (click)="setView('login')">
                  Voltar ao login
                </button>
              </div>
            </mat-card-content>
          }

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
    }

    /* Hero esquerdo com moldura + 70% */
    .login-hero {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      border-right: 1px solid var(--color-border);
      background: var(--color-background);
    }
    @media (max-width: 960px) {
      .login-hero {
        border-right: none;
        border-bottom: 1px solid var(--color-border);
        padding: 1.5rem;
        min-height: 280px;
      }
    }
    .hero-frame {
      width: 70%;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(45, 106, 79, 0.18), 0 0 0 1px rgba(45, 106, 79, 0.1);
      border: 2px solid rgba(45, 106, 79, 0.15);
    }
    @media (max-width: 960px) {
      .hero-frame { width: 90%; }
    }
    .hero-img {
      width: 100%;
      height: auto;
      display: block;
    }

    /* Painel direito */
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
    mat-card-header { display: block; padding: 0; margin-bottom: 0.75rem; }

    .card-heading {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.15rem;
    }
    .card-heading h1 {
      margin: 0;
      font-family: "DM Sans", Roboto, sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }
    .subtitle { margin: 0.35rem 0 0; color: var(--color-text-secondary); font-size: 0.9rem; }
    .back-btn { margin-top: -4px; flex-shrink: 0; color: var(--color-text-secondary); }

    /* Zona demo */
    .demo-zone {
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 0.9rem 1rem 0.75rem;
      margin-bottom: 1rem;
      background: rgba(74, 111, 165, 0.03);
    }
    .demo-zone-title {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.75rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--color-text-secondary);
    }
    .demo-zone-title mat-icon { font-size: 14px; width: 14px; height: 14px; line-height: 14px; }
    .demo-hint {
      margin: 0.6rem 0 0;
      font-size: 0.75rem;
      line-height: 1.4;
      color: var(--color-text-secondary);
      text-align: center;
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

    /* Campos e botões */
    .full-width { width: 100%; }
    .submit-btn { height: 48px; margin-top: 0.5rem; font-size: 1rem; font-weight: 600; }

    /* Links de ação abaixo do formulário */
    .action-links {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      margin-top: 0.75rem;
      gap: 0.25rem;
    }
    .link-btn {
      font-size: 0.82rem;
      color: var(--color-text-secondary);
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0 6px;
    }
    .link-btn.accent { color: var(--color-primary); font-weight: 600; }

    /* Banner informativo (esqueci senha) */
    .info-banner {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      background: rgba(45, 106, 79, 0.07);
      border: 1px solid rgba(45, 106, 79, 0.18);
      border-radius: 10px;
      padding: 0.85rem 1rem;
      margin-bottom: 1.25rem;
    }
    .info-icon { color: var(--color-primary); flex-shrink: 0; margin-top: 2px; }
    .info-banner p {
      margin: 0;
      font-size: 0.82rem;
      line-height: 1.5;
      color: var(--color-text-secondary);
    }

    /* Grid de perfis */
    .profiles-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
    }
    .profile-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      padding: 0.6rem 0.4rem;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: #fff;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
      font-family: inherit;
    }
    .profile-card:hover:not([disabled]) {
      border-color: var(--color-primary);
      background: rgba(74, 111, 165, 0.05);
      box-shadow: 0 2px 8px rgba(74, 111, 165, 0.1);
    }
    .profile-card--main {
      border-color: rgba(74, 111, 165, 0.3);
      background: rgba(74, 111, 165, 0.05);
    }
    .profile-card--main .profile-card-icon mat-icon { color: var(--color-primary); }
    .profile-card[disabled] { opacity: 0.6; cursor: default; }
    .profile-card-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      overflow: hidden;
    }
    .profile-card-icon mat-icon {
      font-size: 24px !important;
      width: 24px !important;
      height: 24px !important;
      line-height: 24px !important;
      color: var(--color-text-secondary);
      flex-shrink: 0;
    }
    .profile-card-label {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--color-text-primary);
      line-height: 1;
      text-align: center;
    }
  `]
})
export class LoginComponent {
  view: View = 'login';

  loginForm: ReturnType<FormBuilder['group']>;
  registerForm: ReturnType<FormBuilder['group']>;
  forgotForm: ReturnType<FormBuilder['group']>;

  demoProfiles = [
    { label: 'Família',    icon: 'family_restroom', email: 'familia@finflow.dev',    password: 'FinFlowDemo1!' },
    { label: 'Freelancer', icon: 'laptop_mac',       email: 'freelancer@finflow.dev', password: 'FinFlowDemo1!' },
    { label: 'Empresário', icon: 'business_center',  email: 'empresario@finflow.dev', password: 'FinFlowDemo1!' },
  ];

  loading = false;
  demoLoading = false;
  profileLoading: string | null = null;
  showPassword = false;
  showRegPassword = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  setView(v: View): void {
    this.view = v;
    this.loading = false;
    this.demoLoading = false;
    this.profileLoading = null;
  }

  submitLogin(): void {
    if (this.loginForm.invalid) return;
    this.loading = true;
    const { email, password } = this.loginForm.value;
    this.auth.login(email!, password!).subscribe({
      next: res => {
        if (res.success) this.router.navigate(['/dashboard']);
        else this.showError(res.error ?? 'Erro ao fazer login');
      },
      error: () => this.showError('Credenciais inválidas. Verifique e tente novamente.'),
      complete: () => { this.loading = false; }
    });
  }

  submitRegister(): void {
    if (this.registerForm.invalid) return;
    this.loading = true;
    const { name, email, password } = this.registerForm.value;
    this.auth.register(name!, email!, password!).subscribe({
      next: res => {
        if (res.success) {
          this.snack.open('Conta criada com sucesso! Faça login para continuar.', 'OK', { duration: 4000 });
          this.registerForm.reset();
          this.setView('login');
        } else {
          this.showError(res.error ?? 'Erro ao criar conta');
        }
      },
      error: () => this.showError('Não foi possível criar a conta. Tente novamente.'),
      complete: () => { this.loading = false; }
    });
  }

  submitForgot(): void {
    if (this.forgotForm.invalid) return;
    this.loading = true;
    // Simula envio — infraestrutura de e-mail não ativada nesta demo
    setTimeout(() => {
      this.loading = false;
      this.snack.open(
        'Se o e-mail estiver cadastrado, as instruções serão enviadas. (Demo: envio de e-mail não ativado)',
        'OK',
        { duration: 6000 }
      );
      this.forgotForm.reset();
      this.setView('login');
    }, 1200);
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

  loginAsProfile(p: { email: string; password: string; label: string }): void {
    if (this.loading) return;
    this.loading = true;
    this.profileLoading = p.email;
    this.auth.login(p.email, p.password).subscribe({
      next: res => {
        if (res.success) {
          this.snack.open(`Explorando como "${p.label}" — dados fictícios para demonstração.`, 'OK', { duration: 4000 });
          this.router.navigate(['/dashboard']);
        } else {
          this.showError(res.error ?? 'Perfil indisponível. Execute o script SQL 006 no banco.');
        }
      },
      error: () => this.showError('Não foi possível entrar neste perfil. Verifique a API e o seed 006.'),
      complete: () => { this.loading = false; this.profileLoading = null; }
    });
  }

  private showError(msg: string): void {
    this.loading = false;
    this.demoLoading = false;
    this.profileLoading = null;
    this.snack.open(msg, 'Fechar', { duration: 5000 });
  }
}
