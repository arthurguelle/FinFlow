-- 003_seed.sql
-- Descrição: Dados iniciais para desenvolvimento (usuário admin e movimentações padrão)
-- Data: 2026-04-10
-- ATENÇÃO: Executar APENAS em ambiente de desenvolvimento

BEGIN;

-- Usuário de desenvolvimento (senha: Admin@123 — bcrypt hash)
INSERT INTO users (id, name, email, password_hash)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Admin FinFlow',
    'admin@finflow.dev',
    '$2a$12$sq1SJuv6j3L1NiAiv5TiX.nNRyoQudrjrppTFSrJHk4cDELlJWofG'
)
ON CONFLICT (email) DO NOTHING;

-- Movimentações padrão para o usuário admin
INSERT INTO movements (user_id, title, description, type)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Salário',         'Receita mensal de salário',            'receita'),
    ('00000000-0000-0000-0000-000000000001', 'Cartão de Crédito', 'Fatura do cartão de crédito',        'divida'),
    ('00000000-0000-0000-0000-000000000001', 'Contas Fixas',    'Água, luz, internet, aluguel',         'divida'),
    ('00000000-0000-0000-0000-000000000001', 'Alimentação',     'Supermercado e restaurantes',          'divida'),
    ('00000000-0000-0000-0000-000000000001', 'Transporte',      'Combustível, transporte público',      'divida'),
    ('00000000-0000-0000-0000-000000000001', 'Freelance',       'Receitas extras de trabalho freelance','receita')
ON CONFLICT DO NOTHING;

COMMIT;
