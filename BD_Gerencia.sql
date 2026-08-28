--
-- PostgreSQL database dump
--

\restrict oDs4m9glzU0Azy8POLd0m0E8hfJVhcdYZxAdCLRrDmESHErmfqPEfzWZAJdflEM

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-06-05 19:03:56

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 16389)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5504 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 296 (class 1255 OID 17123)
-- Name: atualizar_agendas_atrasadas(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.atualizar_agendas_atrasadas() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_total INTEGER;
BEGIN
  WITH atualizadas AS (
    UPDATE agenda_financeira
    SET status = 'atrasado'
    WHERE status = 'pendente'
    AND data_prevista < CURRENT_DATE
    RETURNING id, usuario_id, descricao, valor_previsto, data_prevista
  ),

  avisos_criados AS (
    INSERT INTO avisos_financeiros (
      usuario_id,
      agenda_id,
      tipo,
      titulo,
      mensagem,
      nivel
    )
    SELECT
      a.usuario_id,
      a.id,
      'conta_atrasada',
      'Conta atrasada',
      'A agenda "' || a.descricao || '" venceu em ' || TO_CHAR(a.data_prevista, 'DD/MM/YYYY') || ' e ainda está pendente.',
      'atencao'
    FROM atualizadas a
    WHERE NOT EXISTS (
      SELECT 1
      FROM avisos_financeiros av
      WHERE av.agenda_id = a.id
      AND av.tipo = 'conta_atrasada'
    )
    RETURNING id
  )

  SELECT COUNT(*)
  INTO v_total
  FROM atualizadas;

  RETURN v_total;
END;
$$;


ALTER FUNCTION public.atualizar_agendas_atrasadas() OWNER TO postgres;

--
-- TOC entry 291 (class 1255 OID 17067)
-- Name: atualizar_campo_atualizado_em(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.atualizar_campo_atualizado_em() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.atualizar_campo_atualizado_em() OWNER TO postgres;

--
-- TOC entry 305 (class 1255 OID 17121)
-- Name: cancelar_agenda(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cancelar_agenda(p_agenda_id uuid, p_motivo text DEFAULT NULL::text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_agenda agenda_financeira%ROWTYPE;
BEGIN
  SELECT *
  INTO v_agenda
  FROM agenda_financeira
  WHERE id = p_agenda_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro da agenda não encontrado.';
  END IF;

  IF v_agenda.status = 'cancelado' THEN
    RAISE EXCEPTION 'Essa agenda já está cancelada.';
  END IF;

  IF v_agenda.status IN ('pago', 'recebido') THEN
    RAISE EXCEPTION 'Não é possível cancelar uma agenda já realizada.';
  END IF;

  UPDATE agenda_financeira
  SET
    status = 'cancelado',
    observacao = COALESCE(p_motivo, observacao)
  WHERE id = p_agenda_id;

  INSERT INTO registros_internos (
    usuario_id,
    agenda_id,
    tipo,
    titulo,
    descricao
  )
  VALUES (
    v_agenda.usuario_id,
    p_agenda_id,
    'ajuste',
    'Agenda cancelada',
    COALESCE(p_motivo, 'Uma agenda financeira foi cancelada.')
  );

  RETURN 'Agenda cancelada com sucesso.';
END;
$$;


ALTER FUNCTION public.cancelar_agenda(p_agenda_id uuid, p_motivo text) OWNER TO postgres;

--
-- TOC entry 310 (class 1255 OID 24676)
-- Name: criar_token_recuperacao_demo(character varying, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.criar_token_recuperacao_demo(p_email character varying, p_token text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  SELECT id
  INTO v_usuario_id
  FROM usuarios
  WHERE LOWER(email) = LOWER(p_email);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  INSERT INTO tokens_recuperacao_senha (
    usuario_id,
    token_hash,
    expira_em
  )
  VALUES (
    v_usuario_id,
    encode(digest(p_token, 'sha256'), 'hex'),
    CURRENT_TIMESTAMP + INTERVAL '1 hour'
  );

  RETURN 'Token de recuperação criado com sucesso.';
END;
$$;


ALTER FUNCTION public.criar_token_recuperacao_demo(p_email character varying, p_token text) OWNER TO postgres;

--
-- TOC entry 309 (class 1255 OID 24649)
-- Name: gerar_aviso_saldo_previsto_baixo(uuid, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.gerar_aviso_saldo_previsto_baixo(p_usuario_id uuid, p_limite numeric DEFAULT 0) RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
  v_saldo_previsto NUMERIC(12,2);
BEGIN
  SELECT saldo_previsto
  INTO v_saldo_previsto
  FROM vw_saldo_previsto_usuario
  WHERE usuario_id = p_usuario_id;

  IF v_saldo_previsto IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  IF v_saldo_previsto <= p_limite THEN
    INSERT INTO avisos_financeiros (
      usuario_id,
      tipo,
      titulo,
      mensagem,
      nivel
    )
    SELECT
      p_usuario_id,
      'saldo_previsto_baixo',
      'Saldo previsto baixo',
      'Seu saldo previsto está em R$ ' || REPLACE(TO_CHAR(v_saldo_previsto, 'FM999999990.00'), '.', ',') || '. Verifique suas contas a pagar e a receber.',
      'atencao'
    WHERE NOT EXISTS (
      SELECT 1
      FROM avisos_financeiros
      WHERE usuario_id = p_usuario_id
      AND tipo = 'saldo_previsto_baixo'
      AND resolvido = FALSE
    );

    RETURN 'Aviso de saldo previsto baixo verificado.';
  END IF;

  RETURN 'Saldo previsto está dentro do limite.';
END;
$_$;


ALTER FUNCTION public.gerar_aviso_saldo_previsto_baixo(p_usuario_id uuid, p_limite numeric) OWNER TO postgres;

--
-- TOC entry 304 (class 1255 OID 17120)
-- Name: realizar_agenda(uuid, uuid, numeric, date, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.realizar_agenda(p_agenda_id uuid, p_conta_id uuid DEFAULT NULL::uuid, p_valor numeric DEFAULT NULL::numeric, p_data date DEFAULT CURRENT_DATE, p_observacao text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_agenda agenda_financeira%ROWTYPE;
  v_conta_id UUID;
  v_valor NUMERIC(12,2);
  v_tipo_movimentacao VARCHAR(20);
  v_origem VARCHAR(30);
  v_novo_status VARCHAR(20);
  v_total_realizado NUMERIC(12,2);
  v_movimentacao_id UUID;
BEGIN
  SELECT *
  INTO v_agenda
  FROM agenda_financeira
  WHERE id = p_agenda_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro da agenda não encontrado.';
  END IF;

  IF v_agenda.status = 'cancelado' THEN
    RAISE EXCEPTION 'Não é possível realizar uma agenda cancelada.';
  END IF;

  IF v_agenda.status IN ('pago', 'recebido') THEN
    RAISE EXCEPTION 'Essa agenda já foi realizada.';
  END IF;

  v_conta_id := COALESCE(p_conta_id, v_agenda.conta_id);
  v_valor := COALESCE(p_valor, v_agenda.valor_previsto);

  IF v_conta_id IS NULL THEN
    RAISE EXCEPTION 'Informe uma conta para realizar essa agenda.';
  END IF;

  IF v_valor <= 0 THEN
    RAISE EXCEPTION 'O valor realizado deve ser maior que zero.';
  END IF;

  IF v_agenda.tipo = 'conta_receber' THEN
    v_tipo_movimentacao := 'entrada';
    v_origem := 'conta_receber';

  ELSIF v_agenda.tipo = 'conta_pagar' THEN
    v_tipo_movimentacao := 'saida';
    v_origem := 'conta_pagar';

  ELSIF v_agenda.tipo = 'parcela' THEN
    v_tipo_movimentacao := 'saida';
    v_origem := 'parcela';

  ELSIF v_agenda.tipo = 'compromisso' THEN
    v_tipo_movimentacao := 'saida';
    v_origem := 'conta_pagar';

  ELSE
    RAISE EXCEPTION 'Esse tipo de agenda não pode ser realizado diretamente.';
  END IF;

  SELECT COALESCE(SUM(valor_realizado), 0)
  INTO v_total_realizado
  FROM realizacoes_agenda
  WHERE agenda_id = p_agenda_id;

  IF v_total_realizado + v_valor > v_agenda.valor_previsto THEN
    RAISE EXCEPTION 'O valor realizado ultrapassa o valor previsto.';
  END IF;

  INSERT INTO movimentacoes (
    usuario_id,
    conta_id,
    categoria_id,
    tipo,
    descricao,
    valor,
    data_movimentacao,
    origem,
    observacao
  )
  VALUES (
    v_agenda.usuario_id,
    v_conta_id,
    v_agenda.categoria_id,
    v_tipo_movimentacao,
    v_agenda.descricao,
    v_valor,
    p_data,
    v_origem,
    COALESCE(p_observacao, v_agenda.observacao)
  )
  RETURNING id INTO v_movimentacao_id;

  INSERT INTO realizacoes_agenda (
    agenda_id,
    movimentacao_id,
    valor_realizado,
    data_realizacao
  )
  VALUES (
    p_agenda_id,
    v_movimentacao_id,
    v_valor,
    p_data
  );

  v_total_realizado := v_total_realizado + v_valor;

  IF v_total_realizado >= v_agenda.valor_previsto THEN
    IF v_agenda.tipo = 'conta_receber' THEN
      v_novo_status := 'recebido';
    ELSE
      v_novo_status := 'pago';
    END IF;
  ELSE
    v_novo_status := 'parcial';
  END IF;

  UPDATE agenda_financeira
  SET status = v_novo_status
  WHERE id = p_agenda_id;

  INSERT INTO registros_internos (
    usuario_id,
    movimentacao_id,
    agenda_id,
    tipo,
    titulo,
    descricao
  )
  VALUES (
    v_agenda.usuario_id,
    v_movimentacao_id,
    p_agenda_id,
    CASE
      WHEN v_tipo_movimentacao = 'entrada' THEN 'recebimento'
      ELSE 'pagamento'
    END,
    'Agenda realizada',
    'Uma agenda financeira foi transformada em movimentação real.'
  );

  RETURN v_movimentacao_id;
END;
$$;


ALTER FUNCTION public.realizar_agenda(p_agenda_id uuid, p_conta_id uuid, p_valor numeric, p_data date, p_observacao text) OWNER TO postgres;

--
-- TOC entry 306 (class 1255 OID 17122)
-- Name: registrar_transferencia(uuid, uuid, numeric, date, character varying, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.registrar_transferencia(p_conta_origem_id uuid, p_conta_destino_id uuid, p_valor numeric, p_data date DEFAULT CURRENT_DATE, p_descricao character varying DEFAULT 'Transferência entre contas'::character varying, p_observacao text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_usuario_origem UUID;
  v_usuario_destino UUID;
  v_transferencia_id UUID;
BEGIN
  IF p_conta_origem_id = p_conta_destino_id THEN
    RAISE EXCEPTION 'A conta de origem não pode ser igual à conta de destino.';
  END IF;

  IF p_valor <= 0 THEN
    RAISE EXCEPTION 'O valor da transferência deve ser maior que zero.';
  END IF;

  SELECT usuario_id
  INTO v_usuario_origem
  FROM contas
  WHERE id = p_conta_origem_id
  AND ativa = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta de origem não encontrada ou inativa.';
  END IF;

  SELECT usuario_id
  INTO v_usuario_destino
  FROM contas
  WHERE id = p_conta_destino_id
  AND ativa = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta de destino não encontrada ou inativa.';
  END IF;

  IF v_usuario_origem <> v_usuario_destino THEN
    RAISE EXCEPTION 'As contas precisam pertencer ao mesmo usuário.';
  END IF;

  INSERT INTO transferencias (
    usuario_id,
    conta_origem_id,
    conta_destino_id,
    valor,
    data_transferencia,
    descricao,
    observacao
  )
  VALUES (
    v_usuario_origem,
    p_conta_origem_id,
    p_conta_destino_id,
    p_valor,
    p_data,
    p_descricao,
    p_observacao
  )
  RETURNING id INTO v_transferencia_id;

  INSERT INTO registros_internos (
    usuario_id,
    tipo,
    titulo,
    descricao
  )
  VALUES (
    v_usuario_origem,
    'transferencia',
    'Transferência registrada',
    'Uma transferência entre contas foi registrada sem virar receita ou despesa.'
  );

  RETURN v_transferencia_id;
END;
$$;


ALTER FUNCTION public.registrar_transferencia(p_conta_origem_id uuid, p_conta_destino_id uuid, p_valor numeric, p_data date, p_descricao character varying, p_observacao text) OWNER TO postgres;

--
-- TOC entry 307 (class 1255 OID 24637)
-- Name: sugerir_categoria(uuid, text, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sugerir_categoria(p_usuario_id uuid, p_texto text, p_tipo character varying DEFAULT NULL::character varying) RETURNS TABLE(categoria_id uuid, categoria_nome text, palavra_encontrada text, tipo_registro text, confianca integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS categoria_id,
    c.nome::TEXT AS categoria_nome,
    r.palavra_chave::TEXT AS palavra_encontrada,
    r.tipo::TEXT AS tipo_registro,
    r.peso AS confianca
  FROM regras_categorizacao r
  JOIN categorias c ON c.id = r.categoria_id
  WHERE r.usuario_id = p_usuario_id
  AND r.ativa = TRUE
  AND (p_tipo IS NULL OR r.tipo = p_tipo)
  AND LOWER(p_texto) LIKE '%' || LOWER(r.palavra_chave) || '%'
  ORDER BY r.peso DESC, LENGTH(r.palavra_chave) DESC
  LIMIT 3;
END;
$$;


ALTER FUNCTION public.sugerir_categoria(p_usuario_id uuid, p_texto text, p_tipo character varying) OWNER TO postgres;

--
-- TOC entry 308 (class 1255 OID 24638)
-- Name: sugerir_melhor_categoria(uuid, text, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sugerir_melhor_categoria(p_usuario_id uuid, p_texto text, p_tipo character varying DEFAULT NULL::character varying) RETURNS TABLE(categoria_id uuid, categoria_nome text, palavra_encontrada text, tipo_registro text, confianca integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM sugerir_categoria(p_usuario_id, p_texto, p_tipo)
  ORDER BY confianca DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION public.sugerir_melhor_categoria(p_usuario_id uuid, p_texto text, p_tipo character varying) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 226 (class 1259 OID 16601)
-- Name: agenda_financeira; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agenda_financeira (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    conta_id uuid,
    categoria_id uuid,
    tipo character varying(30) NOT NULL,
    descricao character varying(150) NOT NULL,
    valor_previsto numeric(12,2) NOT NULL,
    data_prevista date NOT NULL,
    status character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    observacao text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    compromisso_id uuid,
    CONSTRAINT agenda_financeira_status_check CHECK (((status)::text = ANY ((ARRAY['pendente'::character varying, 'pago'::character varying, 'recebido'::character varying, 'parcial'::character varying, 'atrasado'::character varying, 'cancelado'::character varying])::text[]))),
    CONSTRAINT agenda_financeira_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['conta_pagar'::character varying, 'conta_receber'::character varying, 'parcela'::character varying, 'recorrencia'::character varying, 'compromisso'::character varying])::text[]))),
    CONSTRAINT agenda_financeira_valor_previsto_check CHECK ((valor_previsto > (0)::numeric))
);


ALTER TABLE public.agenda_financeira OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 17015)
-- Name: avisos_financeiros; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.avisos_financeiros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    agenda_id uuid,
    tipo character varying(40) NOT NULL,
    titulo character varying(150) NOT NULL,
    mensagem text NOT NULL,
    nivel character varying(20) DEFAULT 'info'::character varying NOT NULL,
    lido boolean DEFAULT false NOT NULL,
    resolvido boolean DEFAULT false NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT avisos_financeiros_nivel_check CHECK (((nivel)::text = ANY ((ARRAY['info'::character varying, 'atencao'::character varying, 'positivo'::character varying])::text[]))),
    CONSTRAINT avisos_financeiros_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['conta_vencendo'::character varying, 'conta_atrasada'::character varying, 'saldo_previsto_baixo'::character varying, 'valor_a_receber'::character varying, 'gasto_acima_padrao'::character varying, 'aviso_positivo'::character varying, 'sugestao_recorrencia'::character varying, 'sugestao_categoria'::character varying])::text[])))
);


ALTER TABLE public.avisos_financeiros OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16886)
-- Name: caixinhas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.caixinhas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    conta_id uuid,
    nome character varying(100) NOT NULL,
    objetivo text,
    valor_separado numeric(12,2) DEFAULT 0 NOT NULL,
    meta_valor numeric(12,2),
    ativa boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT caixinhas_meta_valor_check CHECK ((meta_valor >= (0)::numeric)),
    CONSTRAINT caixinhas_valor_separado_check CHECK ((valor_separado >= (0)::numeric))
);


ALTER TABLE public.caixinhas OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16501)
-- Name: categorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    nome character varying(100) NOT NULL,
    tipo character varying(20) NOT NULL,
    cor character varying(20),
    padrao boolean DEFAULT false NOT NULL,
    ativa boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT categorias_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['entrada'::character varying, 'saida'::character varying])::text[])))
);


