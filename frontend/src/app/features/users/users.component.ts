import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminUserService } from '../../core/services/api.service';
import { AdminUser } from '../../core/models/models';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, DatePipe,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatChipsModule, MatSlideToggleModule,
    MatTooltipModule, MatDividerModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="users-page">
      <div class="page-header">
        <h2>Gerenciar Usuários</h2>
        <button mat-raised-button color="primary" (click)="openCreate()">
          <mat-icon>person_add</mat-icon> Novo Usuário
        </button>
      </div>

      <p class="info-text">
        <mat-icon class="info-icon">info</mat-icon>
        Os dados de cada usuário (gastos, categorias) são isolados — cada um vê apenas o que é seu.
      </p>

      @if (showForm) {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>{{ editing ? 'Editar Usuário' : 'Novo Usuário' }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="save()" class="user-form">
              <mat-form-field appearance="outline">
                <mat-label>Nome</mat-label>
                <input matInput formControlName="name">
                @if (form.get('name')?.hasError('required')) {
                  <mat-error>Nome obrigatório</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>E-mail</mat-label>
                <input matInput type="email" formControlName="email">
                @if (form.get('email')?.hasError('required')) {
                  <mat-error>E-mail obrigatório</mat-error>
                }
                @if (form.get('email')?.hasError('email')) {
                  <mat-error>E-mail inválido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Perfil</mat-label>
                <mat-select formControlName="role">
                  <mat-option value="user">Usuário</mat-option>
                  <mat-option value="admin">Administrador</mat-option>
                </mat-select>
              </mat-form-field>

              @if (!editing) {
                <mat-form-field appearance="outline">
                  <mat-label>Senha</mat-label>
                  <input matInput [type]="showPwd ? 'text' : 'password'" formControlName="password">
                  <button mat-icon-button matSuffix type="button" (click)="showPwd = !showPwd">
                    <mat-icon>{{ showPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  @if (form.get('password')?.hasError('required')) {
                    <mat-error>Senha obrigatória</mat-error>
                  }
                  @if (form.get('password')?.hasError('minlength')) {
                    <mat-error>Mínimo 6 caracteres</mat-error>
                  }
                </mat-form-field>
              }

              @if (editing) {
                <mat-form-field appearance="outline" class="full-col">
                  <mat-label>Ativo</mat-label>
                  <mat-select formControlName="isActive">
                    <mat-option [value]="true">Ativo</mat-option>
                    <mat-option [value]="false">Inativo</mat-option>
                  </mat-select>
                </mat-form-field>
              }

              <div class="form-actions full-col">
                <button mat-button type="button" (click)="cancelForm()">Cancelar</button>
                <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving">
                  {{ saving ? 'Salvando...' : 'Salvar' }}
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      @if (showPasswordForm) {
        <mat-card class="form-card password-card">
          <mat-card-header>
            <mat-card-title>Redefinir Senha — {{ passwordTarget?.name }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="pwd-form">
              <mat-form-field appearance="outline" class="pwd-field">
                <mat-label>Nova Senha</mat-label>
                <input matInput [type]="showNewPwd ? 'text' : 'password'" [(ngModel)]="newPassword">
                <button mat-icon-button matSuffix type="button" (click)="showNewPwd = !showNewPwd">
                  <mat-icon>{{ showNewPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>
              <div class="pwd-actions">
                <button mat-button (click)="cancelPasswordForm()">Cancelar</button>
                <button mat-raised-button color="warn" (click)="savePassword()" [disabled]="!newPassword || newPassword.length < 6 || saving">
                  Redefinir Senha
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      }

      @if (loading) {
        <div class="loading"><mat-spinner diameter="48"></mat-spinner></div>
      } @else {
        <mat-card>
          <mat-card-content>
            @if (users.length === 0) {
              <div class="empty-state">
                <mat-icon>group</mat-icon>
                <p>Nenhum usuário cadastrado.</p>
              </div>
            } @else {
              <table mat-table [dataSource]="users" class="full-width">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Nome</th>
                  <td mat-cell *matCellDef="let u">
                    <div class="name-cell">
                      <mat-icon class="user-avatar">account_circle</mat-icon>
                      <span>{{ u.name }}</span>
                      @if (u.id === currentUserId) {
                        <mat-chip class="you-chip">Você</mat-chip>
                      }
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="email">
                  <th mat-header-cell *matHeaderCellDef>E-mail</th>
                  <td mat-cell *matCellDef="let u">{{ u.email }}</td>
                </ng-container>

                <ng-container matColumnDef="role">
                  <th mat-header-cell *matHeaderCellDef>Perfil</th>
                  <td mat-cell *matCellDef="let u">
                    <mat-chip [class]="u.role">
                      <mat-icon>{{ u.role === 'admin' ? 'admin_panel_settings' : 'person' }}</mat-icon>
                      {{ u.role === 'admin' ? 'Admin' : 'Usuário' }}
                    </mat-chip>
                  </td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let u">
                    @if (u.isActive) {
                      <mat-chip class="active">Ativo</mat-chip>
                    } @else {
                      <mat-chip class="inactive">Inativo</mat-chip>
                    }
                  </td>
                </ng-container>

                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef>Criado em</th>
                  <td mat-cell *matCellDef="let u">{{ u.createdAt | date:'dd/MM/yyyy':'':'' }}</td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let u">
                    <button mat-icon-button (click)="openEdit(u)" matTooltip="Editar">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button (click)="openPasswordForm(u)" matTooltip="Redefinir senha">
                      <mat-icon>lock_reset</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="deleteUser(u)"
                      [disabled]="u.id === currentUserId"
                      matTooltip="{{ u.id === currentUserId ? 'Não é possível excluir seu próprio usuário' : 'Excluir' }}">
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
    .users-page { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .page-header h2 { margin: 0; color: var(--color-primary); }
    .info-text { display: flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; color: var(--color-text-secondary, #6C757D); margin-bottom: 1.25rem; }
    .info-icon { font-size: 1rem; height: 1rem; width: 1rem; }
    .form-card { margin-bottom: 1rem; border-left: 4px solid var(--color-primary, #4A6FA5); }
    .password-card { border-left-color: #f57c00; }
    .user-form { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .full-col { grid-column: span 2; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; padding-top: 0.25rem; }
    .full-width { width: 100%; }
    .loading { display: flex; justify-content: center; padding: 3rem; }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 3rem; color: var(--color-text-secondary); }
    .empty-state mat-icon { font-size: 3rem; height: 3rem; width: 3rem; margin-bottom: 1rem; }
    .name-cell { display: flex; align-items: center; gap: 0.5rem; }
    .user-avatar { color: var(--color-text-secondary, #6C757D); }
    .you-chip { font-size: 11px !important; height: 20px !important; }
    mat-chip.admin { background: #e8eaf6 !important; color: #3949ab !important; }
    mat-chip.user { background: #f5f5f5 !important; color: #555 !important; }
    mat-chip.active { background: #e8f5e9 !important; color: #2e7d32 !important; }
    mat-chip.inactive { background: #ffebee !important; color: #c62828 !important; }
    .pwd-form { display: flex; flex-direction: column; gap: 0.75rem; }
    .pwd-field { width: 100%; max-width: 400px; }
    .pwd-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  `]
})
export class UsersComponent implements OnInit {
  users: AdminUser[] = [];
  columns = ['name', 'email', 'role', 'status', 'createdAt', 'actions'];
  loading = false;
  saving = false;
  showForm = false;
  showPasswordForm = false;
  editing: AdminUser | null = null;
  passwordTarget: AdminUser | null = null;
  showPwd = false;
  showNewPwd = false;
  newPassword = '';
  currentUserId: string;

  form: ReturnType<FormBuilder['group']>;

  constructor(
    private adminService: AdminUserService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private storage: StorageService
  ) {
    this.currentUserId = storage.user()?.id ?? '';
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['user', Validators.required],
      password: ['', [Validators.minLength(6)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.adminService.getAll().subscribe({
      next: r => { if (r.success && r.data) this.users = r.data; },
      complete: () => this.loading = false
    });
  }

  openCreate(): void {
    this.editing = null;
    this.form.reset({ role: 'user', isActive: true });
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.showPasswordForm = false;
    this.showForm = true;
  }

  openEdit(user: AdminUser): void {
    this.editing = user;
    this.form.reset({ name: user.name, email: user.email, role: user.role, isActive: user.isActive });
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    this.showPasswordForm = false;
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editing = null;
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;

    const obs = this.editing
      ? this.adminService.update(this.editing.id, { name: v.name!, email: v.email!, role: v.role!, isActive: v.isActive! })
      : this.adminService.create({ name: v.name!, email: v.email!, password: v.password!, role: v.role! });

    obs.subscribe({
      next: (r: any) => {
        if (r.success) {
          this.showForm = false;
          this.editing = null;
          this.load();
          this.snack.open('Usuário salvo!', '', { duration: 2000 });
        } else {
          this.snack.open(r.error ?? 'Erro ao salvar', 'Fechar', { duration: 4000 });
        }
      },
      error: (e: any) => {
        this.snack.open(e?.error?.error ?? 'Erro ao salvar', 'Fechar', { duration: 4000 });
        this.saving = false;
      },
      complete: () => this.saving = false
    });
  }

  openPasswordForm(user: AdminUser): void {
    this.passwordTarget = user;
    this.newPassword = '';
    this.showForm = false;
    this.showPasswordForm = true;
  }

  cancelPasswordForm(): void {
    this.showPasswordForm = false;
    this.passwordTarget = null;
  }

  savePassword(): void {
    if (!this.passwordTarget || !this.newPassword) return;
    this.saving = true;
    this.adminService.changePassword(this.passwordTarget.id, this.newPassword).subscribe({
      next: () => {
        this.showPasswordForm = false;
        this.passwordTarget = null;
        this.newPassword = '';
        this.snack.open('Senha redefinida!', '', { duration: 2000 });
      },
      error: () => {
        this.snack.open('Erro ao redefinir senha', 'Fechar', { duration: 4000 });
        this.saving = false;
      },
      complete: () => this.saving = false
    });
  }

  deleteUser(user: AdminUser): void {
    if (user.id === this.currentUserId) return;
    if (!confirm(`Excluir o usuário "${user.name}"? Todos os dados dele (gastos, categorias) serão removidos.`)) return;
    this.adminService.delete(user.id).subscribe({
      next: () => {
        this.load();
        this.snack.open('Usuário excluído!', '', { duration: 2000 });
      }
    });
  }
}
