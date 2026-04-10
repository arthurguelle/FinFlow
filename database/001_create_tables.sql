-- 001_create_tables.sql
-- Descrição: Criação das tabelas principais do FinFlow (users, movements, expenses)
-- Data: 2026-04-10

BEGIN;

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tabela: users ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(150) NOT NULL,
    email        VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- ── Tabela: movements (origens/categorias de gastos) ──────────────────────────
-- tipo: 'receita' | 'divida'
CREATE TABLE IF NOT EXISTS movements (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(150) NOT NULL,
    description TEXT        NULL,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('receita', 'divida')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_movements_user_id ON movements(user_id) WHERE deleted_at IS NULL;

-- ── Tabela: expenses (gastos extraídos do PDF) ────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movement_id UUID        NULL REFERENCES movements(id) ON DELETE SET NULL,
    title       VARCHAR(255) NOT NULL,
    amount      NUMERIC(12, 2) NOT NULL,
    expense_date DATE        NOT NULL,
    source_file VARCHAR(255) NULL,  -- nome do PDF de origem
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id     ON expenses(user_id)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_movement_id ON expenses(movement_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_date        ON expenses(expense_date) WHERE deleted_at IS NULL;

-- ── Trigger: atualiza updated_at automaticamente ──────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
        CREATE TRIGGER trg_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_movements_updated_at') THEN
        CREATE TRIGGER trg_movements_updated_at
            BEFORE UPDATE ON movements
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_expenses_updated_at') THEN
        CREATE TRIGGER trg_expenses_updated_at
            BEFORE UPDATE ON expenses
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;

COMMIT;
