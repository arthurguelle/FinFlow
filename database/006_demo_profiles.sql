-- 006_demo_profiles.sql
-- Descrição: 3 perfis demo com histórico rico — Família, Freelancer e Empresário
-- Senha de todos: FinFlowDemo1! (mesmo hash do usuário demo principal)
-- Data: 2026-04-24

BEGIN;

-- ─── USUÁRIOS ────────────────────────────────────────────────────────────────

INSERT INTO users (id, name, email, password_hash, role) VALUES
  ('00000000-0000-0000-0000-000000000010', 'Família Silva',      'familia@finflow.dev',     '$2b$10$ZivuaHuYqnYlshGFPK3ke.LBsEaxUFfyntZ3ZYn2YTJ4c0qiMNpnC', 'demo'),
  ('00000000-0000-0000-0000-000000000011', 'Carlos Freelancer',  'freelancer@finflow.dev',  '$2b$10$ZivuaHuYqnYlshGFPK3ke.LBsEaxUFfyntZ3ZYn2YTJ4c0qiMNpnC', 'demo'),
  ('00000000-0000-0000-0000-000000000012', 'Ana Empresária',     'empresario@finflow.dev',  '$2b$10$ZivuaHuYqnYlshGFPK3ke.LBsEaxUFfyntZ3ZYn2YTJ4c0qiMNpnC', 'demo')
ON CONFLICT (email) DO UPDATE SET
  name          = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role          = 'demo',
  is_active     = TRUE,
  deleted_at    = NULL,
  updated_at    = NOW();

-- ─── MOVIMENTOS: FAMÍLIA ─────────────────────────────────────────────────────

INSERT INTO movements (user_id, title, description, type)
SELECT '00000000-0000-0000-0000-000000000010', v.title, v.description, v.type
FROM (VALUES
  ('Salário Casal',       'Renda mensal do casal',             'receita'),
  ('Cartão de Crédito',   'Fatura mensal do cartão',           'divida'),
  ('Escola e Educação',   'Mensalidade e material escolar',    'divida'),
  ('Supermercado',        'Compras de mercado e hortifruti',   'divida'),
  ('Saúde e Plano',       'Plano de saúde e farmácia',         'divida'),
  ('Energia e Internet',  'Energia, água e internet',          'divida'),
  ('Lazer e Passeios',    'Entretenimento e passeios família', 'divida')
) AS v(title, description, type)
WHERE NOT EXISTS (
  SELECT 1 FROM movements m
  WHERE m.user_id = '00000000-0000-0000-0000-000000000010' AND m.title = v.title AND m.deleted_at IS NULL
);

-- ─── MOVIMENTOS: FREELANCER ──────────────────────────────────────────────────

INSERT INTO movements (user_id, title, description, type)
SELECT '00000000-0000-0000-0000-000000000011', v.title, v.description, v.type
FROM (VALUES
  ('Projetos',               'Receita de projetos e clientes',     'receita'),
  ('Alimentação',            'Refeições e delivery',               'divida'),
  ('Equipamentos e Software','Hardware, licenças e assinaturas',   'divida'),
  ('Coworking',              'Aluguel espaço de trabalho',         'divida'),
  ('Marketing e Cursos',     'Anúncios, cursos e certificações',   'divida'),
  ('Impostos MEI',           'DAS mensal e obrigações fiscais',    'divida')
) AS v(title, description, type)
WHERE NOT EXISTS (
  SELECT 1 FROM movements m
  WHERE m.user_id = '00000000-0000-0000-0000-000000000011' AND m.title = v.title AND m.deleted_at IS NULL
);

-- ─── MOVIMENTOS: EMPRESÁRIA ──────────────────────────────────────────────────

INSERT INTO movements (user_id, title, description, type)
SELECT '00000000-0000-0000-0000-000000000012', v.title, v.description, v.type
FROM (VALUES
  ('Faturamento',         'Receita de vendas e serviços',      'receita'),
  ('Folha de Pagamento',  'Salários e encargos trabalhistas',  'divida'),
  ('Aluguel Comercial',   'Aluguel e condomínio comercial',    'divida'),
  ('Fornecedores',        'Pagamento a fornecedores',          'divida'),
  ('Marketing e Ads',     'Google Ads, redes sociais e mídia', 'divida'),
  ('Impostos e Taxas',    'Simples Nacional, ISS e tributos',  'divida')
) AS v(title, description, type)
WHERE NOT EXISTS (
  SELECT 1 FROM movements m
  WHERE m.user_id = '00000000-0000-0000-0000-000000000012' AND m.title = v.title AND m.deleted_at IS NULL
);

