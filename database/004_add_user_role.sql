-- 004_add_user_role.sql
-- Descrição: Adiciona coluna role à tabela users (admin | user)
-- Data: 2026-04-19

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('admin', 'user'));

-- Promove o usuário seed para admin
UPDATE users
    SET role = 'admin'
    WHERE id = '00000000-0000-0000-0000-000000000001';

COMMIT;