ALTER TABLE public.categorias OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16814)
-- Name: clientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    nome character varying(150) NOT NULL,
    contato character varying(150),
    documento character varying(20),
    observacao text,
    ativo boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.clientes OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16917)
-- Name: compromissos_financeiros; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.compromissos_financeiros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    conta_id uuid,
    categoria_id uuid,
    nome character varying(150) NOT NULL,
    tipo character varying(40) NOT NULL,
    valor_parcela numeric(12,2) NOT NULL,
    quantidade_total_parcelas integer,
    parcelas_pagas integer DEFAULT 0 NOT NULL,
    dia_vencimento integer,
    status character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    observacao text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT compromissos_financeiros_dia_vencimento_check CHECK (((dia_vencimento >= 1) AND (dia_vencimento <= 31))),
    CONSTRAINT compromissos_financeiros_parcelas_pagas_check CHECK ((parcelas_pagas >= 0)),
    CONSTRAINT compromissos_financeiros_quantidade_total_parcelas_check CHECK ((quantidade_total_parcelas > 0)),
    CONSTRAINT compromissos_financeiros_status_check CHECK (((status)::text = ANY ((ARRAY['ativo'::character varying, 'finalizado'::character varying, 'cancelado'::character varying])::text[]))),
    CONSTRAINT compromissos_financeiros_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['financiamento'::character varying, 'emprestimo'::character varying, 'consorcio'::character varying, 'carne'::character varying, 'divida_parcelada'::character varying, 'parcelamento_imposto'::character varying, 'outro'::character varying])::text[]))),
    CONSTRAINT compromissos_financeiros_valor_parcela_check CHECK ((valor_parcela > (0)::numeric))
);


ALTER TABLE public.compromissos_financeiros OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16451)
-- Name: configuracoes_usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.configuracoes_usuario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    tema character varying(30) DEFAULT 'padrao'::character varying NOT NULL,
    cor_principal character varying(20),
    cor_destaque character varying(20),
    mostrar_dicas boolean DEFAULT true NOT NULL,
    receber_alertas boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT configuracoes_usuario_tema_check CHECK (((tema)::text = ANY ((ARRAY['padrao'::character varying, 'escuro'::character varying, 'personalizado'::character varying])::text[])))
);


ALTER TABLE public.configuracoes_usuario OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16477)
-- Name: contas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    nome character varying(100) NOT NULL,
    tipo_conta character varying(40) NOT NULL,
    saldo_inicial numeric(12,2) DEFAULT 0 NOT NULL,
    ativa boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT contas_tipo_conta_check CHECK (((tipo_conta)::text = ANY ((ARRAY['conta_corrente'::character varying, 'poupanca'::character varying, 'carteira_digital'::character varying, 'dinheiro_fisico'::character varying, 'conta_empresarial'::character varying, 'outro'::character varying])::text[])))
);


ALTER TABLE public.contas OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16663)
-- Name: contas_pagar; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contas_pagar (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agenda_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    fornecedor_nome character varying(150),
    forma_pagamento character varying(60),
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fornecedor_id uuid
);


ALTER TABLE public.contas_pagar OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16688)
-- Name: contas_receber; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contas_receber (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agenda_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    cliente_nome character varying(150),
    forma_recebimento character varying(60),
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cliente_id uuid
);


ALTER TABLE public.contas_receber OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16836)
-- Name: fornecedores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fornecedores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    nome character varying(150) NOT NULL,
    contato character varying(150),
    documento character varying(20),
    observacao text,
    ativo boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.fornecedores OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 17050)
-- Name: logs_basicos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.logs_basicos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    acao character varying(100) NOT NULL,
    entidade character varying(100),
    entidade_id uuid,
    detalhes jsonb,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.logs_basicos OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16525)
-- Name: movimentacoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.movimentacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    conta_id uuid NOT NULL,
    categoria_id uuid,
    tipo character varying(20) NOT NULL,
    descricao character varying(150) NOT NULL,
    valor numeric(12,2) NOT NULL,
    data_movimentacao date NOT NULL,
    origem character varying(30) DEFAULT 'manual'::character varying NOT NULL,
    observacao text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT movimentacoes_origem_check CHECK (((origem)::text = ANY ((ARRAY['manual'::character varying, 'conta_pagar'::character varying, 'conta_receber'::character varying, 'parcela'::character varying, 'recorrencia'::character varying, 'transferencia'::character varying, 'ajuste'::character varying])::text[]))),
    CONSTRAINT movimentacoes_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['entrada'::character varying, 'saida'::character varying])::text[]))),
    CONSTRAINT movimentacoes_valor_check CHECK ((valor > (0)::numeric))
);