-- ─── GASTOS: FAMÍLIA (46 registros, Jan–Abr 2026) ────────────────────────────

INSERT INTO expenses (user_id, title, amount, expense_date, movement_id)
SELECT '00000000-0000-0000-0000-000000000010'::uuid, v.title, v.amount, v.dt::date, m.id
FROM (VALUES
  -- Salário Casal
  ('Salário Casal','Salário Janeiro',          9500.00,'2026-01-05'),
  ('Salário Casal','Salário Fevereiro',        9500.00,'2026-02-05'),
  ('Salário Casal','Salário Março',            9500.00,'2026-03-05'),
  ('Salário Casal','Salário Abril',            9500.00,'2026-04-05'),
  -- Cartão de Crédito
  ('Cartão de Crédito','Fatura Jan',           2100.00,'2026-01-20'),
  ('Cartão de Crédito','Fatura Fev',           1850.00,'2026-02-20'),
  ('Cartão de Crédito','Fatura Mar',           2300.00,'2026-03-20'),
  ('Cartão de Crédito','Fatura Abr',           1950.00,'2026-04-15'),
  -- Escola e Educação
  ('Escola e Educação','Mensalidade Jan',      1200.00,'2026-01-10'),
  ('Escola e Educação','Extracurricular Jan',   350.00,'2026-01-15'),
  ('Escola e Educação','Mensalidade Fev',      1200.00,'2026-02-10'),
  ('Escola e Educação','Livros e Material',     280.00,'2026-02-12'),
  ('Escola e Educação','Mensalidade Mar',      1200.00,'2026-03-10'),
  ('Escola e Educação','Passeio Escolar',       190.00,'2026-03-18'),
  ('Escola e Educação','Mensalidade Abr',      1200.00,'2026-04-10'),
  -- Supermercado
  ('Supermercado','Compras Jan semana 1',       850.00,'2026-01-07'),
  ('Supermercado','Compras Jan semana 3',       620.00,'2026-01-21'),
  ('Supermercado','Compras Fev semana 1',       930.00,'2026-02-07'),
  ('Supermercado','Compras Fev semana 3',       510.00,'2026-02-22'),
  ('Supermercado','Compras Mar semana 1',       780.00,'2026-03-07'),
  ('Supermercado','Compras Mar semana 3',       690.00,'2026-03-21'),
  ('Supermercado','Compras Abr semana 1',       920.00,'2026-04-07'),
  ('Supermercado','Compras Abr hortifruti',     245.00,'2026-04-18'),
  -- Saúde e Plano
  ('Saúde e Plano','Plano de Saúde Jan',        780.00,'2026-01-08'),
  ('Saúde e Plano','Farmácia Jan',              145.00,'2026-01-22'),
  ('Saúde e Plano','Plano de Saúde Fev',        780.00,'2026-02-08'),
  ('Saúde e Plano','Dentista',                  450.00,'2026-02-19'),
  ('Saúde e Plano','Plano de Saúde Mar',        780.00,'2026-03-08'),
  ('Saúde e Plano','Médico Particular',         350.00,'2026-03-22'),
  ('Saúde e Plano','Plano de Saúde Abr',        780.00,'2026-04-08'),
  -- Energia e Internet
  ('Energia e Internet','Energia Jan',          320.00,'2026-01-12'),
  ('Energia e Internet','Internet e TV Jan',    199.00,'2026-01-15'),
  ('Energia e Internet','Energia Fev',          290.00,'2026-02-12'),
  ('Energia e Internet','Internet e TV Fev',    199.00,'2026-02-15'),
  ('Energia e Internet','Agua e Esgoto',        120.00,'2026-02-25'),
  ('Energia e Internet','Energia Mar',          310.00,'2026-03-12'),
  ('Energia e Internet','Internet e TV Mar',    199.00,'2026-03-15'),
  ('Energia e Internet','Energia Abr',          335.00,'2026-04-12'),
  ('Energia e Internet','Internet e TV Abr',    199.00,'2026-04-15'),
  -- Lazer e Passeios
  ('Lazer e Passeios','Cinema família Jan',     280.00,'2026-01-18'),
  ('Lazer e Passeios','Restaurante Jan',        310.00,'2026-01-25'),
  ('Lazer e Passeios','Passeio Parque Fev',     180.00,'2026-02-15'),
  ('Lazer e Passeios','Streaming Fev',           55.90,'2026-02-20'),
  ('Lazer e Passeios','Teatro Mar',             220.00,'2026-03-14'),
  ('Lazer e Passeios','Restaurante Mar',        290.00,'2026-03-28'),
  ('Lazer e Passeios','Passeio Abr',            150.00,'2026-04-20')
) AS v(movement_title, title, amount, dt)
JOIN movements m
  ON m.user_id = '00000000-0000-0000-0000-000000000010'::uuid
 AND m.title = v.movement_title
 AND m.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM expenses e
  WHERE e.user_id = '00000000-0000-0000-0000-000000000010'::uuid
    AND e.title = v.title
    AND e.expense_date = v.dt::date
    AND e.deleted_at IS NULL
);

