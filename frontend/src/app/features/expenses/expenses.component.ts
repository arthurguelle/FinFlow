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
import { FormsModule } from '@angular/forms';
import { ExpenseService, MovementService } from '../../core/services/api.service';
import { Expense, Movement, ExtractedExpenseItem } from '../../core/models/models';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, CurrencyPipe,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatChipsModule
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
          <button mat-raised-button color="primary" (click)="openForm()">
            <mat-icon>add</mat-icon> Novo Gasto
          </button>
        </div>
      </div>

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
            <p>Analisando PDF com IA... aguarde</p>
          </mat-card-content>
        </mat-card>
      }

      @if (extractedItems.length > 0) {
        <mat-card class="extract-results">
          <mat-card-header>
            <mat-card-title>Gastos extraídos do PDF ({{ extractedItems.length }})</mat-card-title>
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
            } @else {
              <table mat-table [dataSource]="expenses" class="full-width">
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
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h2 { margin: 0; color: var(--color-primary); }
    .actions { display: flex; gap: 0.75rem; }
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

  form: ReturnType<FormBuilder['group']>;

  constructor(
    private expenseService: ExpenseService,
    private movementService: MovementService,
    private fb: FormBuilder,
    private snack: MatSnackBar
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
