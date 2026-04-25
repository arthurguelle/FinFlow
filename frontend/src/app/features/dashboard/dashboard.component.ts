import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ExpenseService, MovementService } from '../../core/services/api.service';
import { StorageService } from '../../core/services/storage.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Summary } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, CurrencyPipe,
    MatCardModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatSelectModule, MatFormFieldModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <div>
          <h2>Dashboard</h2>
          <p>Olá, {{ user?.name }}! Aqui está seu resumo financeiro.</p>
        </div>
        <div class="filters">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Mês</mat-label>
            <mat-select [(ngModel)]="selectedMonth" (ngModelChange)="loadSummary()">
              <mat-option [value]="null">Todos</mat-option>
              @for (m of months; track m.value) {
                <mat-option [value]="m.value">{{ m.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Ano</mat-label>
            <mat-select [(ngModel)]="selectedYear" (ngModelChange)="loadSummary()">
              @for (y of years; track y) {
                <mat-option [value]="y">{{ y }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      @if (loading) {
        <div class="loading"><mat-spinner diameter="48"></mat-spinner></div>
      } @else if (summary) {
        <div class="cards-grid">
          <mat-card class="summary-card receita">
            <mat-card-content>
              <mat-icon>trending_up</mat-icon>
              <div>
                <p>Total Receitas</p>
                <h3>{{ summary.totalReceitas | currency:'BRL':'symbol':'1.2-2':'pt' }}</h3>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card divida">
            <mat-card-content>
              <mat-icon>trending_down</mat-icon>
              <div>
                <p>Total Dívidas</p>
                <h3>{{ summary.totalDividas | currency:'BRL':'symbol':'1.2-2':'pt' }}</h3>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card" [class.saldo-positivo]="summary.saldo >= 0" [class.saldo-negativo]="summary.saldo < 0">
            <mat-card-content>
              <mat-icon>{{ summary.saldo >= 0 ? 'savings' : 'warning' }}</mat-icon>
              <div>
                <p>Saldo</p>
                <h3>{{ summary.saldo | currency:'BRL':'symbol':'1.2-2':'pt' }}</h3>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        @if (!templateDone && summary.totalReceitas === 0 && summary.totalDividas === 0 && summary.byMovement.length === 0) {
          <div class="onboarding-panel">
            <div class="onboarding-header">
              <mat-icon class="wave-icon">waving_hand</mat-icon>
              <div class="onboarding-title">
                <strong>Bem-vindo ao FinFlow, {{ (user?.name ?? '').split(' ')[0] }}!</strong>
                <p>Seu painel está vazio. Escolha um modelo para criar categorias e começar rapidamente.</p>
              </div>
              <button mat-icon-button class="onboarding-dismiss" (click)="templateDone = true" aria-label="Dispensar">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="template-grid">
              @for (t of onboardingTemplates; track t.name) {
                <button class="template-card" [class.tpl-loading]="templateLoading === t.name" [disabled]="!!templateLoading" (click)="applyTemplate(t)">
                  <div class="tpl-icon">
                    @if (templateLoading === t.name) {
                      <mat-spinner diameter="24"></mat-spinner>
                    } @else {
                      <mat-icon>{{ t.icon }}</mat-icon>
                    }
                  </div>
                  <div class="tpl-info">
                    <strong>{{ t.name }}</strong>
                    <span>{{ t.desc }}</span>
                  </div>
                </button>
              }
            </div>
          </div>
        }

        @if (summary.byMovement.length > 0) {
          <mat-card class="movements-breakdown">
            <mat-card-header>
              <mat-card-title>Por Categoria</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @for (item of summary.byMovement; track item.movementId) {
                <div class="movement-row">
                  <div class="movement-info">
                    <mat-icon [class]="item.type">
                      {{ item.type === 'receita' ? 'arrow_upward' : 'arrow_downward' }}
                    </mat-icon>
                    <span>{{ item.title }}</span>
                  </div>
                  <strong [class]="item.type">
                    {{ item.total | currency:'BRL':'symbol':'1.2-2':'pt' }}
                  </strong>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }
      }

      <div class="quick-actions">
        <button mat-raised-button color="primary" routerLink="/expenses">
          <mat-icon>receipt_long</mat-icon> Gerenciar Gastos
        </button>
        <button mat-stroked-button color="primary" routerLink="/movements">
          <mat-icon>category</mat-icon> Gerenciar Categorias
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
    .dashboard-header h2 { margin: 0; color: var(--color-primary); font-size: 1.5rem; }
    .dashboard-header p { margin: 0.25rem 0 0; color: var(--color-text-secondary); }
    .filters { display: flex; gap: 0.75rem; }
    .filter-field { width: 130px; }
    .loading { display: flex; justify-content: center; padding: 3rem; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .summary-card mat-card-content { display: flex; align-items: center; gap: 1rem; padding: 1.5rem !important; }
    .summary-card mat-icon { font-size: 2.5rem; height: 2.5rem; width: 2.5rem; opacity: 0.8; }
    .summary-card p { margin: 0; font-size: 0.85rem; color: var(--color-text-secondary); }
    .summary-card h3 { margin: 0.25rem 0 0; font-size: 1.5rem; font-weight: 700; }
    .receita mat-icon, .receita h3 { color: #2e7d32; }
    .divida mat-icon, .divida h3 { color: #c62828; }
    .saldo-positivo mat-icon, .saldo-positivo h3 { color: #1565c0; }
    .saldo-negativo mat-icon, .saldo-negativo h3 { color: #c62828; }
    .movements-breakdown { margin-bottom: 1.5rem; }
    .movement-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--color-border); }
    .movement-row:last-child { border-bottom: none; }
    .movement-info { display: flex; align-items: center; gap: 0.5rem; }
    .movement-info .receita { color: #2e7d32; }
    .movement-info .divida { color: #c62828; }
    strong.receita { color: #2e7d32; }
    strong.divida { color: #c62828; }
    .quick-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
    .quick-actions button { display: flex; align-items: center; gap: 0.5rem; }
    /* Onboarding templates */
    .onboarding-panel {
      border: 1px dashed var(--color-border);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
      background: var(--color-background);
    }
    .onboarding-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .wave-icon { font-size: 2rem; height: 2rem; width: 2rem; color: var(--color-primary); flex-shrink: 0; }
    .onboarding-title { flex: 1; }
    .onboarding-title strong { font-size: 1rem; color: var(--color-text-primary); }
    .onboarding-title p { margin: 0.2rem 0 0; font-size: 0.85rem; color: var(--color-text-secondary); }
    .onboarding-dismiss { margin-left: auto; flex-shrink: 0; color: var(--color-text-secondary); }
    .template-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.75rem; }
    .template-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: #fff;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      text-align: left;
      width: 100%;
    }
    .template-card:hover:not([disabled]) { border-color: var(--color-primary); box-shadow: 0 2px 10px rgba(74,111,165,0.1); }
    .template-card[disabled] { opacity: 0.65; cursor: default; }
    .template-card.tpl-loading { border-color: var(--color-primary); }
    .tpl-icon { flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 28px; }
    .tpl-icon mat-icon { color: var(--color-primary); }
    .tpl-info strong { display: block; font-size: 0.9rem; font-weight: 600; color: var(--color-text-primary); }
    .tpl-info span { font-size: 0.78rem; color: var(--color-text-secondary); line-height: 1.3; }
  `]
})
export class DashboardComponent implements OnInit {
  summary: Summary | null = null;
  loading = false;
  selectedYear = new Date().getFullYear();
  selectedMonth: number | null = new Date().getMonth() + 1;

  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  months = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
  ];

  get user() { return this.storage.user(); }

  templateDone = false;
  templateLoading: string | null = null;
  readonly onboardingTemplates: { name: string; icon: string; desc: string; movements: { title: string; type: 'receita' | 'divida'; description: string }[] }[] = [
    {
      name: 'Pessoal',
      icon: 'person',
      desc: 'Salário, alimentação, transporte, lazer e saúde',
      movements: [
        { title: 'Salário',      type: 'receita', description: 'Receita mensal de trabalho' },
        { title: 'Alimentação',  type: 'divida',  description: 'Supermercado e restaurantes' },
        { title: 'Transporte',   type: 'divida',  description: 'Combustível e transporte público' },
        { title: 'Lazer',        type: 'divida',  description: 'Entretenimento e passeios' },
        { title: 'Saúde',        type: 'divida',  description: 'Plano de saúde e farmácia' },
      ]
    },
    {
      name: 'Família',
      icon: 'family_restroom',
      desc: 'Salário do casal, escola, saúde, mercado e casa',
      movements: [
        { title: 'Salário',            type: 'receita', description: 'Renda familiar mensal' },
        { title: 'Escola',             type: 'divida',  description: 'Mensalidade e material escolar' },
        { title: 'Supermercado',       type: 'divida',  description: 'Compras mensais de mercado' },
        { title: 'Saúde e Plano',      type: 'divida',  description: 'Plano de saúde familiar' },
        { title: 'Energia e Internet', type: 'divida',  description: 'Contas de luz, água e internet' },
        { title: 'Cartão Crédito',     type: 'divida',  description: 'Fatura do cartão de crédito' },
      ]
    },
    {
      name: 'Freelancer',
      icon: 'laptop_mac',
      desc: 'Projetos, equipamentos, softwares e impostos MEI',
      movements: [
        { title: 'Projetos',         type: 'receita', description: 'Receita de projetos e clientes' },
        { title: 'Alimentação',      type: 'divida',  description: 'Refeições e delivery' },
        { title: 'Equipamentos',     type: 'divida',  description: 'Hardware, licenças e assinaturas' },
        { title: 'Coworking',        type: 'divida',  description: 'Aluguel de espaço de trabalho' },
        { title: 'Impostos MEI',     type: 'divida',  description: 'DAS mensal e obrigações fiscais' },
      ]
    },
    {
      name: 'Empresa',
      icon: 'business_center',
      desc: 'Faturamento, folha, aluguel, fornecedores e impostos',
      movements: [
        { title: 'Faturamento',        type: 'receita', description: 'Receita de vendas e serviços' },
        { title: 'Folha de Pagamento', type: 'divida',  description: 'Salários e encargos trabalhistas' },
        { title: 'Aluguel',            type: 'divida',  description: 'Aluguel e condomínio comercial' },
        { title: 'Fornecedores',       type: 'divida',  description: 'Pagamento a fornecedores' },
        { title: 'Marketing',          type: 'divida',  description: 'Google Ads e redes sociais' },
        { title: 'Impostos',           type: 'divida',  description: 'Simples Nacional, ISS e tributos' },
      ]
    },
  ];

  constructor(
    private expenseService: ExpenseService,
    private movementService: MovementService,
    private storage: StorageService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void { this.loadSummary(); }

  loadSummary(): void {
    this.loading = true;
    this.expenseService.getSummary(this.selectedYear, this.selectedMonth ?? undefined).subscribe({
      next: res => { if (res.success) this.summary = res.data; },
      complete: () => this.loading = false
    });
  }

  applyTemplate(t: typeof this.onboardingTemplates[0]): void {
    if (this.templateLoading) return;
    this.templateLoading = t.name;
    forkJoin(t.movements.map(m => this.movementService.create(m))).subscribe({
      next: () => {
        this.templateDone = true;
        this.templateLoading = null;
        this.snack.open(`Categorias do modelo "${t.name}" criadas! Agora registre seus gastos.`, 'OK', { duration: 5000 });
        this.loadSummary();
      },
      error: () => {
        this.templateLoading = null;
        this.snack.open('Não foi possível criar as categorias. Tente novamente.', 'Fechar', { duration: 4000 });
      }
    });
  }
}
