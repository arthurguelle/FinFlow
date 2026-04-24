import { Component } from "@angular/core";
import { RouterOutlet, RouterModule, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { StorageService } from "./core/services/storage.service";
import { AuthService } from "./core/services/auth.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterModule,
    MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule
  ],
  template: `
    @if (isLoggedIn) {
      <mat-toolbar color="primary" class="app-toolbar">
        <span class="logo-text">
          <mat-icon>account_balance_wallet</mat-icon>
          FinFlow
          @if (user?.role === 'demo') {
            <span class="demo-badge" title="Importação de PDF desativada nesta conta">Demo</span>
          }
        </span>
        <nav class="nav-links">
          <a mat-button routerLink="/dashboard" routerLinkActive="active-link">Dashboard</a>
          <a mat-button routerLink="/expenses" routerLinkActive="active-link">Gastos</a>
          <a mat-button routerLink="/movements" routerLinkActive="active-link">Categorias</a>
          @if (isAdmin) {
            <a mat-button routerLink="/users" routerLinkActive="active-link">Usuários</a>
          }
        </nav>
        <span class="spacer"></span>
        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu>
          <div class="user-info">{{ user?.name }}</div>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon> Sair
          </button>
        </mat-menu>
      </mat-toolbar>
    }
    <main [class.with-toolbar]="isLoggedIn">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .app-toolbar { position: sticky; top: 0; z-index: 100; }
    .logo-text { display: flex; align-items: center; gap: 0.5rem; font-size: 1.25rem; font-weight: 700; margin-right: 1.5rem; }
    .nav-links { display: flex; gap: 0.25rem; }
    .active-link { background: rgba(255,255,255,0.15) !important; border-radius: 4px; }
    .spacer { flex: 1; }
    main.with-toolbar { min-height: calc(100vh - 64px); }
    .user-info { padding: 0.5rem 1rem; color: #666; font-size: 0.875rem; border-bottom: 1px solid #eee; }
    .demo-badge {
      margin-left: 0.5rem;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      background: rgba(255,255,255,0.22);
      border: 1px solid rgba(255,255,255,0.35);
    }
  `]
})
export class App {
  get isLoggedIn() { return this.storage.isLoggedIn(); }
  get user() { return this.storage.user(); }
  get isAdmin() { return this.storage.user()?.role === 'admin'; }

  constructor(
    private storage: StorageService,
    private auth: AuthService,
    private router: Router
  ) {}

  logout(): void {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }
}
