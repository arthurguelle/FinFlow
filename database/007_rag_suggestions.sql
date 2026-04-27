-- 007_rag_suggestions.sql
-- Descrição: Adiciona função para sugerir gastos com base nos dados do usuário
-- Data: 2026-04-24

BEGIN;

-- Função para sugerir gastos
CREATE OR REPLACE FUNCTION suggest_expenses(p_user_id UUID)
RETURNS TABLE (
    category TEXT,
    average_spent NUMERIC,
    suggested_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.title::TEXT AS category,
        AVG(e.amount)::NUMERIC AS average_spent,
        (AVG(e.amount) * 1.1)::NUMERIC AS suggested_amount
    FROM
        expenses e
    JOIN
        movements m ON e.movement_id = m.id
    WHERE
        e.user_id = p_user_id
        AND e.deleted_at IS NULL
    GROUP BY
        m.title
    ORDER BY
        average_spent DESC;
END;
$$ LANGUAGE plpgsql;

COMMIT;