---
description: Cria o próximo script de migration SQL numerado sequencialmente em /database
---

# Skill: db-migration

Use este skill para criar uma nova migration de banco de dados no FinFlow.

## Fluxo de Execução

### 1. Descobrir o Próximo Número
```bash
ls database/ | sort | tail -1
# Ex: 003_seed.sql → próximo é 004
```

### 2. Criar o Arquivo
Nome do arquivo: `NNN_descricao_curta.sql`

Template obrigatório:
```sql
-- NNN_descricao_curta.sql
-- Descrição: <o que esta migration faz>
-- Data: <YYYY-MM-DD>

BEGIN;

-- Escreva o SQL aqui usando IF NOT EXISTS

COMMIT;
```

### 3. Regras
- **Nunca** editar scripts existentes
- Usar `IF NOT EXISTS` em CREATE TABLE e CREATE INDEX
- Soft delete com `deleted_at TIMESTAMPTZ NULL`
- Timestamps: `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`

### 4. Commit
```bash
git add database/NNN_descricao.sql
git commit -m "chore(db): add migration NNN - <descrição>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
