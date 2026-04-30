import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MovementService } from '../../core/services/api.service';
import { Movement } from '../../core/models/models';

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatChipsModule
  ],
  template: `
    <div class="movements-page">
      <div class="page-header">
        <h2>Categorias / Movimentações</h2>
        <button mat-raised-button color="primary" (click)="openForm()">
          <mat-icon>add</mat-icon> Nova Categoria
        </button>
      </div>

      @if (showForm) {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>{{ editing ? 'Editar' : 'Nova' }} Categoria</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="save()" class="movement-form">
              <mat-form-field appearance="outline">
                <mat-label>Título</mat-label>
                <input matInput formControlName="title">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Tipo</mat-label>
                <mat-select formControlName="type">
                  <mat-option value="receita">Receita</mat-option>
                  <mat-option value="divida">Dívida / Gasto</mat-option>
                  <mat-option value="promessa_recebimento">Promessa de Recebimento</mat-option>
                  <mat-option value="promessa_pagamento">Promessa de Pagamento</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Descrição (opcional)</mat-label>
                <textarea matInput formControlName="description" rows="2"></textarea>
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
            @if (movements.length === 0) {
              <div class="empty-state">
                <mat-icon>category</mat-icon>
                <p>Nenhuma categoria cadastrada.</p>
              </div>
            } @else {
              <table mat-table [dataSource]="movements" class="full-width">
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Título</th>
                  <td mat-cell *matCellDef="let m">{{ m.title }}</td>
                </ng-container>
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Tipo</th>
                  <td mat-cell *matCellDef="let m">
                    <mat-chip [class]="m.type">
                      {{ movementTypeLabel(m.type) }}
                    </mat-chip>
                  </td>
                </ng-container>
                <ng-container matColumnDef="description">
                  <th mat-header-cell *matHeaderCellDef>Descrição</th>
                  <td mat-cell *matCellDef="let m">{{ m.description || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let m">
                    <button mat-icon-button (click)="edit(m)"><mat-icon>edit</mat-icon></button>
                    <button mat-icon-button color="warn" (click)="delete(m.id)"><mat-icon>delete</mat-icon></button>
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
    .movements-page { padding: 1.5rem; max-width: 900px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h2 { margin: 0; color: var(--color-primary); }
    .loading { display: flex; justify-content: center; padding: 3rem; }
    .full-width { width: 100%; }
    .form-card { margin-bottom: 1rem; }
    .movement-form { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .movement-form .full-width { grid-column: span 2; }
    .form-actions { grid-column: span 2; display: flex; justify-content: flex-end; gap: 0.5rem; }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 3rem; color: var(--color-text-secondary); }
    .empty-state mat-icon { font-size: 3rem; height: 3rem; width: 3rem; margin-bottom: 1rem; }
    mat-chip.receita { background: #e8f5e9 !important; color: #2e7d32 !important; }
    mat-chip.divida { background: #ffebee !important; color: #c62828 !important; }
    mat-chip.promessa_recebimento { background: #e3f2fd !important; color: #1565c0 !important; }
    mat-chip.promessa_pagamento { background: #fff3e0 !important; color: #ef6c00 !important; }
  `]
})
export class MovementsComponent implements OnInit {
  movements: Movement[] = [];
  columns = ['title', 'type', 'description', 'actions'];
  loading = false;
  saving = false;
  showForm = false;
  editing: Movement | null = null;

  form: ReturnType<FormBuilder['group']>;

  constructor(private service: MovementService, private fb: FormBuilder, private snack: MatSnackBar) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      type: ['divida' as 'receita' | 'divida' | 'promessa_pagamento' | 'promessa_recebimento', Validators.required],
      description: ['']
    });
  }

  movementTypeLabel(type: Movement['type']): string {
    if (type === 'receita') return 'Receita';
    if (type === 'divida') return 'Dívida';
    if (type === 'promessa_recebimento') return 'Promessa de Recebimento';
    return 'Promessa de Pagamento';
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: r => { if (r.success && r.data) this.movements = r.data; },
      complete: () => this.loading = false
    });
  }

  openForm(): void {
    this.editing = null;
    this.form.reset({ type: 'divida' });
    this.showForm = true;
  }

  edit(m: Movement): void {
    this.editing = m;
    this.form.setValue({ title: m.title, type: m.type, description: m.description ?? '' });
    this.showForm = true;
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const data = this.form.value;
    const obs = this.editing
      ? this.service.update(this.editing.id, data as any)
      : this.service.create(data as any);

    obs.subscribe({
      next: r => {
        if (r.success) {
          this.showForm = false;
          this.load();
          this.snack.open('Salvo!', '', { duration: 2000 });
        }
      },
      complete: () => this.saving = false
    });
  }

  delete(id: string): void {
    if (!confirm('Excluir esta categoria?')) return;
    this.service.delete(id).subscribe(() => this.load());
  }
}