ALTER TABLE public.movimentacoes OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16751)
-- Name: parcelamentos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parcelamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    conta_id uuid,
    categoria_id uuid,
    descricao character varying(150) NOT NULL,
    valor_total numeric(12,2) NOT NULL,
    quantidade_parcelas integer NOT NULL,
    data_primeira_parcela date NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT parcelamentos_quantidade_parcelas_check CHECK ((quantidade_parcelas > 1)),
    CONSTRAINT parcelamentos_valor_total_check CHECK ((valor_total > (0)::numeric))
);


ALTER TABLE public.parcelamentos OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16784)
-- Name: parcelas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parcelas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parcelamento_id uuid NOT NULL,
    agenda_id uuid NOT NULL,
    numero_parcela integer NOT NULL,
    valor_parcela numeric(12,2) NOT NULL,
    vencimento date NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT parcelas_numero_parcela_check CHECK ((numero_parcela > 0)),
    CONSTRAINT parcelas_valor_parcela_check CHECK ((valor_parcela > (0)::numeric))
);


ALTER TABLE public.parcelas OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16639)
-- Name: realizacoes_agenda; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.realizacoes_agenda (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agenda_id uuid NOT NULL,
    movimentacao_id uuid NOT NULL,
    valor_realizado numeric(12,2) NOT NULL,
    data_realizacao date NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT realizacoes_agenda_valor_realizado_check CHECK ((valor_realizado > (0)::numeric))
);


ALTER TABLE public.realizacoes_agenda OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16713)
-- Name: recorrencias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recorrencias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    conta_id uuid,
    categoria_id uuid,
    tipo character varying(30) NOT NULL,
    descricao character varying(150) NOT NULL,
    valor numeric(12,2) NOT NULL,
    frequencia character varying(20) NOT NULL,
    dia_referencia integer,
    data_inicio date NOT NULL,
    data_fim date,
    ativa boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT recorrencias_dia_referencia_check CHECK (((dia_referencia >= 1) AND (dia_referencia <= 31))),
    CONSTRAINT recorrencias_frequencia_check CHECK (((frequencia)::text = ANY ((ARRAY['semanal'::character varying, 'quinzenal'::character varying, 'mensal'::character varying, 'anual'::character varying])::text[]))),
    CONSTRAINT recorrencias_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['entrada'::character varying, 'saida'::character varying, 'conta_pagar'::character varying, 'conta_receber'::character varying])::text[]))),
    CONSTRAINT recorrencias_valor_check CHECK ((valor > (0)::numeric))
);


ALTER TABLE public.recorrencias OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16975)
-- Name: registros_internos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registros_internos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    movimentacao_id uuid,
    agenda_id uuid,
    cliente_id uuid,
    fornecedor_id uuid,
    tipo character varying(30) NOT NULL,
    titulo character varying(150) NOT NULL,
    descricao text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT registros_internos_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['pagamento'::character varying, 'recebimento'::character varying, 'transferencia'::character varying, 'ajuste'::character varying, 'outro'::character varying])::text[])))
);


ALTER TABLE public.registros_internos OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 24601)
-- Name: regras_categorizacao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.regras_categorizacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    categoria_id uuid NOT NULL,
    tipo character varying(20) NOT NULL,
    palavra_chave character varying(80) NOT NULL,
    peso integer DEFAULT 50 NOT NULL,
    ativa boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT regras_categorizacao_peso_check CHECK (((peso >= 1) AND (peso <= 100))),
    CONSTRAINT regras_categorizacao_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['entrada'::character varying, 'saida'::character varying])::text[])))
);


ALTER TABLE public.regras_categorizacao OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16858)
-- Name: servicos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.servicos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    cliente_id uuid,
    nome character varying(150) NOT NULL,
    descricao text,
    valor_padrao numeric(12,2),
    ativo boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT servicos_valor_padrao_check CHECK ((valor_padrao >= (0)::numeric))
);


ALTER TABLE public.servicos OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 24651)
-- Name: tokens_recuperacao_senha; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tokens_recuperacao_senha (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    token_hash text NOT NULL,
    expira_em timestamp without time zone NOT NULL,
    usado boolean DEFAULT false NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    usado_em timestamp without time zone
);


ALTER TABLE public.tokens_recuperacao_senha OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16564)
-- Name: transferencias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transferencias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    conta_origem_id uuid NOT NULL,
    conta_destino_id uuid NOT NULL,
    valor numeric(12,2) NOT NULL,
    data_transferencia date NOT NULL,
    descricao character varying(150) DEFAULT 'Transferência entre contas'::character varying NOT NULL,
    observacao text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT transferencias_check CHECK ((conta_origem_id <> conta_destino_id)),
    CONSTRAINT transferencias_valor_check CHECK ((valor > (0)::numeric))
);


ALTER TABLE public.transferencias OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16427)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    senha_hash text NOT NULL,
    tipo_uso character varying(20) NOT NULL,
    documento_tipo character varying(10),
    documento_numero character varying(20),
    perfil_detalhado character varying(60),
    nivel_interface character varying(20) DEFAULT 'simples'::character varying NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT usuarios_documento_tipo_check CHECK (((documento_tipo)::text = ANY ((ARRAY['CPF'::character varying, 'CNPJ'::character varying])::text[]))),
    CONSTRAINT usuarios_nivel_interface_check CHECK (((nivel_interface)::text = ANY ((ARRAY['simples'::character varying, 'avancado'::character varying])::text[]))),
    CONSTRAINT usuarios_tipo_uso_check CHECK (((tipo_uso)::text = ANY ((ARRAY['pessoal'::character varying, 'autonomo'::character varying, 'empresa'::character varying])::text[])))
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 24677)
-- Name: versoes_banco; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.versoes_banco (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    versao character varying(20) NOT NULL,
    nome character varying(100) NOT NULL,
    descricao text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.versoes_banco OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 17115)
-- Name: vw_agenda_detalhada; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_agenda_detalhada AS
 SELECT a.id AS agenda_id,
    a.usuario_id,
    a.tipo,
    a.descricao,
    a.valor_previsto,
    a.data_prevista,
    a.status,
    c.nome AS conta,
    cat.nome AS categoria,
    cp.fornecedor_nome,
    cr.cliente_nome,
    a.observacao,
    a.criado_em,
    a.atualizado_em,
    to_char((a.data_prevista)::timestamp with time zone, 'DD/MM/YYYY'::text) AS data_prevista_formatada,
    to_char(a.criado_em, 'DD/MM/YYYY HH24:MI'::text) AS criado_em_formatado,
    to_char(a.atualizado_em, 'DD/MM/YYYY HH24:MI'::text) AS atualizado_em_formatado
   FROM ((((public.agenda_financeira a
     LEFT JOIN public.contas c ON ((c.id = a.conta_id)))
     LEFT JOIN public.categorias cat ON ((cat.id = a.categoria_id)))
     LEFT JOIN public.contas_pagar cp ON ((cp.agenda_id = a.id)))
     LEFT JOIN public.contas_receber cr ON ((cr.agenda_id = a.id)));


ALTER VIEW public.vw_agenda_detalhada OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 24639)
-- Name: vw_agenda_valores; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_agenda_valores AS
 SELECT a.id AS agenda_id,
    a.usuario_id,
    a.tipo,
    a.descricao,
    a.valor_previsto,
    COALESCE(sum(r.valor_realizado), (0)::numeric) AS valor_realizado,
    (a.valor_previsto - COALESCE(sum(r.valor_realizado), (0)::numeric)) AS valor_restante,
    a.data_prevista,
    to_char((a.data_prevista)::timestamp with time zone, 'DD/MM/YYYY'::text) AS data_prevista_formatada,
    a.status
   FROM (public.agenda_financeira a
     LEFT JOIN public.realizacoes_agenda r ON ((r.agenda_id = a.id)))
  GROUP BY a.id, a.usuario_id, a.tipo, a.descricao, a.valor_previsto, a.data_prevista, a.status;


ALTER VIEW public.vw_agenda_valores OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 17105)
-- Name: vw_saldo_contas; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_saldo_contas AS
 WITH movimentos AS (
         SELECT movimentacoes.conta_id,
            sum(
                CASE
                    WHEN ((movimentacoes.tipo)::text = 'entrada'::text) THEN movimentacoes.valor
                    ELSE (0)::numeric
                END) AS total_entradas,
            sum(
                CASE
                    WHEN ((movimentacoes.tipo)::text = 'saida'::text) THEN movimentacoes.valor
                    ELSE (0)::numeric
                END) AS total_saidas
           FROM public.movimentacoes
          GROUP BY movimentacoes.conta_id
        ), transferencias_saida AS (
         SELECT transferencias.conta_origem_id AS conta_id,
            sum(transferencias.valor) AS total_transferido_saida
           FROM public.transferencias
          GROUP BY transferencias.conta_origem_id
        ), transferencias_entrada AS (
         SELECT transferencias.conta_destino_id AS conta_id,
            sum(transferencias.valor) AS total_transferido_entrada
           FROM public.transferencias
          GROUP BY transferencias.conta_destino_id
        )
 SELECT c.id AS conta_id,
    c.usuario_id,
    c.nome AS conta,
    c.tipo_conta,
    c.saldo_inicial,
    COALESCE(m.total_entradas, (0)::numeric) AS total_entradas,
    COALESCE(m.total_saidas, (0)::numeric) AS total_saidas,
    COALESCE(te.total_transferido_entrada, (0)::numeric) AS total_transferido_entrada,
    COALESCE(ts.total_transferido_saida, (0)::numeric) AS total_transferido_saida,
    ((((c.saldo_inicial + COALESCE(m.total_entradas, (0)::numeric)) - COALESCE(m.total_saidas, (0)::numeric)) + COALESCE(te.total_transferido_entrada, (0)::numeric)) - COALESCE(ts.total_transferido_saida, (0)::numeric)) AS saldo_atual
   FROM (((public.contas c
     LEFT JOIN movimentos m ON ((m.conta_id = c.id)))
     LEFT JOIN transferencias_entrada te ON ((te.conta_id = c.id)))
     LEFT JOIN transferencias_saida ts ON ((ts.conta_id = c.id)))
  WHERE (c.ativa = true);


