-- 005_demo_user.sql
-- Descrição: Role `demo` (conta visitante) + usuário seed demo com categorias e gastos de exemplo
-- Data: 2026-04-24
-- Senha pública da conta demo: FinFlowDemo1! (documentada no README)

BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user', 'demo'));

INSERT INTO users (id, name, email, password_hash, role)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Visitante FinFlow',
    'demo@finflow.dev',
    '$2b$10$ZivuaHuYqnYlshGFPK3ke.LBsEaxUFfyntZ3ZYn2YTJ4c0qiMNpnC',
    'demo'
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role = 'demo',
    is_active = TRUE,
    deleted_at = NULL,
    updated_at = NOW();

INSERT INTO movements (user_id, title, description, type)
SELECT '00000000-0000-0000-0000-000000000002', v.title, v.description, v.type
FROM (VALUES
    ('Salário',         'Receita mensal',              'receita'),
    ('Cartão de Crédito', 'Fatura do cartão',          'divida'),
    ('Contas Fixas',    'Água, luz, internet',       'divida'),
    ('Alimentação',     'Supermercado e restaurantes', 'divida'),
    ('Transporte',      'Combustível e transporte',  'divida')
) AS v(title, description, type)
WHERE NOT EXISTS (
    SELECT 1 FROM movements m
    JOIN users u ON u.id = m.user_id
    WHERE u.email = 'demo@finflow.dev' AND m.title = v.title AND m.deleted_at IS NULL
);

-- Gastos de exemplo (apenas se ainda não existirem para o demo)
INSERT INTO expenses (user_id, title, amount, expense_date, movement_id, source_file)
SELECT u.id, 'Supermercado Semana', 287.45, (CURRENT_DATE - INTERVAL '5 day')::date, m.id, NULL
FROM users u
JOIN movements m ON m.user_id = u.id AND m.title = 'Alimentação' AND m.deleted_at IS NULL
WHERE u.email = 'demo@finflow.dev' AND u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.user_id = u.id AND e.title = 'Supermercado Semana' AND e.deleted_at IS NULL
  );

INSERT INTO expenses (user_id, title, amount, expense_date, movement_id, source_file)
SELECT u.id, 'Netflix', 55.90, (CURRENT_DATE - INTERVAL '12 day')::date, m.id, NULL
FROM users u
JOIN movements m ON m.user_id = u.id AND m.title = 'Contas Fixas' AND m.deleted_at IS NULL
WHERE u.email = 'demo@finflow.dev' AND u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.user_id = u.id AND e.title = 'Netflix' AND e.deleted_at IS NULL
  );

INSERT INTO expenses (user_id, title, amount, expense_date, movement_id, source_file)
SELECT u.id, 'Salário mensal', 5200.00, (CURRENT_DATE - INTERVAL '3 day')::date, m.id, NULL
FROM users u
JOIN movements m ON m.user_id = u.id AND m.title = 'Salário' AND m.deleted_at IS NULL
WHERE u.email = 'demo@finflow.dev' AND u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.user_id = u.id AND e.title = 'Salário mensal' AND e.deleted_at IS NULL
  );

COMMIT;
