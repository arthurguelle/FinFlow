# 001 — Conta Demo, Login Redesign e Hardening de Roles

**Data:** 2026-04-24  
**Agente:** GitHub Copilot  
**Branch:** `main` (mudanças locais — pendente commit)

---

## Resumo Executivo

Sessão focada em três frentes:

1. **Conta demo** — novo role `demo` com PDF bloqueado (API + UI), botão "Experimentar" na tela de login, seed SQL e proteção no AdminService para impedir promoção/rebaixamento indevido.
2. **Redesign da tela de login** — layout dois painéis (hero lateral + card de login), botão demo proeminente e divisor "ou e-mail".
3. **Ajustes menores** — HSTS em todos os locations do nginx, favicon SVG, `.gitignore` exclui `tools/bcround/`.

---

## Mudanças por Arquivo

### Backend

#### `backend/FinFlow.Api/Endpoints/ExpenseEndpoints.cs`
- Adicionada guarda no endpoint `POST /expenses/extract-pdf`: retorna **403 Forbidden** para usuários com role `demo`.
- Mensagem: _"Conta demo não permite importação de PDF. Use Colar texto ou cadastro manual."_

#### `backend/FinFlow.Api/Models/Entities.cs`
- Comentário do campo `Role` atualizado: `"admin" | "user" | "demo"` (sem alteração no schema SQL, apenas documentação no código).

#### `backend/FinFlow.Api/Services/AdminService.cs`
- `CreateUser`: rejeita criação com role `demo` (lança `InvalidOperationException`).
- `UpdateUser`: impede que um usuário `demo` tenha seu role alterado pelo painel admin.

---

### Frontend

#### `frontend/src/app/core/models/models.ts`
- Tipos `UserDto.role` e `AdminUser.role` atualizados para `'admin' | 'user' | 'demo'`.

#### `frontend/src/app/app.ts`
- Badge **Demo** exibida na barra de navegação quando `user.role === 'demo'`.
- Estilo sutil: fundo semi-transparente, borda leve, texto uppercase 0.65rem.

#### `frontend/src/app/features/auth/login/login.component.ts`
- **Layout renovado:** grid dois painéis — painel esquerdo `login-hero` com gradiente verde-floresta e lista de funcionalidades; painel direito com o card de login.
- Botão **"Experimentar conta demo"** acima do formulário (chama `entrarComoDemo()`).
- Hint: _"A importação de PDF está desativada na demo..."_
- Divisor `ou e-mail` entre o botão demo e o formulário.
- `demoLoading` flag independente do `loading` do formulário.
- Login demo consome `environment.demoEmail` / `environment.demoPassword`.
- Adicionado `autocomplete="username"` e `autocomplete="current-password"` nos inputs.
- Responsivo: abaixo de 960 px o hero empilha sobre o card.

#### `frontend/src/app/features/expenses/expenses.component.ts`
- Importado `MatTooltipModule` (dependência de tooltip já usada no template).

#### `frontend/src/app/features/users/users.component.ts`
- Ajustes de exibição do role `demo` na tabela de usuários (badge visual).

#### `frontend/src/environments/environment.ts` e `environment.prod.ts`
- Adicionadas propriedades `demoEmail` e `demoPassword` para o botão de login demo.

#### `frontend/src/index.html`
- Ajustes de metatags / título (a confirmar via diff completo).

---

### Banco de Dados

#### `database/005_demo_user.sql` *(novo)*
- Script de seed do usuário demo: `demo@finflow.dev` / `FinFlowDemo1!` com role `demo`.
- Deve ser aplicado após `004_add_user_role.sql`.

---

### Infra

#### `infra/nginx.conf` — commit `d502921` (já commitado)
- `listen 80 default_server` — captura requisições por IP direto.
- Redirect HTTP → `https://arthurguelle.duckdns.org$request_uri` (domínio fixo em vez de `$host`).
- Suporte a desafio ACME (`/.well-known/acme-challenge/`) para renovação Let's Encrypt.
- `Strict-Transport-Security "max-age=31536000"` adicionado em **todos** os blocos `location` (index.html, assets, `/`, proxy `/api`).
- Certificado Let's Encrypt: `/etc/letsencrypt/live/arthurguelle.duckdns.org/{fullchain,privkey}.pem`.

#### `infra/docker-compose.yml`
- Mudanças a confirmar via diff (provavelmente variáveis de ambiente / volumes).

---

### Outros

#### `.gitignore`
- Adicionada seção `# Ferramentas temporárias locais` excluindo `tools/bcround/`.

#### `frontend/public/favicon.svg` *(novo)*
- Favicon SVG do projeto.

#### `README.md`
- Role `demo` documentado na lista de funcionalidades.
- Instruções de setup incluem `004` e `005` nas migrations.
- Seção "Credenciais padrão" expandida com a conta demo e suas limitações.

---

## Decisões Técnicas

| Decisão | Motivo |
|---------|--------|
| Bloquear PDF no backend (403) e na UI | Defesa em profundidade — a UI desabilita o botão, mas a API reforça a regra |
| `demoEmail`/`demoPassword` nos environments | Evita hardcode no componente; fácil de sobrescrever em produção sem recompilar |
| AdminService impede criação/edição de role `demo` | Garante que admins não criem contas demo extras acidentalmente |
| HSTS em todos os locations | Alguns clientes fazem requisições diretas a sub-paths; HSTS precisa estar presente em qualquer resposta |
| Redirect para domínio fixo no HTTP→HTTPS | Evita problema de certificado quando o usuário acessa pelo IP da VPS |

---

## Scripts SQL a Aplicar na VPS

```bash
docker exec -i finflow_postgres psql -U finflow -d finflow < database/005_demo_user.sql
```

> Scripts 001–004 já aplicados em produção.

---

## Próximos Passos
1. Fazer commit e push das mudanças pendentes.
2. Rodar `./deploy.sh` (ou `./deploy.sh --backend-only` se só o backend mudou).
3. Aplicar `005_demo_user.sql` na VPS.
4. Testar o fluxo: botão demo → login → verificar badge → tentar upload PDF → confirmar 403.