ALTER VIEW public.vw_saldo_contas OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 17110)
-- Name: vw_resumo_usuario; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_resumo_usuario AS
 SELECT u.id AS usuario_id,
    u.nome,
    u.tipo_uso,
    u.perfil_detalhado,
    COALESCE(sum(v.saldo_atual), (0)::numeric) AS saldo_total,
    COALESCE(( SELECT sum(m.valor) AS sum
           FROM public.movimentacoes m
          WHERE ((m.usuario_id = u.id) AND ((m.tipo)::text = 'entrada'::text))), (0)::numeric) AS total_entradas,
    COALESCE(( SELECT sum(m.valor) AS sum
           FROM public.movimentacoes m
          WHERE ((m.usuario_id = u.id) AND ((m.tipo)::text = 'saida'::text))), (0)::numeric) AS total_saidas,
    COALESCE(( SELECT sum(a.valor_previsto) AS sum
           FROM public.agenda_financeira a
          WHERE ((a.usuario_id = u.id) AND ((a.tipo)::text = 'conta_pagar'::text) AND ((a.status)::text = ANY ((ARRAY['pendente'::character varying, 'atrasado'::character varying, 'parcial'::character varying])::text[])))), (0)::numeric) AS total_a_pagar,
    COALESCE(( SELECT sum(a.valor_previsto) AS sum
           FROM public.agenda_financeira a
          WHERE ((a.usuario_id = u.id) AND ((a.tipo)::text = 'conta_receber'::text) AND ((a.status)::text = ANY ((ARRAY['pendente'::character varying, 'atrasado'::character varying, 'parcial'::character varying])::text[])))), (0)::numeric) AS total_a_receber
   FROM (public.usuarios u
     LEFT JOIN public.vw_saldo_contas v ON ((v.usuario_id = u.id)))
  GROUP BY u.id, u.nome, u.tipo_uso, u.perfil_detalhado;


ALTER VIEW public.vw_resumo_usuario OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 24596)
-- Name: vw_dashboard_usuario; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_dashboard_usuario AS
 SELECT u.id AS usuario_id,
    u.nome,
    u.tipo_uso,
    u.perfil_detalhado,
    COALESCE(r.saldo_total, (0)::numeric) AS saldo_total,
    COALESCE(r.total_entradas, (0)::numeric) AS total_entradas,
    COALESCE(r.total_saidas, (0)::numeric) AS total_saidas,
    COALESCE(r.total_a_pagar, (0)::numeric) AS total_a_pagar,
    COALESCE(r.total_a_receber, (0)::numeric) AS total_a_receber,
    COALESCE(( SELECT count(*) AS count
           FROM public.agenda_financeira a
          WHERE ((a.usuario_id = u.id) AND ((a.status)::text = ANY ((ARRAY['pendente'::character varying, 'parcial'::character varying])::text[])))), (0)::bigint) AS total_pendencias,
    COALESCE(( SELECT count(*) AS count
           FROM public.agenda_financeira a
          WHERE ((a.usuario_id = u.id) AND ((a.status)::text = 'atrasado'::text))), (0)::bigint) AS total_atrasadas,
    COALESCE(( SELECT sum(cx.valor_separado) AS sum
           FROM public.caixinhas cx
          WHERE ((cx.usuario_id = u.id) AND (cx.ativa = true))), (0)::numeric) AS total_em_caixinhas
   FROM (public.usuarios u
     LEFT JOIN public.vw_resumo_usuario r ON ((r.usuario_id = u.id)));


ALTER VIEW public.vw_dashboard_usuario OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 24586)
-- Name: vw_gastos_por_categoria; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_gastos_por_categoria AS
 SELECT m.usuario_id,
    COALESCE(cat.nome, 'Sem categoria'::character varying) AS categoria,
    count(*) AS quantidade_movimentacoes,
    sum(m.valor) AS total_gasto
   FROM (public.movimentacoes m
     LEFT JOIN public.categorias cat ON ((cat.id = m.categoria_id)))
  WHERE ((m.tipo)::text = 'saida'::text)
  GROUP BY m.usuario_id, COALESCE(cat.nome, 'Sem categoria'::character varying);


ALTER VIEW public.vw_gastos_por_categoria OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 24576)
-- Name: vw_movimentacoes_detalhadas; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_movimentacoes_detalhadas AS
 SELECT m.id AS movimentacao_id,
    m.usuario_id,
    u.nome AS usuario,
    m.tipo,
    m.descricao,
    m.valor,
        CASE
            WHEN ((m.tipo)::text = 'entrada'::text) THEN m.valor
            WHEN ((m.tipo)::text = 'saida'::text) THEN (m.valor * ('-1'::integer)::numeric)
            ELSE NULL::numeric
        END AS valor_com_sinal,
    m.data_movimentacao,
    to_char((m.data_movimentacao)::timestamp with time zone, 'DD/MM/YYYY'::text) AS data_movimentacao_formatada,
    m.origem,
    c.nome AS conta,
    cat.nome AS categoria,
    m.observacao,
    m.criado_em,
    to_char(m.criado_em, 'DD/MM/YYYY HH24:MI'::text) AS criado_em_formatado
   FROM (((public.movimentacoes m
     JOIN public.usuarios u ON ((u.id = m.usuario_id)))
     JOIN public.contas c ON ((c.id = m.conta_id)))
     LEFT JOIN public.categorias cat ON ((cat.id = m.categoria_id)));


ALTER VIEW public.vw_movimentacoes_detalhadas OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 24591)
-- Name: vw_pendencias_financeiras; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_pendencias_financeiras AS
 SELECT a.id AS agenda_id,
    a.usuario_id,
    a.tipo,
    a.descricao,
    a.valor_previsto,
    a.data_prevista,
    to_char((a.data_prevista)::timestamp with time zone, 'DD/MM/YYYY'::text) AS data_prevista_formatada,
    a.status,
    c.nome AS conta,
    cat.nome AS categoria,
    cp.fornecedor_nome,
    cr.cliente_nome
   FROM ((((public.agenda_financeira a
     LEFT JOIN public.contas c ON ((c.id = a.conta_id)))
     LEFT JOIN public.categorias cat ON ((cat.id = a.categoria_id)))
     LEFT JOIN public.contas_pagar cp ON ((cp.agenda_id = a.id)))
     LEFT JOIN public.contas_receber cr ON ((cr.agenda_id = a.id)))
  WHERE ((a.status)::text = ANY ((ARRAY['pendente'::character varying, 'parcial'::character varying, 'atrasado'::character varying])::text[]));


ALTER VIEW public.vw_pendencias_financeiras OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 24581)
-- Name: vw_resultado_mensal; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_resultado_mensal AS
 SELECT usuario_id,
    (EXTRACT(year FROM data_movimentacao))::integer AS ano,
    (EXTRACT(month FROM data_movimentacao))::integer AS mes,
    to_char((data_movimentacao)::timestamp with time zone, 'MM/YYYY'::text) AS mes_ano,
    COALESCE(sum(
        CASE
            WHEN ((tipo)::text = 'entrada'::text) THEN valor
            ELSE (0)::numeric
        END), (0)::numeric) AS total_entradas,
    COALESCE(sum(
        CASE
            WHEN ((tipo)::text = 'saida'::text) THEN valor
            ELSE (0)::numeric
        END), (0)::numeric) AS total_saidas,
    (COALESCE(sum(
        CASE
            WHEN ((tipo)::text = 'entrada'::text) THEN valor
            ELSE (0)::numeric
        END), (0)::numeric) - COALESCE(sum(
        CASE
            WHEN ((tipo)::text = 'saida'::text) THEN valor
            ELSE (0)::numeric
        END), (0)::numeric)) AS resultado_financeiro
   FROM public.movimentacoes
  GROUP BY usuario_id, (EXTRACT(year FROM data_movimentacao)), (EXTRACT(month FROM data_movimentacao)), (to_char((data_movimentacao)::timestamp with time zone, 'MM/YYYY'::text));


ALTER VIEW public.vw_resultado_mensal OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 24644)
-- Name: vw_saldo_previsto_usuario; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_saldo_previsto_usuario AS
 SELECT id AS usuario_id,
    nome,
    COALESCE(( SELECT sum(sc.saldo_atual) AS sum
           FROM public.vw_saldo_contas sc
          WHERE (sc.usuario_id = u.id)), (0)::numeric) AS saldo_atual,
    COALESCE(( SELECT sum(av.valor_restante) AS sum
           FROM public.vw_agenda_valores av
          WHERE ((av.usuario_id = u.id) AND ((av.tipo)::text = 'conta_receber'::text) AND ((av.status)::text = ANY ((ARRAY['pendente'::character varying, 'parcial'::character varying, 'atrasado'::character varying])::text[])))), (0)::numeric) AS total_previsto_receber,
    COALESCE(( SELECT sum(av.valor_restante) AS sum
           FROM public.vw_agenda_valores av
          WHERE ((av.usuario_id = u.id) AND ((av.tipo)::text = ANY ((ARRAY['conta_pagar'::character varying, 'parcela'::character varying, 'compromisso'::character varying])::text[])) AND ((av.status)::text = ANY ((ARRAY['pendente'::character varying, 'parcial'::character varying, 'atrasado'::character varying])::text[])))), (0)::numeric) AS total_previsto_pagar,
    ((COALESCE(( SELECT sum(sc.saldo_atual) AS sum
           FROM public.vw_saldo_contas sc
          WHERE (sc.usuario_id = u.id)), (0)::numeric) + COALESCE(( SELECT sum(av.valor_restante) AS sum
           FROM public.vw_agenda_valores av
          WHERE ((av.usuario_id = u.id) AND ((av.tipo)::text = 'conta_receber'::text) AND ((av.status)::text = ANY ((ARRAY['pendente'::character varying, 'parcial'::character varying, 'atrasado'::character varying])::text[])))), (0)::numeric)) - COALESCE(( SELECT sum(av.valor_restante) AS sum
           FROM public.vw_agenda_valores av
          WHERE ((av.usuario_id = u.id) AND ((av.tipo)::text = ANY ((ARRAY['conta_pagar'::character varying, 'parcela'::character varying, 'compromisso'::character varying])::text[])) AND ((av.status)::text = ANY ((ARRAY['pendente'::character varying, 'parcial'::character varying, 'atrasado'::character varying])::text[])))), (0)::numeric)) AS saldo_previsto
   FROM public.usuarios u;


ALTER VIEW public.vw_saldo_previsto_usuario OWNER TO postgres;

--
-- TOC entry 5481 (class 0 OID 16601)
-- Dependencies: 226
-- Data for Name: agenda_financeira; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agenda_financeira (id, usuario_id, conta_id, categoria_id, tipo, descricao, valor_previsto, data_prevista, status, observacao, criado_em, atualizado_em, compromisso_id) FROM stdin;
c750c890-c669-4a1c-9552-31bc556baece	45bdf0a4-96e6-41c0-b868-71df293f00c5	2189bec9-1e5a-4bb9-9c23-c97344541039	560720b9-036a-4e6d-bfbd-42a62311c327	conta_pagar	Aluguel	850.00	2026-06-10	pendente	Conta a pagar de exemplo.	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885	\N
889a0507-2227-42de-88ee-e037461dd44e	45bdf0a4-96e6-41c0-b868-71df293f00c5	2189bec9-1e5a-4bb9-9c23-c97344541039	03bfffe7-b08b-41bd-b924-af98ec07afae	conta_receber	Recebimento do serviço de logo	500.00	2026-06-08	recebido	Conta a receber de exemplo.	2026-06-05 17:39:33.293885	2026-06-05 17:47:20.101739	\N
d61e7a08-e651-4b11-8a3f-b79fe627cdc0	45bdf0a4-96e6-41c0-b868-71df293f00c5	2189bec9-1e5a-4bb9-9c23-c97344541039	ce55159f-ba65-46fe-926c-0dcc5f4a5ec5	conta_pagar	Conta teste cancelamento	50.00	2026-06-15	cancelado	Teste de cancelamento da agenda.	2026-06-05 17:50:21.203669	2026-06-05 17:50:32.771536	\N
ed25ded1-8513-489c-aabb-117c70aac03b	45bdf0a4-96e6-41c0-b868-71df293f00c5	2189bec9-1e5a-4bb9-9c23-c97344541039	ce55159f-ba65-46fe-926c-0dcc5f4a5ec5	conta_pagar	Conta vencida teste	75.00	2026-06-02	atrasado	Agenda criada para testar atraso.	2026-06-05 17:53:13.72165	2026-06-05 17:53:25.425492	\N
\.


