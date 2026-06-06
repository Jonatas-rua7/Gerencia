-- Migration: Orçamento Mensal (Budget)
-- Data: 06/06/2026

-- Tabela de orçamentos mensais por categoria
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE CASCADE,
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INT NOT NULL,
  valor_limite NUMERIC(12,2) NOT NULL CHECK (valor_limite > 0),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, categoria_id, mes, ano)
);

-- View para comparar orçamento vs gastos reais
CREATE OR REPLACE VIEW vw_orcamento_vs_real AS
SELECT
  o.id,
  o.usuario_id,
  o.mes,
  o.ano,
  o.valor_limite,
  c.id AS categoria_id,
  c.nome AS categoria,
  c.cor,
  COALESCE(SUM(m.valor), 0) AS valor_gasto,
  o.valor_limite - COALESCE(SUM(m.valor), 0) AS saldo_orcamento,
  ROUND((COALESCE(SUM(m.valor), 0) / NULLIF(o.valor_limite, 0)) * 100, 1) AS percentual_usado
FROM orcamentos o
JOIN categorias c ON c.id = o.categoria_id
LEFT JOIN movimentacoes m
  ON m.categoria_id = o.categoria_id
  AND m.usuario_id = o.usuario_id
  AND m.tipo = 'saida'
  AND EXTRACT(MONTH FROM m.data_movimentacao) = o.mes
  AND EXTRACT(YEAR FROM m.data_movimentacao) = o.ano
GROUP BY o.id, o.usuario_id, o.mes, o.ano, o.valor_limite, c.id, c.nome, c.cor;