-- ─── GASTOS: FREELANCER (31 registros, Jan–Abr 2026) ─────────────────────────

INSERT INTO expenses (user_id, title, amount, expense_date, movement_id)
SELECT '00000000-0000-0000-0000-000000000011'::uuid, v.title, v.amount, v.dt::date, m.id
FROM (VALUES
  -- Projetos (receita)
  ('Projetos','Projeto Site E-commerce',        4500.00,'2026-01-15'),
  ('Projetos','Projeto App Mobile',             3200.00,'2026-01-28'),
  ('Projetos','Consultoria React e Node',       5800.00,'2026-02-12'),
  ('Projetos','Projeto Landing Page',           2100.00,'2026-03-10'),
  ('Projetos','API Backend para Startup',       4800.00,'2026-03-25'),
  ('Projetos','Dashboard Analytics',            3600.00,'2026-04-18'),
  -- Alimentação
  ('Alimentação','Refeições Jan',                780.00,'2026-01-31'),
  ('Alimentação','iFood Jan',                    420.00,'2026-01-29'),
  ('Alimentação','Refeições Fev',                850.00,'2026-02-28'),
  ('Alimentação','iFood Fev',                    390.00,'2026-02-27'),
  ('Alimentação','Refeições Mar',                920.00,'2026-03-31'),
  ('Alimentação','Delivery Mar',                 350.00,'2026-03-28'),
  ('Alimentação','Refeições Abr',                680.00,'2026-04-20'),
  ('Alimentação','Delivery Abr',                 280.00,'2026-04-18'),
  -- Equipamentos e Software
  ('Equipamentos e Software','Adobe Creative',   299.00,'2026-01-10'),
  ('Equipamentos e Software','GitHub Pro',        59.00,'2026-01-10'),
  ('Equipamentos e Software','Figma Pro',        189.00,'2026-02-10'),
  ('Equipamentos e Software','AWS e Vercel',     145.00,'2026-03-15'),
  ('Equipamentos e Software','SSD Samsung 1TB',  450.00,'2026-04-08'),
  -- Coworking
  ('Coworking','Coworking Janeiro',              650.00,'2026-01-05'),
  ('Coworking','Coworking Fevereiro',            650.00,'2026-02-05'),
  ('Coworking','Coworking Março',                650.00,'2026-03-05'),
  ('Coworking','Coworking Abril',                650.00,'2026-04-05'),
  -- Marketing e Cursos
  ('Marketing e Cursos','Curso Udemy React',     199.00,'2026-01-20'),
  ('Marketing e Cursos','LinkedIn Premium',       89.90,'2026-02-20'),
  ('Marketing e Cursos','Ads LinkedIn',          200.00,'2026-03-20'),
  ('Marketing e Cursos','Curso AWS CDK',         299.00,'2026-04-15'),
  -- Impostos MEI
  ('Impostos MEI','DAS Janeiro',                  75.90,'2026-01-20'),
  ('Impostos MEI','DAS Fevereiro',                75.90,'2026-02-20'),
  ('Impostos MEI','DAS Março',                    75.90,'2026-03-20'),
  ('Impostos MEI','DAS Abril',                    75.90,'2026-04-20')
) AS v(movement_title, title, amount, dt)
JOIN movements m
  ON m.user_id = '00000000-0000-0000-0000-000000000011'::uuid
 AND m.title = v.movement_title
 AND m.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM expenses e
  WHERE e.user_id = '00000000-0000-0000-0000-000000000011'::uuid
    AND e.title = v.title
    AND e.expense_date = v.dt::date
    AND e.deleted_at IS NULL
);

-- ─── GASTOS: EMPRESÁRIA (45 registros, Jan–Abr 2026) ─────────────────────────

