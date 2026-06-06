-- Migração para adicionar tabela de rendas previstas
-- Esta tabela armazena a pré-configuração de renda do usuário e opcionalmente
-- permite gerar uma previsão na agenda financeira sem alterar o saldo.

CREATE TABLE IF NOT EXISTS rendas_previstas (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  conta_id UUID REFERENCES contas(id),
  tipo_renda VARCHAR(50) NOT NULL,
  descricao VARCHAR(150),
  valor_previsto NUMERIC(12,2) NOT NULL,
  frequencia VARCHAR(30) NOT NULL,
  dia_recebimento INTEGER,
  criar_na_agenda BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