--
-- TOC entry 5494 (class 0 OID 17015)
-- Dependencies: 239
-- Data for Name: avisos_financeiros; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.avisos_financeiros (id, usuario_id, agenda_id, tipo, titulo, mensagem, nivel, lido, resolvido, criado_em, atualizado_em) FROM stdin;
c2eeb490-4729-4008-a46e-225ef6c4c03a	45bdf0a4-96e6-41c0-b868-71df293f00c5	ed25ded1-8513-489c-aabb-117c70aac03b	conta_atrasada	Conta atrasada	A agenda "Conta vencida teste" venceu em 02/06/2026 e ainda está pendente.	atencao	f	f	2026-06-05 17:53:25.425492	2026-06-05 17:55:23.308001
\.


--
-- TOC entry 5491 (class 0 OID 16886)
-- Dependencies: 236
-- Data for Name: caixinhas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.caixinhas (id, usuario_id, conta_id, nome, objetivo, valor_separado, meta_valor, ativa, criado_em, atualizado_em) FROM stdin;
294d9e9c-8e0c-4dc6-b92e-629b2b3dfa1c	45bdf0a4-96e6-41c0-b868-71df293f00c5	2189bec9-1e5a-4bb9-9c23-c97344541039	Reserva de emergência	Dinheiro separado para imprevistos.	300.00	1000.00	t	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
\.


--
-- TOC entry 5478 (class 0 OID 16501)
-- Dependencies: 223
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categorias (id, usuario_id, nome, tipo, cor, padrao, ativa, criado_em, atualizado_em) FROM stdin;
560720b9-036a-4e6d-bfbd-42a62311c327	45bdf0a4-96e6-41c0-b868-71df293f00c5	Moradia	saida	#D64545	t	t	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
03bfffe7-b08b-41bd-b924-af98ec07afae	45bdf0a4-96e6-41c0-b868-71df293f00c5	Serviço prestado	entrada	#3FA600	t	t	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
ce55159f-ba65-46fe-926c-0dcc5f4a5ec5	45bdf0a4-96e6-41c0-b868-71df293f00c5	Alimentação	saida	#D9A400	t	t	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
c389be08-1834-4acf-88fa-79a77c6b6f60	45bdf0a4-96e6-41c0-b868-71df293f00c5	Salário	entrada	#2E9E44	t	t	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
96b49d9e-9bbb-4695-ad0c-dfa24e076a82	45bdf0a4-96e6-41c0-b868-71df293f00c5	Transporte	saida	#2F80ED	t	t	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
77e8f495-cc5e-4426-9cfc-42a72ad5d578	45bdf0a4-96e6-41c0-b868-71df293f00c5	Assinaturas	saida	#8E44AD	t	t	2026-06-05 18:21:30.668621	2026-06-05 18:21:30.668621
88571c59-34e4-46d4-a96e-775aa1405053	45bdf0a4-96e6-41c0-b868-71df293f00c5	Saúde	saida	#16A085	t	t	2026-06-05 18:21:30.668621	2026-06-05 18:21:30.668621
\.


--
-- TOC entry 5488 (class 0 OID 16814)
-- Dependencies: 233
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clientes (id, usuario_id, nome, contato, documento, observacao, ativo, criado_em, atualizado_em) FROM stdin;
fd12d67b-3b84-4955-9d0a-714742571d68	45bdf0a4-96e6-41c0-b868-71df293f00c5	Cliente João	joao@email.com	\N	Cliente de exemplo para serviço autônomo.	t	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
\.


--
-- TOC entry 5492 (class 0 OID 16917)
-- Dependencies: 237
-- Data for Name: compromissos_financeiros; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.compromissos_financeiros (id, usuario_id, conta_id, categoria_id, nome, tipo, valor_parcela, quantidade_total_parcelas, parcelas_pagas, dia_vencimento, status, observacao, criado_em, atualizado_em) FROM stdin;
534d87e5-f25a-4892-8422-330a2c3d3001	45bdf0a4-96e6-41c0-b868-71df293f00c5	2189bec9-1e5a-4bb9-9c23-c97344541039	560720b9-036a-4e6d-bfbd-42a62311c327	Celular parcelado	divida_parcelada	150.00	10	2	15	ativo	Compromisso financeiro de exemplo.	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
\.


--
-- TOC entry 5476 (class 0 OID 16451)
-- Dependencies: 221
-- Data for Name: configuracoes_usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.configuracoes_usuario (id, usuario_id, tema, cor_principal, cor_destaque, mostrar_dicas, receber_alertas, criado_em, atualizado_em) FROM stdin;
b9c24801-110c-417a-9482-666ead08f0d8	45bdf0a4-96e6-41c0-b868-71df293f00c5	padrao	\N	\N	t	t	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
\.


--
-- TOC entry 5477 (class 0 OID 16477)
-- Dependencies: 222
-- Data for Name: contas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contas (id, usuario_id, nome, tipo_conta, saldo_inicial, ativa, criado_em, atualizado_em) FROM stdin;
2189bec9-1e5a-4bb9-9c23-c97344541039	45bdf0a4-96e6-41c0-b868-71df293f00c5	Conta Principal	conta_corrente	1200.00	t	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
dde5e4ef-02cd-4089-be26-1a24d29e2d74	45bdf0a4-96e6-41c0-b868-71df293f00c5	Dinheiro físico	dinheiro_fisico	150.00	t	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
\.


--
-- TOC entry 5483 (class 0 OID 16663)
-- Dependencies: 228
-- Data for Name: contas_pagar; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contas_pagar (id, agenda_id, usuario_id, fornecedor_nome, forma_pagamento, criado_em, atualizado_em, fornecedor_id) FROM stdin;
ef69e3d1-bc00-456d-b66f-7866757b2e04	c750c890-c669-4a1c-9552-31bc556baece	45bdf0a4-96e6-41c0-b868-71df293f00c5	Internet Fibra X	Pix	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885	1cabbe19-c896-436f-8b9a-8dfbe8d76aef
\.


--
-- TOC entry 5484 (class 0 OID 16688)
-- Dependencies: 229
-- Data for Name: contas_receber; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contas_receber (id, agenda_id, usuario_id, cliente_nome, forma_recebimento, criado_em, atualizado_em, cliente_id) FROM stdin;
c8095de3-d995-437a-85e0-a1bf3af7e1a5	889a0507-2227-42de-88ee-e037461dd44e	45bdf0a4-96e6-41c0-b868-71df293f00c5	Cliente João	Pix	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885	fd12d67b-3b84-4955-9d0a-714742571d68
\.


--
-- TOC entry 5489 (class 0 OID 16836)
-- Dependencies: 234
-- Data for Name: fornecedores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fornecedores (id, usuario_id, nome, contato, documento, observacao, ativo, criado_em, atualizado_em) FROM stdin;
1cabbe19-c896-436f-8b9a-8dfbe8d76aef	45bdf0a4-96e6-41c0-b868-71df293f00c5	Internet Fibra X	suporte@fibrax.com	\N	Fornecedor de internet mensal.	t	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
\.


--
-- TOC entry 5495 (class 0 OID 17050)
-- Dependencies: 240
-- Data for Name: logs_basicos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.logs_basicos (id, usuario_id, acao, entidade, entidade_id, detalhes, criado_em) FROM stdin;
\.


--
-- TOC entry 5479 (class 0 OID 16525)
-- Dependencies: 224
-- Data for Name: movimentacoes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.movimentacoes (id, usuario_id, conta_id, categoria_id, tipo, descricao, valor, data_movimentacao, origem, observacao, criado_em, atualizado_em) FROM stdin;
1aa01521-4c8a-4c5d-95e8-29a8fb59742c	45bdf0a4-96e6-41c0-b868-71df293f00c5	2189bec9-1e5a-4bb9-9c23-c97344541039	ce55159f-ba65-46fe-926c-0dcc5f4a5ec5	saida	Mercado	120.50	2026-06-05	manual	Saída real de exemplo.	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
fccbe18f-b358-4ad1-8456-9327945bc812	45bdf0a4-96e6-41c0-b868-71df293f00c5	2189bec9-1e5a-4bb9-9c23-c97344541039	c389be08-1834-4acf-88fa-79a77c6b6f60	entrada	Salário recebido	1800.00	2026-06-05	manual	Entrada real de exemplo.	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
e43bdbac-f799-45a0-905e-9c1251f79f02	45bdf0a4-96e6-41c0-b868-71df293f00c5	2189bec9-1e5a-4bb9-9c23-c97344541039	03bfffe7-b08b-41bd-b924-af98ec07afae	entrada	Recebimento do serviço de logo	500.00	2026-06-05	conta_receber	Conta a receber de exemplo.	2026-06-05 17:47:20.101739	2026-06-05 17:47:20.101739
\.


--
-- TOC entry 5486 (class 0 OID 16751)
-- Dependencies: 231
-- Data for Name: parcelamentos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parcelamentos (id, usuario_id, conta_id, categoria_id, descricao, valor_total, quantidade_parcelas, data_primeira_parcela, criado_em, atualizado_em) FROM stdin;
\.


--
-- TOC entry 5487 (class 0 OID 16784)
-- Dependencies: 232
-- Data for Name: parcelas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parcelas (id, parcelamento_id, agenda_id, numero_parcela, valor_parcela, vencimento, criado_em, atualizado_em) FROM stdin;
\.


--
-- TOC entry 5482 (class 0 OID 16639)
-- Dependencies: 227
-- Data for Name: realizacoes_agenda; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.realizacoes_agenda (id, agenda_id, movimentacao_id, valor_realizado, data_realizacao, criado_em) FROM stdin;
b3047c2d-0b43-4084-87d4-8f0a75837bd9	889a0507-2227-42de-88ee-e037461dd44e	e43bdbac-f799-45a0-905e-9c1251f79f02	500.00	2026-06-05	2026-06-05 17:47:20.101739
\.