INSERT INTO expenses (user_id, title, amount, expense_date, movement_id)
SELECT '00000000-0000-0000-0000-000000000012'::uuid, v.title, v.amount, v.dt::date, m.id
FROM (VALUES
  -- Faturamento (receita)
  ('Faturamento','Faturamento Janeiro',         35000.00,'2026-01-20'),
  ('Faturamento','Faturamento Fevereiro',       28000.00,'2026-02-20'),
  ('Faturamento','Faturamento Março',           42000.00,'2026-03-20'),
  ('Faturamento','Faturamento Abril',           38000.00,'2026-04-18'),
  -- Folha de Pagamento
  ('Folha de Pagamento','Salários Jan',         18500.00,'2026-01-05'),
  ('Folha de Pagamento','Encargos Jan',          4200.00,'2026-01-10'),
  ('Folha de Pagamento','Salários Fev',         18500.00,'2026-02-05'),
  ('Folha de Pagamento','Encargos Fev',          4200.00,'2026-02-10'),
  ('Folha de Pagamento','Salários Mar',         18500.00,'2026-03-05'),
  ('Folha de Pagamento','Encargos Mar',          4200.00,'2026-03-10'),
  ('Folha de Pagamento','Salários Abr',         18500.00,'2026-04-05'),
  ('Folha de Pagamento','Encargos Abr',          4200.00,'2026-04-10'),
  -- Aluguel Comercial
  ('Aluguel Comercial','Aluguel Jan',            3200.00,'2026-01-05'),
  ('Aluguel Comercial','Condomínio Jan',          450.00,'2026-01-10'),
  ('Aluguel Comercial','Aluguel Fev',            3200.00,'2026-02-05'),
  ('Aluguel Comercial','Condomínio Fev',          450.00,'2026-02-10'),
  ('Aluguel Comercial','Aluguel Mar',            3200.00,'2026-03-05'),
  ('Aluguel Comercial','Condomínio Mar',          450.00,'2026-03-10'),
  ('Aluguel Comercial','Aluguel Abr',            3200.00,'2026-04-05'),
  -- Fornecedores
  ('Fornecedores','Fornecedor TI Jan',           2800.00,'2026-01-15'),
  ('Fornecedores','Insumos Jan',                 1500.00,'2026-01-18'),
  ('Fornecedores','Software Empresarial',        1800.00,'2026-02-15'),
  ('Fornecedores','Material Escritório',          650.00,'2026-02-22'),
  ('Fornecedores','Hardware Equipe',             3500.00,'2026-03-15'),
  ('Fornecedores','Material Geral',               890.00,'2026-03-20'),
  ('Fornecedores','Fornecedor Abr',              2100.00,'2026-04-15'),
  ('Fornecedores','Material Abr',                 780.00,'2026-04-18'),
  -- Marketing e Ads
  ('Marketing e Ads','Google Ads Jan',           1500.00,'2026-01-15'),
  ('Marketing e Ads','Instagram Ads Jan',         800.00,'2026-01-20'),
  ('Marketing e Ads','Google Ads Fev',           2000.00,'2026-02-15'),
  ('Marketing e Ads','Google Ads Mar',           1800.00,'2026-03-15'),
  ('Marketing e Ads','Redes Sociais Mar',         600.00,'2026-03-20'),
  ('Marketing e Ads','Google Ads Abr',           1500.00,'2026-04-15'),
  -- Impostos e Taxas
  ('Impostos e Taxas','ISS Jan',                 1750.00,'2026-01-20'),
  ('Impostos e Taxas','Simples Nacional Jan',    2100.00,'2026-01-20'),
  ('Impostos e Taxas','ISS Fev',                 1400.00,'2026-02-20'),
  ('Impostos e Taxas','Simples Nacional Fev',    1680.00,'2026-02-20'),
  ('Impostos e Taxas','ISS Mar',                 2100.00,'2026-03-20'),
  ('Impostos e Taxas','Simples Nacional Mar',    2520.00,'2026-03-20'),
  ('Impostos e Taxas','ISS Abr',                 1900.00,'2026-04-18'),
  ('Impostos e Taxas','Simples Nacional Abr',    2280.00,'2026-04-18')
) AS v(movement_title, title, amount, dt)
JOIN movements m
  ON m.user_id = '00000000-0000-0000-0000-000000000012'::uuid
 AND m.title = v.movement_title
 AND m.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM expenses e
  WHERE e.user_id = '00000000-0000-0000-0000-000000000012'::uuid
    AND e.title = v.title
    AND e.expense_date = v.dt::date
    AND e.deleted_at IS NULL
);

COMMIT;
