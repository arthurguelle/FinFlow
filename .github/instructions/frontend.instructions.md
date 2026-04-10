---
applyTo: frontend/**
---

# Frontend Instructions — Angular + Angular Material

## Estrutura de Pastas
```
frontend/src/app/
  core/
    services/        # ApiService, AuthService, StorageService
    guards/          # AuthGuard
    interceptors/    # JwtInterceptor, ErrorInterceptor
    models/          # interfaces TypeScript dos domínios
  features/
    auth/            # login (standalone component)
    dashboard/       # totalizadores
    expenses/        # listagem e upload de PDF
    movements/       # cadastro de movimentações (origens)
  shared/
    components/      # componentes reutilizáveis (loading, confirm-dialog...)
    pipes/           # currency-br, date-br
  environments/      # environment.ts e environment.prod.ts
```

## Regras Obrigatórias
1. **Standalone Components** — SEMPRE `standalone: true`. Proibido NgModule.
2. **Lazy Loading** — todas as rotas de features devem usar `loadComponent`.
3. **Angular Material** — preferir componentes Mat (mat-card, mat-table, mat-toolbar, mat-button, mat-dialog).
4. **Tema** — usar paleta customizada baseada em:
   - Primary: azul-acinzentado `#4A6FA5`
   - Accent: cinza `#6C757D`
   - Background: off-white `#F8F9FA`
5. **JWT Interceptor** — adicionar `Authorization: Bearer <token>` automaticamente.
6. **Environments:**
   - `environment.ts`: `{ production: false, apiUrl: 'http://localhost:5000' }`
   - `environment.prod.ts`: `{ production: true, apiUrl: '/api' }`
7. **Reactive Forms** — preferir sobre template-driven para formulários.
8. **RxJS** — usar `AsyncPipe` no template em vez de subscribes manuais.

## Padrão de Serviço HTTP
```typescript
// Sempre retornar Observable<ApiResponse<T>>
getExpenses(): Observable<ApiResponse<Expense[]>> {
  return this.http.get<ApiResponse<Expense[]>>(`${this.apiUrl}/expenses`);
}
```

## Convenções
- Arquivos: `kebab-case.component.ts`, `kebab-case.service.ts`
- Classes: PascalCase
- Variáveis/métodos: camelCase