--
-- TOC entry 5485 (class 0 OID 16713)
-- Dependencies: 230
-- Data for Name: recorrencias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recorrencias (id, usuario_id, conta_id, categoria_id, tipo, descricao, valor, frequencia, dia_referencia, data_inicio, data_fim, ativa, criado_em, atualizado_em) FROM stdin;
fe72befa-7e5c-41a9-b41b-3bb874903222	45bdf0a4-96e6-41c0-b868-71df293f00c5	2189bec9-1e5a-4bb9-9c23-c97344541039	560720b9-036a-4e6d-bfbd-42a62311c327	conta_pagar	Internet mensal	120.00	mensal	10	2026-06-05	\N	t	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
\.


--
-- TOC entry 5493 (class 0 OID 16975)
-- Dependencies: 238
-- Data for Name: registros_internos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.registros_internos (id, usuario_id, movimentacao_id, agenda_id, cliente_id, fornecedor_id, tipo, titulo, descricao, criado_em) FROM stdin;
cedb9b14-dc2f-4211-ab7c-bd604f2f5e88	45bdf0a4-96e6-41c0-b868-71df293f00c5	e43bdbac-f799-45a0-905e-9c1251f79f02	889a0507-2227-42de-88ee-e037461dd44e	\N	\N	recebimento	Agenda realizada	Uma agenda financeira foi transformada em movimentação real.	2026-06-05 17:47:20.101739
f4722083-0c9b-46e1-974d-982010ff59e7	45bdf0a4-96e6-41c0-b868-71df293f00c5	\N	d61e7a08-e651-4b11-8a3f-b79fe627cdc0	\N	\N	ajuste	Agenda cancelada	Teste de cancelamento da agenda.	2026-06-05 17:50:32.771536
1b15497f-83b8-4829-84ba-95031c8e4ab0	45bdf0a4-96e6-41c0-b868-71df293f00c5	\N	\N	\N	\N	transferencia	Transferência registrada	Uma transferência entre contas foi registrada sem virar receita ou despesa.	2026-06-05 17:51:41.396712
\.


--
-- TOC entry 5496 (class 0 OID 24601)
-- Dependencies: 249
-- Data for Name: regras_categorizacao; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.regras_categorizacao (id, usuario_id, categoria_id, tipo, palavra_chave, peso, ativa, criado_em, atualizado_em) FROM stdin;
332afffc-2490-400f-b2ab-53e500921056	45bdf0a4-96e6-41c0-b868-71df293f00c5	03bfffe7-b08b-41bd-b924-af98ec07afae	entrada	servico	90	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
a76b0f8c-bf7e-45ce-b783-6bfd6512983e	45bdf0a4-96e6-41c0-b868-71df293f00c5	03bfffe7-b08b-41bd-b924-af98ec07afae	entrada	serviço	90	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
b9d548ca-10e0-4ba7-ac5e-ab633263c124	45bdf0a4-96e6-41c0-b868-71df293f00c5	03bfffe7-b08b-41bd-b924-af98ec07afae	entrada	cliente	85	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
bfd0ca9b-d59f-4b7c-a619-21588cf0ec84	45bdf0a4-96e6-41c0-b868-71df293f00c5	ce55159f-ba65-46fe-926c-0dcc5f4a5ec5	saida	ifood	85	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
6ecc159c-89d7-46ed-9378-68e887c851e1	45bdf0a4-96e6-41c0-b868-71df293f00c5	ce55159f-ba65-46fe-926c-0dcc5f4a5ec5	saida	supermercado	95	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
90c05740-cf4b-4686-ab4b-892832233451	45bdf0a4-96e6-41c0-b868-71df293f00c5	ce55159f-ba65-46fe-926c-0dcc5f4a5ec5	saida	mercado	95	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
3f97c3ad-3397-46e0-a74c-05e44524a1fa	45bdf0a4-96e6-41c0-b868-71df293f00c5	c389be08-1834-4acf-88fa-79a77c6b6f60	entrada	salário	95	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
37219fbf-689d-4657-ae84-144834760d46	45bdf0a4-96e6-41c0-b868-71df293f00c5	c389be08-1834-4acf-88fa-79a77c6b6f60	entrada	salario	95	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
1d28e210-74b0-4238-ba5d-d10cdb6a3dbc	45bdf0a4-96e6-41c0-b868-71df293f00c5	96b49d9e-9bbb-4695-ad0c-dfa24e076a82	saida	99	90	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
de76117b-f29b-4c20-b187-0c0a5707da35	45bdf0a4-96e6-41c0-b868-71df293f00c5	96b49d9e-9bbb-4695-ad0c-dfa24e076a82	saida	uber	95	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
71a8a9f2-c42c-4012-9d4b-5976ff247296	45bdf0a4-96e6-41c0-b868-71df293f00c5	77e8f495-cc5e-4426-9cfc-42a72ad5d578	saida	spotify	95	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
5773a947-9124-41de-b280-e9bd93ea1795	45bdf0a4-96e6-41c0-b868-71df293f00c5	77e8f495-cc5e-4426-9cfc-42a72ad5d578	saida	netflix	95	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
b499ed43-75df-4de2-b34a-fcb8f1d08c7d	45bdf0a4-96e6-41c0-b868-71df293f00c5	88571c59-34e4-46d4-a96e-775aa1405053	saida	farmácia	90	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
6e6f9807-7a18-4b96-845d-576851b4dc5f	45bdf0a4-96e6-41c0-b868-71df293f00c5	88571c59-34e4-46d4-a96e-775aa1405053	saida	farmacia	90	t	2026-06-05 18:21:38.332825	2026-06-05 18:21:38.332825
\.


--
-- TOC entry 5490 (class 0 OID 16858)
-- Dependencies: 235
-- Data for Name: servicos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.servicos (id, usuario_id, cliente_id, nome, descricao, valor_padrao, ativo, criado_em, atualizado_em) FROM stdin;
a44dae3c-c865-4f77-af90-6d4b09c3b114	45bdf0a4-96e6-41c0-b868-71df293f00c5	fd12d67b-3b84-4955-9d0a-714742571d68	Arte para logo	Serviço de criação visual para cliente.	500.00	t	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
\.


--
-- TOC entry 5497 (class 0 OID 24651)
-- Dependencies: 252
-- Data for Name: tokens_recuperacao_senha; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tokens_recuperacao_senha (id, usuario_id, token_hash, expira_em, usado, criado_em, usado_em) FROM stdin;
df388850-d470-410b-8754-d0dfa953843a	45bdf0a4-96e6-41c0-b868-71df293f00c5	74d0c03b5066ee0ec898e8b7f57156040e44ffb6b23486ab9c3a6b8de29795b5	2026-06-05 19:54:15.759047	f	2026-06-05 18:54:15.759047	\N
\.


--
-- TOC entry 5480 (class 0 OID 16564)
-- Dependencies: 225
-- Data for Name: transferencias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transferencias (id, usuario_id, conta_origem_id, conta_destino_id, valor, data_transferencia, descricao, observacao, criado_em, atualizado_em) FROM stdin;
de8d1057-3ea5-4324-92ae-acebf85ca4cf	45bdf0a4-96e6-41c0-b868-71df293f00c5	2189bec9-1e5a-4bb9-9c23-c97344541039	dde5e4ef-02cd-4089-be26-1a24d29e2d74	50.00	2026-06-05	Teste de transferência	Transferência de teste entre contas.	2026-06-05 17:51:41.396712	2026-06-05 17:51:41.396712
\.


--
-- TOC entry 5475 (class 0 OID 16427)
-- Dependencies: 220
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, nome, email, senha_hash, tipo_uso, documento_tipo, documento_numero, perfil_detalhado, nivel_interface, criado_em, atualizado_em) FROM stdin;
45bdf0a4-96e6-41c0-b868-71df293f00c5	Usuário Demo Gerencia	demo@gerencia.com	$2a$06$jpEQc8xwIDnGaHb8iKmp.O9HQWJuCzJBOwK3myYjUxKmAdUeQ4LXa	autonomo	CPF	12345678900	freelancer	simples	2026-06-05 17:39:33.293885	2026-06-05 17:39:33.293885
\.


--
-- TOC entry 5498 (class 0 OID 24677)
-- Dependencies: 253
-- Data for Name: versoes_banco; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.versoes_banco (id, versao, nome, descricao, criado_em) FROM stdin;
1e5b45cc-188e-4614-94bd-c9b2cfe5acb8	1.0	Banco oficial inicial do Gerencia!	Estrutura inicial com usuários, perfis, contas, categorias, movimentações reais, agenda financeira, contas a pagar e receber, clientes, fornecedores, serviços, caixinhas, compromissos financeiros, relatórios, assistente por regras, avisos financeiros e recuperação de senha.	2026-06-05 18:56:31.604417
\.


--
-- TOC entry 5186 (class 2606 OID 16623)
-- Name: agenda_financeira agenda_financeira_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agenda_financeira
    ADD CONSTRAINT agenda_financeira_pkey PRIMARY KEY (id);


--
-- TOC entry 5229 (class 2606 OID 17039)
-- Name: avisos_financeiros avisos_financeiros_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avisos_financeiros
    ADD CONSTRAINT avisos_financeiros_pkey PRIMARY KEY (id);


--
-- TOC entry 5220 (class 2606 OID 16906)
-- Name: caixinhas caixinhas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caixinhas
    ADD CONSTRAINT caixinhas_pkey PRIMARY KEY (id);


--
-- TOC entry 5176 (class 2606 OID 16519)
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- TOC entry 5211 (class 2606 OID 16830)
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- TOC entry 5223 (class 2606 OID 16943)
-- Name: compromissos_financeiros compromissos_financeiros_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compromissos_financeiros
    ADD CONSTRAINT compromissos_financeiros_pkey PRIMARY KEY (id);


--
-- TOC entry 5169 (class 2606 OID 16469)
-- Name: configuracoes_usuario configuracoes_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracoes_usuario
    ADD CONSTRAINT configuracoes_usuario_pkey PRIMARY KEY (id);


--
-- TOC entry 5171 (class 2606 OID 16471)
-- Name: configuracoes_usuario configuracoes_usuario_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracoes_usuario
    ADD CONSTRAINT configuracoes_usuario_usuario_id_key UNIQUE (usuario_id);


--
-- TOC entry 5193 (class 2606 OID 16677)
-- Name: contas_pagar contas_pagar_agenda_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_pagar
    ADD CONSTRAINT contas_pagar_agenda_id_key UNIQUE (agenda_id);


--
-- TOC entry 5195 (class 2606 OID 16675)
-- Name: contas_pagar contas_pagar_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_pagar
    ADD CONSTRAINT contas_pagar_pkey PRIMARY KEY (id);


--
-- TOC entry 5173 (class 2606 OID 16495)
-- Name: contas contas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas
    ADD CONSTRAINT contas_pkey PRIMARY KEY (id);


--
-- TOC entry 5198 (class 2606 OID 16702)
-- Name: contas_receber contas_receber_agenda_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_receber
    ADD CONSTRAINT contas_receber_agenda_id_key UNIQUE (agenda_id);


