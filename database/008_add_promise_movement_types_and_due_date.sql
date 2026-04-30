-- 008_add_promise_movement_types_and_due_date.sql
-- Descricao: adiciona tipos de promessa em movements e data limite em expenses
-- Data: 2026-04-27

BEGIN;

ALTER TABLE IF EXISTS movements
    DROP CONSTRAINT IF EXISTS movements_type_check;

ALTER TABLE IF EXISTS movements
    ADD CONSTRAINT movements_type_check
    CHECK (type IN ('receita', 'divida', 'promessa_pagamento', 'promessa_recebimento'));

ALTER TABLE IF EXISTS expenses
    ADD COLUMN IF NOT EXISTS due_date DATE NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_due_date
    ON expenses(due_date)
    WHERE deleted_at IS NULL;

COMMIT;
