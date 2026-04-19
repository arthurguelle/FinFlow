import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-paste-text-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:8px">content_paste</mat-icon>
      Colar Extrato para Análise
    </h2>

    <mat-dialog-content>
      <p class="hint">
        Copie o texto da fatura (Ctrl+A / Ctrl+C no PDF aberto) e cole abaixo.<br>
        A IA vai identificar e extrair todos os lançamentos automaticamente.
      </p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Cole o texto da fatura aqui</mat-label>
        <textarea
          matInput
          [(ngModel)]="text"
          rows="14"
          placeholder="2024-03-18   LOJAS DUTILAR, SANTO ANDRE   R$ 18,00&#10;2024-03-19   SUPERMERCADO ABC, SAO PAULO   R$ 157,30&#10;..."
        ></textarea>
        <mat-hint>{{ text.length }} caracteres</mat-hint>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button
        mat-raised-button color="primary"
        [disabled]="!text.trim()"
        (click)="confirm()"
      >
        <mat-icon>auto_awesome</mat-icon> Analisar com IA
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: min(600px, 90vw); }
    .full-width { width: 100%; margin-top: 0.5rem; }
    .hint { color: var(--color-text-secondary, #6c757d); font-size: 0.875rem; margin-bottom: 0.75rem; }
    textarea { font-family: monospace; font-size: 0.8rem; }
  `]
})
export class PasteTextDialogComponent {
  text = '';

  constructor(private dialogRef: MatDialogRef<PasteTextDialogComponent>) {}

  confirm(): void {
    if (this.text.trim()) {
      this.dialogRef.close(this.text.trim());
    }
  }
}
