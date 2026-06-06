-- Migração de compatibilidade para o banco PostgreSQL gerencia_db
-- Este arquivo contém ALTER TABLE seguros para garantir que as colunas
-- usadas pelo backend existam no banco de dados.
--
-- ATENÇÃO: Este arquivo não deve ser executado automaticamente.
-- Execute manualmente após revisar as alterações necessárias.
--
-- Não apaga dados.
-- Não dropa tabelas.
-- Não recria tabelas.

-- Tabela: usuarios
-- Colunas esperadas pelo backend:
-- - documento_numero (VARCHAR)
-- - perfil_detalhado (VARCHAR)
-- - nivel_interface (VARCHAR)

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS documento_numero VARCHAR(30);

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS perfil_detalhado VARCHAR(50);

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS nivel_interface VARCHAR(20) DEFAULT 'simples';

-- Tabela: configuracoes_usuario
-- Colunas esperadas pelo backend:
-- - tema (VARCHAR)
-- - cor_principal (VARCHAR)
-- - cor_destaque (VARCHAR)
-- - mostrar_dicas (BOOLEAN)
-- - receber_alertas (BOOLEAN)

ALTER TABLE configuracoes_usuario
ADD COLUMN IF NOT EXISTS tema VARCHAR(20) DEFAULT 'padrao';

ALTER TABLE configuracoes_usuario
ADD COLUMN IF NOT EXISTS cor_principal VARCHAR(7);

ALTER TABLE configuracoes_usuario
ADD COLUMN IF NOT EXISTS cor_destaque VARCHAR(7);

ALTER TABLE configuracoes_usuario
ADD COLUMN IF NOT EXISTS mostrar_dicas BOOLEAN DEFAULT true;

ALTER TABLE configuracoes_usuario
ADD COLUMN IF NOT EXISTS receber_alertas BOOLEAN DEFAULT true;

-- Tabela: categorias
-- Coluna esperada pelo backend:
-- - ativa (BOOLEAN)

ALTER TABLE categorias
ADD COLUMN IF NOT EXISTS ativa BOOLEAN DEFAULT true;

-- Tabela: contas
-- Coluna esperada pelo backend:
-- - ativa (BOOLEAN)

ALTER TABLE contas
ADD COLUMN IF NOT EXISTS ativa BOOLEAN DEFAULT true;

-- Tabela: clientes
-- Coluna esperada pelo backend:
-- - ativo (BOOLEAN)

ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Tabela: fornecedores
-- Coluna esperada pelo backend:
-- - ativo (BOOLEAN)

ALTER TABLE fornecedores
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Tabela: contas_pagar
-- Coluna esperada pelo backend:
-- - fornecedor_id (UUID) em vez de fornecedor_nome
-- NOTA: Se o banco atual usa fornecedor_nome, considere migrar para fornecedor_id
-- Esta migração apenas adiciona a coluna se não existir

ALTER TABLE contas_pagar
ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES fornecedores(id);

-- Tabela: contas_receber
-- Coluna esperada pelo backend:
-- - cliente_id (UUID) em vez de cliente_nome
-- NOTA: Se o banco atual usa cliente_nome, considere migrar para cliente_id
-- Esta migração apenas adiciona a coluna se não existir

ALTER TABLE contas_receber
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id);
