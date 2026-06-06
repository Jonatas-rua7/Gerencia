const { pool } = require('../db');

const FREQUENCIAS_VALIDAS = ['unica', 'semanal', 'quinzenal', 'mensal', 'variavel'];

function calcularDataPrevista(dia_recebimento) {
  const hoje = new Date();
  if (!dia_recebimento) {
    return hoje.toISOString().slice(0, 10);
  }

  const dia = Math.max(1, Math.min(31, Number(dia_recebimento)));
  const ano = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  const diasNoMesAtual = new Date(ano, mesAtual + 1, 0).getDate();
  const diaCorrigido = Math.min(dia, diasNoMesAtual);
  let data = new Date(ano, mesAtual, diaCorrigido);

  if (hoje.getDate() > diaCorrigido) {
    const proximoMes = mesAtual + 1;
    const diasNoProximoMes = new Date(ano, proximoMes + 1, 0).getDate();
    data = new Date(ano, proximoMes, Math.min(dia, diasNoProximoMes));
  }

  return data.toISOString().slice(0, 10);
}

function parseBoolean(value) {
  return value === true || value === 'true' || value === '1';
}

async function validarContaUsuario(conta_id, usuarioId) {
  if (!conta_id || conta_id === 'undefined' || conta_id === 'null') return true;
  const { rows } = await pool.query('SELECT id FROM contas WHERE id = $1 AND usuario_id = $2', [conta_id, usuarioId]);
  return Boolean(rows[0]);
}

async function listar(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM rendas_previstas WHERE usuario_id = $1 AND ativo = true ORDER BY criado_em DESC',
      [req.usuarioId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar rendas previstas.' });
  }
}

async function criar(req, res) {
  const {
    tipo_renda,
    descricao,
    valor_previsto,
    frequencia,
    dia_recebimento,
    conta_id,
    criar_na_agenda
  } = req.body;

  if (!tipo_renda || !valor_previsto || !frequencia) {
    return res.status(400).json({ erro: 'Preencha tipo de renda, valor previsto e frequência.' });
  }

  if (!FREQUENCIAS_VALIDAS.includes(frequencia)) {
    return res.status(400).json({ erro: 'Frequência inválida.' });
  }

  const valor = Number(valor_previsto);
  if (Number.isNaN(valor) || valor <= 0) {
    return res.status(400).json({ erro: 'Valor previsto deve ser maior que zero.' });
  }

  if (!(await validarContaUsuario(conta_id, req.usuarioId))) {
    return res.status(403).json({ erro: 'Conta não pertence ao usuário.' });
  }

  const criarAgenda = parseBoolean(criar_na_agenda);
  const dataPrevista = calcularDataPrevista(dia_recebimento);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO rendas_previstas (
        usuario_id, conta_id, tipo_renda, descricao, valor_previsto,
        frequencia, dia_recebimento, criar_na_agenda
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.usuarioId,
        conta_id || null,
        tipo_renda,
        descricao || null,
        valor,
        frequencia,
        dia_recebimento || null,
        criarAgenda
      ]
    );

    if (criarAgenda) {
      const descricaoAgenda = descricao?.trim() || `Renda prevista: ${tipo_renda}`;
      await client.query(
        `INSERT INTO agenda_financeira (
          usuario_id, conta_id, categoria_id, tipo, descricao,
          valor_previsto, data_prevista, observacao
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          req.usuarioId,
          conta_id || null,
          null,
          'conta_receber',
          descricaoAgenda,
          valor,
          dataPrevista,
          null
        ]
      );

      if (frequencia === 'semanal' || frequencia === 'quinzenal' || frequencia === 'mensal') {
        await client.query(
          `INSERT INTO recorrencias (
            usuario_id, conta_id, categoria_id, tipo, descricao, valor,
            frequencia, data_inicio, data_fim
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            req.usuarioId,
            conta_id || null,
            null,
            'conta_receber',
            descricaoAgenda,
            valor,
            frequencia,
            dataPrevista,
            null
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao salvar a renda prevista.' });
  } finally {
    client.release();
  }
}

async function atualizar(req, res) {
  const {
    tipo_renda,
    descricao,
    valor_previsto,
    frequencia,
    dia_recebimento,
    conta_id,
    criar_na_agenda,
    ativo
  } = req.body;

  if (valor_previsto !== undefined && (Number.isNaN(Number(valor_previsto)) || Number(valor_previsto) <= 0)) {
    return res.status(400).json({ erro: 'Valor previsto deve ser maior que zero.' });
  }

  if (frequencia && !FREQUENCIAS_VALIDAS.includes(frequencia)) {
    return res.status(400).json({ erro: 'Frequência inválida.' });
  }

  if (conta_id && !(await validarContaUsuario(conta_id, req.usuarioId))) {
    return res.status(403).json({ erro: 'Conta não pertence ao usuário.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE rendas_previstas SET
         tipo_renda = COALESCE($1, tipo_renda),
         descricao = COALESCE($2, descricao),
         valor_previsto = COALESCE($3, valor_previsto),
         frequencia = COALESCE($4, frequencia),
         dia_recebimento = COALESCE($5, dia_recebimento),
         conta_id = COALESCE($6, conta_id),
         criar_na_agenda = COALESCE($7, criar_na_agenda),
         ativo = COALESCE($8, ativo),
         atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $9 AND usuario_id = $10 RETURNING *`,
      [
        tipo_renda || null,
        descricao || null,
        valor_previsto !== undefined ? Number(valor_previsto) : null,
        frequencia || null,
        dia_recebimento || null,
        conta_id || null,
        criar_na_agenda !== undefined ? parseBoolean(criar_na_agenda) : null,
        ativo !== undefined ? ativo : null,
        req.params.id,
        req.usuarioId
      ]
    );

    if (!rows[0]) return res.status(404).json({ erro: 'Renda prevista não encontrada.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar a renda prevista.' });
  }
}

module.exports = {
  listar,
  criar,
  atualizar
};
