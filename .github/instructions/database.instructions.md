---
applyTo: database/**
---

# Database Instructions — PostgreSQL Scripts

## Diretriz de Contexto IA
- Antes de exploracoes amplas, respeitar `/.claudeignore` para reduzir tokens.
- Se algum arquivo ignorado for necessario para diagnostico/implementacao, solicitar confirmacao do usuario antes da leitura.

## Convenção de Nomenclatura de Arquivos
- Formato: `NNN_descricao_curta.sql` (ex: `001_create_tables.sql`, `004_add_category_to_expenses.sql`)
- **Nunca alterar** scripts já existentes — criar sempre um novo arquivo de migration.
- Numeração sequencial a partir do último número disponível.

## Estrutura Obrigatória de Cada Script
```sql
-- NNN_descricao.sql
-- Descrição: o que este script faz
-- Data: YYYY-MM-DD

BEGIN;

-- ... seu SQL aqui ...

COMMIT;
```

## Regras de DDL
1. Usar `CREATE TABLE IF NOT EXISTS`.
2. Usar `CREATE INDEX IF NOT EXISTS`.
3. PKs: `SERIAL PRIMARY KEY` ou `UUID DEFAULT gen_random_uuid() PRIMARY KEY`.
4. Timestamps padrão: `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`.
5. Soft delete: coluna `deleted_at TIMESTAMPTZ NULL` (NULL = ativo).
6. Nomes de tabelas: `snake_case`, plural (ex: `users`, `expenses`, `movements`).

## Tabelas do Domínio FinFlow
- `users` — autenticação
- `refresh_tokens` — JWT refresh
- `movements` — origens/categorias (título, descrição, tipo: receita|dívida)
- `expenses` — gastos extraídos do PDF (título, valor, data, movement_id, user_id)