--
-- TOC entry 5200 (class 2606 OID 16700)
-- Name: contas_receber contas_receber_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_receber
    ADD CONSTRAINT contas_receber_pkey PRIMARY KEY (id);


--
-- TOC entry 5214 (class 2606 OID 16852)
-- Name: fornecedores fornecedores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fornecedores
    ADD CONSTRAINT fornecedores_pkey PRIMARY KEY (id);


--
-- TOC entry 5233 (class 2606 OID 17061)
-- Name: logs_basicos logs_basicos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs_basicos
    ADD CONSTRAINT logs_basicos_pkey PRIMARY KEY (id);


--
-- TOC entry 5181 (class 2606 OID 16548)
-- Name: movimentacoes movimentacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimentacoes
    ADD CONSTRAINT movimentacoes_pkey PRIMARY KEY (id);


--
-- TOC entry 5205 (class 2606 OID 16768)
-- Name: parcelamentos parcelamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcelamentos
    ADD CONSTRAINT parcelamentos_pkey PRIMARY KEY (id);


--
-- TOC entry 5207 (class 2606 OID 16803)
-- Name: parcelas parcelas_agenda_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcelas
    ADD CONSTRAINT parcelas_agenda_id_key UNIQUE (agenda_id);


--
-- TOC entry 5209 (class 2606 OID 16801)
-- Name: parcelas parcelas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcelas
    ADD CONSTRAINT parcelas_pkey PRIMARY KEY (id);


--
-- TOC entry 5191 (class 2606 OID 16652)
-- Name: realizacoes_agenda realizacoes_agenda_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.realizacoes_agenda
    ADD CONSTRAINT realizacoes_agenda_pkey PRIMARY KEY (id);


--
-- TOC entry 5203 (class 2606 OID 16735)
-- Name: recorrencias recorrencias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recorrencias
    ADD CONSTRAINT recorrencias_pkey PRIMARY KEY (id);


--
-- TOC entry 5227 (class 2606 OID 16989)
-- Name: registros_internos registros_internos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_internos
    ADD CONSTRAINT registros_internos_pkey PRIMARY KEY (id);


--
-- TOC entry 5237 (class 2606 OID 24621)
-- Name: regras_categorizacao regras_categorizacao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regras_categorizacao
    ADD CONSTRAINT regras_categorizacao_pkey PRIMARY KEY (id);


--
-- TOC entry 5239 (class 2606 OID 24623)
-- Name: regras_categorizacao regras_categorizacao_usuario_id_tipo_palavra_chave_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regras_categorizacao
    ADD CONSTRAINT regras_categorizacao_usuario_id_tipo_palavra_chave_key UNIQUE (usuario_id, tipo, palavra_chave);


--
-- TOC entry 5218 (class 2606 OID 16875)
-- Name: servicos servicos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_pkey PRIMARY KEY (id);


--
-- TOC entry 5243 (class 2606 OID 24666)
-- Name: tokens_recuperacao_senha tokens_recuperacao_senha_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tokens_recuperacao_senha
    ADD CONSTRAINT tokens_recuperacao_senha_pkey PRIMARY KEY (id);


--
-- TOC entry 5245 (class 2606 OID 24668)
-- Name: tokens_recuperacao_senha tokens_recuperacao_senha_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tokens_recuperacao_senha
    ADD CONSTRAINT tokens_recuperacao_senha_token_hash_key UNIQUE (token_hash);


--
-- TOC entry 5184 (class 2606 OID 16585)
-- Name: transferencias transferencias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_pkey PRIMARY KEY (id);


--
-- TOC entry 5165 (class 2606 OID 16448)
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- TOC entry 5167 (class 2606 OID 16446)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- TOC entry 5247 (class 2606 OID 24689)
-- Name: versoes_banco versoes_banco_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.versoes_banco
    ADD CONSTRAINT versoes_banco_pkey PRIMARY KEY (id);


--
-- TOC entry 5249 (class 2606 OID 24691)
-- Name: versoes_banco versoes_banco_versao_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.versoes_banco
    ADD CONSTRAINT versoes_banco_versao_key UNIQUE (versao);


--
-- TOC entry 5187 (class 1259 OID 17092)
-- Name: idx_agenda_usuario_data; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agenda_usuario_data ON public.agenda_financeira USING btree (usuario_id, data_prevista);


--
-- TOC entry 5188 (class 1259 OID 17093)
-- Name: idx_agenda_usuario_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agenda_usuario_status ON public.agenda_financeira USING btree (usuario_id, status);


--
-- TOC entry 5189 (class 1259 OID 17094)
-- Name: idx_agenda_usuario_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agenda_usuario_tipo ON public.agenda_financeira USING btree (usuario_id, tipo);


--
-- TOC entry 5230 (class 1259 OID 17102)
-- Name: idx_avisos_usuario_lido; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_avisos_usuario_lido ON public.avisos_financeiros USING btree (usuario_id, lido);


--
-- TOC entry 5221 (class 1259 OID 17100)
-- Name: idx_caixinhas_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_caixinhas_usuario ON public.caixinhas USING btree (usuario_id);


--
-- TOC entry 5177 (class 1259 OID 17088)
-- Name: idx_categorias_usuario_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categorias_usuario_tipo ON public.categorias USING btree (usuario_id, tipo);


--
-- TOC entry 5212 (class 1259 OID 17097)
-- Name: idx_clientes_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_usuario ON public.clientes USING btree (usuario_id);


--
-- TOC entry 5224 (class 1259 OID 17101)
-- Name: idx_compromissos_usuario_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_compromissos_usuario_status ON public.compromissos_financeiros USING btree (usuario_id, status);


--
-- TOC entry 5196 (class 1259 OID 17095)
-- Name: idx_contas_pagar_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contas_pagar_usuario ON public.contas_pagar USING btree (usuario_id);


--
-- TOC entry 5201 (class 1259 OID 17096)
-- Name: idx_contas_receber_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contas_receber_usuario ON public.contas_receber USING btree (usuario_id);


--
-- TOC entry 5174 (class 1259 OID 17087)
-- Name: idx_contas_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contas_usuario ON public.contas USING btree (usuario_id);


--
-- TOC entry 5215 (class 1259 OID 17098)
-- Name: idx_fornecedores_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fornecedores_usuario ON public.fornecedores USING btree (usuario_id);


--
-- TOC entry 5231 (class 1259 OID 17104)
-- Name: idx_logs_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_usuario ON public.logs_basicos USING btree (usuario_id);


--
-- TOC entry 5178 (class 1259 OID 17089)
-- Name: idx_movimentacoes_usuario_data; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimentacoes_usuario_data ON public.movimentacoes USING btree (usuario_id, data_movimentacao);


--
-- TOC entry 5179 (class 1259 OID 17090)
-- Name: idx_movimentacoes_usuario_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimentacoes_usuario_tipo ON public.movimentacoes USING btree (usuario_id, tipo);


--
-- TOC entry 5225 (class 1259 OID 17103)
-- Name: idx_registros_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registros_usuario ON public.registros_internos USING btree (usuario_id);


--
-- TOC entry 5234 (class 1259 OID 24636)
-- Name: idx_regras_categorizacao_palavra; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_regras_categorizacao_palavra ON public.regras_categorizacao USING btree (palavra_chave);


--
-- TOC entry 5235 (class 1259 OID 24635)
-- Name: idx_regras_categorizacao_usuario_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_regras_categorizacao_usuario_tipo ON public.regras_categorizacao USING btree (usuario_id, tipo);


--
-- TOC entry 5216 (class 1259 OID 17099)
-- Name: idx_servicos_usuario_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_servicos_usuario_cliente ON public.servicos USING btree (usuario_id, cliente_id);


--
-- TOC entry 5240 (class 1259 OID 24675)
-- Name: idx_tokens_recuperacao_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tokens_recuperacao_token_hash ON public.tokens_recuperacao_senha USING btree (token_hash);


--
-- TOC entry 5241 (class 1259 OID 24674)
-- Name: idx_tokens_recuperacao_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tokens_recuperacao_usuario ON public.tokens_recuperacao_senha USING btree (usuario_id);


--
-- TOC entry 5182 (class 1259 OID 17091)
-- Name: idx_transferencias_usuario_data; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transferencias_usuario_data ON public.transferencias USING btree (usuario_id, data_transferencia);


--
-- TOC entry 5163 (class 1259 OID 17086)
-- Name: idx_usuarios_email_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_usuarios_email_lower ON public.usuarios USING btree (lower((email)::text));


--
-- TOC entry 5305 (class 2620 OID 17074)
-- Name: agenda_financeira trg_agenda_financeira_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_agenda_financeira_atualizado_em BEFORE UPDATE ON public.agenda_financeira FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5316 (class 2620 OID 17085)
-- Name: avisos_financeiros trg_avisos_financeiros_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_avisos_financeiros_atualizado_em BEFORE UPDATE ON public.avisos_financeiros FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5314 (class 2620 OID 17083)
-- Name: caixinhas trg_caixinhas_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_caixinhas_atualizado_em BEFORE UPDATE ON public.caixinhas FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5302 (class 2620 OID 17071)
-- Name: categorias trg_categorias_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_categorias_atualizado_em BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5311 (class 2620 OID 17080)
-- Name: clientes trg_clientes_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_clientes_atualizado_em BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5315 (class 2620 OID 17084)
-- Name: compromissos_financeiros trg_compromissos_financeiros_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_compromissos_financeiros_atualizado_em BEFORE UPDATE ON public.compromissos_financeiros FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5300 (class 2620 OID 17069)
-- Name: configuracoes_usuario trg_configuracoes_usuario_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_configuracoes_usuario_atualizado_em BEFORE UPDATE ON public.configuracoes_usuario FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5301 (class 2620 OID 17070)
-- Name: contas trg_contas_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_contas_atualizado_em BEFORE UPDATE ON public.contas FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5306 (class 2620 OID 17075)
-- Name: contas_pagar trg_contas_pagar_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_contas_pagar_atualizado_em BEFORE UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5307 (class 2620 OID 17076)
-- Name: contas_receber trg_contas_receber_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_contas_receber_atualizado_em BEFORE UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5312 (class 2620 OID 17081)
-- Name: fornecedores trg_fornecedores_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_fornecedores_atualizado_em BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5303 (class 2620 OID 17072)
-- Name: movimentacoes trg_movimentacoes_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_movimentacoes_atualizado_em BEFORE UPDATE ON public.movimentacoes FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5309 (class 2620 OID 17078)
-- Name: parcelamentos trg_parcelamentos_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_parcelamentos_atualizado_em BEFORE UPDATE ON public.parcelamentos FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5310 (class 2620 OID 17079)
-- Name: parcelas trg_parcelas_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_parcelas_atualizado_em BEFORE UPDATE ON public.parcelas FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5308 (class 2620 OID 17077)
-- Name: recorrencias trg_recorrencias_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_recorrencias_atualizado_em BEFORE UPDATE ON public.recorrencias FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5317 (class 2620 OID 24634)
-- Name: regras_categorizacao trg_regras_categorizacao_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_regras_categorizacao_atualizado_em BEFORE UPDATE ON public.regras_categorizacao FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5313 (class 2620 OID 17082)
-- Name: servicos trg_servicos_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_servicos_atualizado_em BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5304 (class 2620 OID 17073)
-- Name: transferencias trg_transferencias_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_transferencias_atualizado_em BEFORE UPDATE ON public.transferencias FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5299 (class 2620 OID 17068)
-- Name: usuarios trg_usuarios_atualizado_em; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_usuarios_atualizado_em BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.atualizar_campo_atualizado_em();


