import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { ExpenseService, MovementService } from '../../core/services/api.service';
import { Expense, Movement, ExtractedExpenseItem } from '../../core/models/models';
import { PasteTextDialogComponent } from './paste-text-dialog.component';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, CurrencyPipe,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatChipsModule, MatDividerModule
  ],
  template: `
    <div class="expenses-page">
      <div class="page-header">
        <h2>Gastos</h2>
        <div class="actions">
          <button mat-stroked-button color="primary" (click)="triggerFileInput()">
            <mat-icon>upload_file</mat-icon> Importar PDF
          </button>
          <input #fileInput type="file" accept=".pdf" (change)="onFileSelected($event)" hidden>
          <button mat-stroked-button color="accent" (click)="openPasteDialog()">
            <mat-icon>content_paste</mat-icon> Colar Texto
          </button>
          <button mat-raised-button color="primary" (click)="openForm()">
            <mat-icon>add</mat-icon> Novo Gasto
          </button>
        </div>
      </div>

      <!-- Barra de busca + filtros -->
      <div class="search-filter-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Buscar gastos</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [(ngModel)]="searchText" placeholder="Título do gasto...">
          @if (searchText) {
            <button mat-icon-button matSuffix (click)="searchText = ''" type="button">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>
        <button mat-stroked-button (click)="showFilters = !showFilters" [color]="activeFilterCount > 0 ? 'primary' : undefined">
          <mat-icon>tune</mat-icon>
          Filtros
          @if (activeFilterCount > 0) {
            <span class="filter-badge">{{ activeFilterCount }}</span>
          }
        </button>
        @if (activeFilterCount > 0 || searchText) {
          <button mat-button color="warn" (click)="clearFilters()">
            <mat-icon>filter_alt_off</mat-icon> Limpar
          </button>
        }
      </div>

      @if (showFilters) {
        <mat-card class="filter-panel">
          <mat-card-content>
            <div class="filter-grid">
              <mat-form-field appearance="outline">
                <mat-label>Data início</mat-label>
                <input matInput type="date" [(ngModel)]="filterDateStart">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Data fim</mat-label>
                <input matInput type="date" [(ngModel)]="filterDateEnd">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Categoria</mat-label>
                <mat-select [(ngModel)]="filterMovementId">
                  <mat-option [value]="null">Todas</mat-option>
                  <mat-option value="__none__">Sem categoria</mat-option>
                  @for (m of movements; track m.id) {
                    <mat-option [value]="m.id">{{ m.title }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Tipo</mat-label>
                <mat-select [(ngModel)]="filterType">
                  <mat-option value="all">Todos</mat-option>
                  <mat-option value="receita">Receita</mat-option>
                  <mat-option value="divida">Dívida</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Valor mínimo (R$)</mat-label>
                <input matInput type="number" step="0.01" min="0" [(ngModel)]="filterAmountMin">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Valor máximo (R$)</mat-label>
                <input matInput type="number" step="0.01" min="0" [(ngModel)]="filterAmountMax">
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>
      }

      @if (pendingPasswordFile) {
        <mat-card class="password-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="warn">lock</mat-icon>
            <mat-card-title>PDF Protegido por Senha</mat-card-title>
            <mat-card-subtitle>Informe a senha para processar o arquivo</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="password-field">
              <mat-label>Senha do PDF</mat-label>
              <input matInput [type]="showPassword ? 'text' : 'password'" [formControl]="pdfPasswordCtrl"
                     (keyup.enter)="retryWithPassword()" placeholder="Digite a senha do documento">
              <button mat-icon-button matSuffix (click)="showPassword = !showPassword" type="button">
                <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button (click)="cancelPasswordEntry()">Cancelar</button>
            <button mat-raised-button color="primary" (click)="retryWithPassword()"
                    [disabled]="extracting || !pdfPasswordCtrl.value">
              <mat-icon>lock_open</mat-icon> Processar com senha
            </button>
          </mat-card-actions>
        </mat-card>
      }

      @if (extracting) {
        <mat-card class="extract-card">
          <mat-card-content>
            <mat-spinner diameter="32"></mat-spinner>
            <p>Analisando com IA... aguarde</p>
          </mat-card-content>
        </mat-card>
      }

      @if (extractedItems.length > 0) {
        <mat-card class="extract-results">
          <mat-card-header>
            <mat-card-title>Gastos extraídos ({{ extractedItems.length }})</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (item of extractedItems; track $index) {
              <div class="extracted-row">
                <span>{{ item.title }}</span>
                <span>{{ item.date }}</span>
                <strong>{{ item.amount | currency:'BRL':'symbol':'1.2-2':'pt' }}</strong>
                <button mat-icon-button color="primary" (click)="saveExtracted(item)" title="Salvar">
                  <mat-icon>save</mat-icon>
                </button>
              </div>
            }
            <button mat-raised-button color="primary" (click)="saveAllExtracted()">
              <mat-icon>save_all</mat-icon> Salvar todos
            </button>
          </mat-card-content>
        </mat-card>
      }

      @if (showForm) {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>{{ editing ? 'Editar' : 'Novo' }} Gasto</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="save()" class="expense-form">
              <mat-form-field appearance="outline">
                <mat-label>Título</mat-label>
                <input matInput formControlName="title">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Valor (R$)</mat-label>
                <input matInput type="number" step="0.01" formControlName="amount">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Data</mat-label>
                <input matInput type="date" formControlName="expenseDate">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Categoria</mat-label>
                <mat-select formControlName="movementId">
                  <mat-option [value]="null">Sem categoria</mat-option>
                  @for (m of movements; track m.id) {
                    <mat-option [value]="m.id">{{ m.title }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <div class="form-actions">
                <button mat-button type="button" (click)="showForm = false">Cancelar</button>
                <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving">
                  {{ saving ? 'Salvando...' : 'Salvar' }}
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      @if (loading) {
        <div class="loading"><mat-spinner diameter="48"></mat-spinner></div>
      } @else {
        <mat-card>
          <mat-card-content>
            @if (expenses.length === 0) {
              <div class="empty-state">
                <mat-icon>receipt_long</mat-icon>
                <p>Nenhum gasto registrado. Importe um PDF ou adicione manualmente.</p>
              </div>
            } @else if (filteredExpenses.length === 0) {
              <div class="empty-state">
                <mat-icon>search_off</mat-icon>
                <p>Nenhum gasto encontrado com os filtros aplicados.</p>
                <button mat-stroked-button (click)="clearFilters()">Limpar filtros</button>
              </div>
            } @else {
              <div class="table-meta">
                <span class="result-count">{{ filteredExpenses.length }} gasto(s)
                  @if (filteredExpenses.length !== expenses.length) {
                    <span class="total-hint"> de {{ expenses.length }} total</span>
                  }
                </span>
              </div>
              <table mat-table [dataSource]="filteredExpenses" class="full-width">
                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>Data</th>
                  <td mat-cell *matCellDef="let e">{{ e.expenseDate }}</td>
                </ng-container>
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Título</th>
                  <td mat-cell *matCellDef="let e">{{ e.title }}</td>
                </ng-container>
                <ng-container matColumnDef="movement">
                  <th mat-header-cell *matHeaderCellDef>Categoria</th>
                  <td mat-cell *matCellDef="let e">
                    @if (e.movementTitle) {
                      <mat-chip [class]="e.movementType">{{ e.movementTitle }}</mat-chip>
                    } @else {
                      <span class="no-category">—</span>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="amount">
                  <th mat-header-cell *matHeaderCellDef>Valor</th>
                  <td mat-cell *matCellDef="let e">
                    <strong [class]="e.movementType ?? 'divida'">
                      {{ e.amount | currency:'BRL':'symbol':'1.2-2':'pt' }}
                    </strong>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let e">
                    <button mat-icon-button (click)="edit(e)" title="Editar">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="delete(e.id)" title="Excluir">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="columns"></tr>
                <tr mat-row *matRowDef="let row; columns: columns;"></tr>
              </table>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .expenses-page { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .page-header h2 { margin: 0; color: var(--color-primary); }
    .actions { display: flex; gap: 0.75rem; }
    .search-filter-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .search-field { flex: 1; min-width: 220px; }
    .filter-badge { display: inline-flex; align-items: center; justify-content: center; background: var(--color-primary, #4A6FA5); color: #fff; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; font-weight: 700; margin-left: 4px; vertical-align: middle; }
    .filter-panel { margin-bottom: 1rem; border-left: 3px solid var(--color-primary, #4A6FA5); }
    .filter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0 1rem; }
    .table-meta { display: flex; align-items: center; padding: 0.25rem 0 0.5rem; }
    .result-count { font-size: 0.85rem; color: var(--color-text-secondary, #6C757D); }
    .total-hint { opacity: 0.7; }
    .loading { display: flex; justify-content: center; padding: 3rem; }
    .full-width { width: 100%; }
    .extract-card mat-card-content, .extract-results mat-card-content { display: flex; flex-direction: column; gap: 1rem; }
    .extract-card mat-card-content { flex-direction: row; align-items: center; }
    .extracted-row { display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0; border-bottom: 1px solid var(--color-border); }
    .extracted-row span:first-child { flex: 1; }
    .form-card, .extract-card, .extract-results, .password-card { margin-bottom: 1rem; }
    .password-card { border-left: 4px solid #f44336; }
    .password-field { width: 100%; max-width: 400px; margin-top: 0.5rem; }
    .expense-form { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .form-actions { grid-column: span 2; display: flex; justify-content: flex-end; gap: 0.5rem; }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 3rem; color: var(--color-text-secondary); }
    .empty-state mat-icon { font-size: 3rem; height: 3rem; width: 3rem; margin-bottom: 1rem; }
    .receita { color: #2e7d32; }
    .divida { color: #c62828; }
    .no-category { color: var(--color-text-secondary); }
    mat-chip.receita { background: #e8f5e9 !important; color: #2e7d32 !important; }
    mat-chip.divida { background: #ffebee !important; color: #c62828 !important; }
  `]
})
export class ExpensesComponent implements OnInit {
  expenses: Expense[] = [];
  movements: Movement[] = [];
  extractedItems: ExtractedExpenseItem[] = [];
  columns = ['date', 'title', 'movement', 'amount', 'actions'];
  loading = false;
  extracting = false;
  saving = false;
  showForm = false;
  editing: Expense | null = null;
  pendingPasswordFile: File | null = null;
  pdfPasswordCtrl = new FormControl('');
  showPassword = false;

