-- 010_seed_promises_base_profiles.sql
-- Descricao: adiciona promessas de teste para os perfis base familia, freelancer e empresario
-- Data: 2026-04-27

BEGIN;

INSERT INTO movements (user_id, title, description, type)
SELECT
    u.id,
    v.title,
    v.description,
    v.type
FROM users u
CROSS JOIN (
    VALUES
        ('Promessa Recebimento Clientes', 'Promessas de recebimento para validacao visual no dashboard', 'promessa_recebimento'),
        ('Promessa Pagamento Fornecedores', 'Promessas de pagamento para validacao visual no dashboard', 'promessa_pagamento')
) AS v(title, description, type)
WHERE u.email IN ('familia@finflow.dev', 'freelancer@finflow.dev', 'empresario@finflow.dev')
  AND u.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM movements m
      WHERE m.user_id = u.id
        AND m.title = v.title
        AND m.type = v.type
        AND m.deleted_at IS NULL
  );

INSERT INTO expenses (user_id, title, amount, expense_date, movement_id, source_file, due_date)
SELECT
    u.id,
    v.expense_title,
    v.amount,
    (CURRENT_DATE - make_interval(days => v.expense_days_ago))::date,
    m.id,
    NULL,
    (CURRENT_DATE + make_interval(days => v.due_in_days))::date
FROM users u
JOIN (
    VALUES
        ('Recebimento Contrato Recorrente', 980.00::numeric, 12, -2, 'Promessa Recebimento Clientes', 'promessa_recebimento'),
        ('Pagamento Servico Mensal', 420.00::numeric, 8, -1, 'Promessa Pagamento Fornecedores', 'promessa_pagamento'),
        ('Recebimento Projeto Futuro', 1500.00::numeric, 2, 5, 'Promessa Recebimento Clientes', 'promessa_recebimento')
) AS v(expense_title, amount, expense_days_ago, due_in_days, movement_title, movement_type)
    ON TRUE
JOIN movements m
    ON m.user_id = u.id
   AND m.title = v.movement_title
   AND m.type = v.movement_type
   AND m.deleted_at IS NULL
WHERE u.email IN ('familia@finflow.dev', 'freelancer@finflow.dev', 'empresario@finflow.dev')
  AND u.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM expenses e
      WHERE e.user_id = u.id
        AND e.title = v.expense_title
        AND e.deleted_at IS NULL
  );

COMMIT;