--
-- TOC entry 5259 (class 2606 OID 16634)
-- Name: agenda_financeira agenda_financeira_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agenda_financeira
    ADD CONSTRAINT agenda_financeira_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;


--
-- TOC entry 5260 (class 2606 OID 16969)
-- Name: agenda_financeira agenda_financeira_compromisso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agenda_financeira
    ADD CONSTRAINT agenda_financeira_compromisso_id_fkey FOREIGN KEY (compromisso_id) REFERENCES public.compromissos_financeiros(id) ON DELETE SET NULL;


--
-- TOC entry 5261 (class 2606 OID 16629)
-- Name: agenda_financeira agenda_financeira_conta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agenda_financeira
    ADD CONSTRAINT agenda_financeira_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES public.contas(id) ON DELETE SET NULL;


--
-- TOC entry 5262 (class 2606 OID 16624)
-- Name: agenda_financeira agenda_financeira_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agenda_financeira
    ADD CONSTRAINT agenda_financeira_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5293 (class 2606 OID 17045)
-- Name: avisos_financeiros avisos_financeiros_agenda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avisos_financeiros
    ADD CONSTRAINT avisos_financeiros_agenda_id_fkey FOREIGN KEY (agenda_id) REFERENCES public.agenda_financeira(id) ON DELETE SET NULL;


--
-- TOC entry 5294 (class 2606 OID 17040)
-- Name: avisos_financeiros avisos_financeiros_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avisos_financeiros
    ADD CONSTRAINT avisos_financeiros_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5283 (class 2606 OID 16912)
-- Name: caixinhas caixinhas_conta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caixinhas
    ADD CONSTRAINT caixinhas_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES public.contas(id) ON DELETE SET NULL;


--
-- TOC entry 5284 (class 2606 OID 16907)
-- Name: caixinhas caixinhas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caixinhas
    ADD CONSTRAINT caixinhas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5252 (class 2606 OID 16520)
-- Name: categorias categorias_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5279 (class 2606 OID 16831)
-- Name: clientes clientes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5285 (class 2606 OID 16954)
-- Name: compromissos_financeiros compromissos_financeiros_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compromissos_financeiros
    ADD CONSTRAINT compromissos_financeiros_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;


--
-- TOC entry 5286 (class 2606 OID 16949)
-- Name: compromissos_financeiros compromissos_financeiros_conta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compromissos_financeiros
    ADD CONSTRAINT compromissos_financeiros_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES public.contas(id) ON DELETE SET NULL;


--
-- TOC entry 5287 (class 2606 OID 16944)
-- Name: compromissos_financeiros compromissos_financeiros_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compromissos_financeiros
    ADD CONSTRAINT compromissos_financeiros_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5250 (class 2606 OID 16472)
-- Name: configuracoes_usuario configuracoes_usuario_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracoes_usuario
    ADD CONSTRAINT configuracoes_usuario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5265 (class 2606 OID 16678)
-- Name: contas_pagar contas_pagar_agenda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_pagar
    ADD CONSTRAINT contas_pagar_agenda_id_fkey FOREIGN KEY (agenda_id) REFERENCES public.agenda_financeira(id) ON DELETE CASCADE;


--
-- TOC entry 5266 (class 2606 OID 16964)
-- Name: contas_pagar contas_pagar_fornecedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_pagar
    ADD CONSTRAINT contas_pagar_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;


--
-- TOC entry 5267 (class 2606 OID 16683)
-- Name: contas_pagar contas_pagar_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_pagar
    ADD CONSTRAINT contas_pagar_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5268 (class 2606 OID 16703)
-- Name: contas_receber contas_receber_agenda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_receber
    ADD CONSTRAINT contas_receber_agenda_id_fkey FOREIGN KEY (agenda_id) REFERENCES public.agenda_financeira(id) ON DELETE CASCADE;


--
-- TOC entry 5269 (class 2606 OID 16959)
-- Name: contas_receber contas_receber_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_receber
    ADD CONSTRAINT contas_receber_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;


--
-- TOC entry 5270 (class 2606 OID 16708)
-- Name: contas_receber contas_receber_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas_receber
    ADD CONSTRAINT contas_receber_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5251 (class 2606 OID 16496)
-- Name: contas contas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contas
    ADD CONSTRAINT contas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5280 (class 2606 OID 16853)
-- Name: fornecedores fornecedores_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fornecedores
    ADD CONSTRAINT fornecedores_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5295 (class 2606 OID 17062)
-- Name: logs_basicos logs_basicos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs_basicos
    ADD CONSTRAINT logs_basicos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- TOC entry 5253 (class 2606 OID 16559)
-- Name: movimentacoes movimentacoes_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimentacoes
    ADD CONSTRAINT movimentacoes_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;


--
-- TOC entry 5254 (class 2606 OID 16554)
-- Name: movimentacoes movimentacoes_conta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimentacoes
    ADD CONSTRAINT movimentacoes_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES public.contas(id) ON DELETE CASCADE;


--
-- TOC entry 5255 (class 2606 OID 16549)
-- Name: movimentacoes movimentacoes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimentacoes
    ADD CONSTRAINT movimentacoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5274 (class 2606 OID 16779)
-- Name: parcelamentos parcelamentos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcelamentos
    ADD CONSTRAINT parcelamentos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;


--
-- TOC entry 5275 (class 2606 OID 16774)
-- Name: parcelamentos parcelamentos_conta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcelamentos
    ADD CONSTRAINT parcelamentos_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES public.contas(id) ON DELETE SET NULL;


--
-- TOC entry 5276 (class 2606 OID 16769)
-- Name: parcelamentos parcelamentos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcelamentos
    ADD CONSTRAINT parcelamentos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5277 (class 2606 OID 16809)
-- Name: parcelas parcelas_agenda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcelas
    ADD CONSTRAINT parcelas_agenda_id_fkey FOREIGN KEY (agenda_id) REFERENCES public.agenda_financeira(id) ON DELETE CASCADE;


--
-- TOC entry 5278 (class 2606 OID 16804)
-- Name: parcelas parcelas_parcelamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcelas
    ADD CONSTRAINT parcelas_parcelamento_id_fkey FOREIGN KEY (parcelamento_id) REFERENCES public.parcelamentos(id) ON DELETE CASCADE;


--
-- TOC entry 5263 (class 2606 OID 16653)
-- Name: realizacoes_agenda realizacoes_agenda_agenda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.realizacoes_agenda
    ADD CONSTRAINT realizacoes_agenda_agenda_id_fkey FOREIGN KEY (agenda_id) REFERENCES public.agenda_financeira(id) ON DELETE CASCADE;


--
-- TOC entry 5264 (class 2606 OID 16658)
-- Name: realizacoes_agenda realizacoes_agenda_movimentacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.realizacoes_agenda
    ADD CONSTRAINT realizacoes_agenda_movimentacao_id_fkey FOREIGN KEY (movimentacao_id) REFERENCES public.movimentacoes(id) ON DELETE CASCADE;


--
-- TOC entry 5271 (class 2606 OID 16746)
-- Name: recorrencias recorrencias_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recorrencias
    ADD CONSTRAINT recorrencias_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;


--
-- TOC entry 5272 (class 2606 OID 16741)
-- Name: recorrencias recorrencias_conta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recorrencias
    ADD CONSTRAINT recorrencias_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES public.contas(id) ON DELETE SET NULL;


--
-- TOC entry 5273 (class 2606 OID 16736)
-- Name: recorrencias recorrencias_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recorrencias
    ADD CONSTRAINT recorrencias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5288 (class 2606 OID 17000)
-- Name: registros_internos registros_internos_agenda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_internos
    ADD CONSTRAINT registros_internos_agenda_id_fkey FOREIGN KEY (agenda_id) REFERENCES public.agenda_financeira(id) ON DELETE SET NULL;


--
-- TOC entry 5289 (class 2606 OID 17005)
-- Name: registros_internos registros_internos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_internos
    ADD CONSTRAINT registros_internos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;


--
-- TOC entry 5290 (class 2606 OID 17010)
-- Name: registros_internos registros_internos_fornecedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_internos
    ADD CONSTRAINT registros_internos_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;


--
-- TOC entry 5291 (class 2606 OID 16995)
-- Name: registros_internos registros_internos_movimentacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_internos
    ADD CONSTRAINT registros_internos_movimentacao_id_fkey FOREIGN KEY (movimentacao_id) REFERENCES public.movimentacoes(id) ON DELETE SET NULL;


--
-- TOC entry 5292 (class 2606 OID 16990)
-- Name: registros_internos registros_internos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_internos
    ADD CONSTRAINT registros_internos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5296 (class 2606 OID 24629)
-- Name: regras_categorizacao regras_categorizacao_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regras_categorizacao
    ADD CONSTRAINT regras_categorizacao_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE CASCADE;


--
-- TOC entry 5297 (class 2606 OID 24624)
-- Name: regras_categorizacao regras_categorizacao_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regras_categorizacao
    ADD CONSTRAINT regras_categorizacao_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5281 (class 2606 OID 16881)
-- Name: servicos servicos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;


--
-- TOC entry 5282 (class 2606 OID 16876)
-- Name: servicos servicos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5298 (class 2606 OID 24669)
-- Name: tokens_recuperacao_senha tokens_recuperacao_senha_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tokens_recuperacao_senha
    ADD CONSTRAINT tokens_recuperacao_senha_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5256 (class 2606 OID 16596)
-- Name: transferencias transferencias_conta_destino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_conta_destino_id_fkey FOREIGN KEY (conta_destino_id) REFERENCES public.contas(id) ON DELETE CASCADE;


--
-- TOC entry 5257 (class 2606 OID 16591)
-- Name: transferencias transferencias_conta_origem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_conta_origem_id_fkey FOREIGN KEY (conta_origem_id) REFERENCES public.contas(id) ON DELETE CASCADE;


--
-- TOC entry 5258 (class 2606 OID 16586)
-- Name: transferencias transferencias_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


-- Completed on 2026-06-05 19:03:56

--
-- PostgreSQL database dump complete
--

\unrestrict oDs4m9glzU0Azy8POLd0m0E8hfJVhcdYZxAdCLRrDmESHErmfqPEfzWZAJdflEM