  // Busca e filtros
  searchText = '';
  filterDateStart = '';
  filterDateEnd = '';
  filterMovementId: string | null = null;
  filterType: 'all' | 'receita' | 'divida' = 'all';
  filterAmountMin: number | null = null;
  filterAmountMax: number | null = null;
  showFilters = false;

  get filteredExpenses(): Expense[] {
    return this.expenses.filter(e => {
      if (this.searchText && !e.title.toLowerCase().includes(this.searchText.toLowerCase())) return false;
      if (this.filterDateStart && e.expenseDate < this.filterDateStart) return false;
      if (this.filterDateEnd && e.expenseDate > this.filterDateEnd) return false;
      if (this.filterMovementId === '__none__' && e.movementId) return false;
      if (this.filterMovementId && this.filterMovementId !== '__none__' && e.movementId !== this.filterMovementId) return false;
      if (this.filterType !== 'all' && e.movementType !== this.filterType) return false;
      if (this.filterAmountMin !== null && e.amount < this.filterAmountMin) return false;
      if (this.filterAmountMax !== null && e.amount > this.filterAmountMax) return false;
      return true;
    });
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.filterDateStart) count++;
    if (this.filterDateEnd) count++;
    if (this.filterMovementId) count++;
    if (this.filterType !== 'all') count++;
    if (this.filterAmountMin !== null) count++;
    if (this.filterAmountMax !== null) count++;
    return count;
  }

  clearFilters(): void {
    this.searchText = '';
    this.filterDateStart = '';
    this.filterDateEnd = '';
    this.filterMovementId = null;
    this.filterType = 'all';
    this.filterAmountMin = null;
    this.filterAmountMax = null;
  }

  form: ReturnType<FormBuilder['group']>;

  constructor(
    private expenseService: ExpenseService,
    private movementService: MovementService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      expenseDate: ['', Validators.required],
      movementId: [null as string | null]
    });
  }

  ngOnInit(): void {
    this.load();
    this.movementService.getAll().subscribe(r => { if (r.success && r.data) this.movements = r.data; });
  }

  load(): void {
    this.loading = true;
    this.expenseService.getAll().subscribe({
      next: r => { if (r.success && r.data) this.expenses = r.data; },
      complete: () => this.loading = false
    });
  }

  openForm(): void {
    this.editing = null;
    this.form.reset({ amount: 0, movementId: null });
    this.showForm = true;
  }

  edit(expense: Expense): void {
    this.editing = expense;
    this.form.setValue({
      title: expense.title,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      movementId: expense.movementId ?? null
    });
    this.showForm = true;
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const data = this.form.value;
    const obs = this.editing
      ? this.expenseService.update(this.editing.id, data as any)
      : this.expenseService.create(data as any);

    obs.subscribe({
      next: r => {
        if (r.success) {
          this.showForm = false;
          this.load();
          this.snack.open('Salvo com sucesso!', '', { duration: 2000 });
        }
      },
      complete: () => this.saving = false
    });
  }

  delete(id: string): void {
    if (!confirm('Excluir este gasto?')) return;
    this.expenseService.delete(id).subscribe(() => this.load());
  }

  triggerFileInput(): void {
    document.querySelector<HTMLInputElement>('input[type=file]')?.click();
  }

  openPasteDialog(): void {
    const ref = this.dialog.open(PasteTextDialogComponent, {
      width: '650px',
      maxWidth: '95vw'
    });
    ref.afterClosed().subscribe((text: string | undefined) => {
      if (!text) return;
      this.extracting = true;
      this.extractedItems = [];
      this.expenseService.extractFromText(text).subscribe({
        next: r => {
          if (r.success && r.data) {
            this.extractedItems = r.data.items;
            this.snack.open(`${r.data.count} gastos extraídos!`, '', { duration: 3000 });
          } else {
            this.snack.open(r.error ?? 'Erro ao processar texto', 'Fechar', { duration: 8000 });
          }
        },
        error: err => {
          const msg: string = err?.error?.error ?? err?.message ?? 'Erro ao processar texto.';
          this.snack.open(msg, 'Fechar', { duration: 10000 });
          this.extracting = false;
        },
        complete: () => this.extracting = false
      });
    });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadPdf(file);
  }

  private uploadPdf(file: File, password?: string): void {
    this.extracting = true;
    this.extractedItems = [];
    this.expenseService.extractFromPdf(file, password).subscribe({
      next: r => {
        if (r.success && r.data) {
          this.extractedItems = r.data.items;
          this.pendingPasswordFile = null;
          this.pdfPasswordCtrl.reset();
          this.snack.open(`${r.data.count} gastos extraídos!`, '', { duration: 3000 });
        } else {
          this.snack.open(r.error ?? 'Erro ao processar PDF', 'Fechar', { duration: 8000 });
        }
      },
      error: (err) => {
        const msg: string = err?.error?.error ?? err?.message ?? 'Erro ao processar PDF.';
        const isPasswordKeyword = msg.toLowerCase().includes('senha') || msg.toLowerCase().includes('protegido');
        // Erros de IA têm mensagens distintas — não mostrar campo de senha nesses casos
        const isAiError = msg.toLowerCase().includes('limite de req') || msg.toLowerCase().includes('erro ao comunicar');
        // Em qualquer 422 na primeira tentativa (sem senha), oferencemos o campo de senha,
        // pois o PDF pode estar protegido mas o backend não conseguiu detectar corretamente.
        const shouldOfferPassword = !password && err?.status === 422 && !isAiError;

        if (isPasswordKeyword || shouldOfferPassword) {
          this.pendingPasswordFile = file;
          this.pdfPasswordCtrl.reset();
          if (!isPasswordKeyword) {
            // Exibe o erro original, mas também mostra o campo de senha como alternativa
            this.snack.open(msg + ' Se o PDF tiver senha, informe-a abaixo.', 'OK', { duration: 8000 });
          }
        } else {
          this.snack.open(msg, 'Fechar', { duration: 10000 });
        }
        this.extracting = false;
      },
      complete: () => this.extracting = false
    });
  }

  retryWithPassword(): void {
    if (!this.pendingPasswordFile || !this.pdfPasswordCtrl.value) return;
    this.uploadPdf(this.pendingPasswordFile, this.pdfPasswordCtrl.value);
  }

  cancelPasswordEntry(): void {
    this.pendingPasswordFile = null;
    this.pdfPasswordCtrl.reset();
  }

  saveExtracted(item: ExtractedExpenseItem): void {
    this.expenseService.create({
      title: item.title,
      amount: item.amount,
      expenseDate: item.date,
      movementId: undefined
    } as any).subscribe(r => {
      if (r.success) {
        this.extractedItems = this.extractedItems.filter(i => i !== item);
        this.load();
      }
    });
  }

  saveAllExtracted(): void {
    const items = [...this.extractedItems];
    items.forEach(item => this.saveExtracted(item));
  }
}
