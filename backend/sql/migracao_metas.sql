-- Migration: Metas Financeiras (Financial Goals)
-- Data: 06/06/2026

-- Tabela de metas financeiras
CREATE TABLE IF NOT EXISTS metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  valor_alvo NUMERIC(12,2) NOT NULL CHECK (valor_alvo > 0),
  valor_atual NUMERIC(12,2) DEFAULT 0 CHECK (valor_atual >= 0),
  data_limite DATE,
  icone VARCHAR(10) DEFAULT '🎯',
  cor VARCHAR(7) DEFAULT '#1F7A3A',
  status VARCHAR(20) DEFAULT 'ativa' CHECK (status IN ('ativa','concluida','cancelada')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de aportes para metas
CREATE TABLE IF NOT EXISTS meta_aportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id UUID REFERENCES metas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  data DATE DEFAULT CURRENT_DATE,
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
