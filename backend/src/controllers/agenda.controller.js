const { pool } = require('../db');

async function listar(req, res) {
  const { status, tipo } = req.query;
  try {
    let sql = 'SELECT * FROM vw_agenda_detalhada WHERE usuario_id = $1';
    const params = [req.usuarioId];
    let i = 2;
    if (status) {
      sql += ` AND status = $${i++}`;
      params.push(status);
    }
    if (tipo) {
      sql += ` AND tipo = $${i++}`;
      params.push(tipo);
    }
    sql += ' ORDER BY data_prevista ASC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar agenda.' });
  }
}

async function criar(req, res) {
  const {
    tipo,
    descricao,
    valor_previsto,
    data_prevista,
    conta_id,
    categoria_id,
    observacao,
    fornecedor_id,
    cliente_id,
    recorrencia
  } = req.body;

  if (!tipo || !descricao || !valor_previsto || !data_prevista) {
    return res.status(400).json({ erro: 'Preencha tipo, descrição, valor e data.' });
  }

  const tiposAgenda = ['conta_pagar', 'conta_receber', 'parcela', 'recorrencia', 'compromisso'];
  if (!tiposAgenda.includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo de agenda inválido.' });
  }

  // Validar conta se informada
  if (conta_id) {
    const { rows: contaCheck } = await pool.query(
      'SELECT id FROM contas WHERE id = $1 AND usuario_id = $2',
      [conta_id, req.usuarioId]
    );
    if (!contaCheck[0]) {
      return res.status(403).json({ erro: 'Conta não pertence ao usuário.' });
    }
  }

  // Validar categoria se informada
  if (categoria_id) {
    const { rows: catCheck } = await pool.query(
      'SELECT id FROM categorias WHERE id = $1 AND usuario_id = $2',
      [categoria_id, req.usuarioId]
    );
    if (!catCheck[0]) {
      return res.status(403).json({ erro: 'Categoria não pertence ao usuário.' });
    }
  }

  // Validar fornecedor se informado
  if (fornecedor_id) {
    const { rows: fornCheck } = await pool.query(
      'SELECT id FROM fornecedores WHERE id = $1 AND usuario_id = $2',
      [fornecedor_id, req.usuarioId]
    );
    if (!fornCheck[0]) {
      return res.status(403).json({ erro: 'Fornecedor não pertence ao usuário.' });
    }
  }

  // Validar cliente se informado
  if (cliente_id) {
    const { rows: cliCheck } = await pool.query(
      'SELECT id FROM clientes WHERE id = $1 AND usuario_id = $2',
      [cliente_id, req.usuarioId]
    );
    if (!cliCheck[0]) {
      return res.status(403).json({ erro: 'Cliente não pertence ao usuário.' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const agendaResult = await client.query(
      `INSERT INTO agenda_financeira (
        usuario_id, conta_id, categoria_id, tipo, descricao,
        valor_previsto, data_prevista, observacao
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.usuarioId,
        conta_id || null,
        categoria_id || null,
        tipo,
        descricao.trim(),
        valor_previsto,
        data_prevista,
        observacao || null
      ]
    );
    const agenda = agendaResult.rows[0];

    if (tipo === 'conta_pagar') {
      await client.query(
        `INSERT INTO contas_pagar (agenda_id, usuario_id, fornecedor_id) VALUES ($1,$2,$3)`,
        [agenda.id, req.usuarioId, fornecedor_id || null]
      );
    }
    if (tipo === 'conta_receber') {
      await client.query(
        `INSERT INTO contas_receber (agenda_id, usuario_id, cliente_id) VALUES ($1,$2,$3)`,
        [agenda.id, req.usuarioId, cliente_id || null]
      );
    }

    if (recorrencia && recorrencia.frequencia && recorrencia.frequencia !== 'nenhuma') {
      await client.query(
        `INSERT INTO recorrencias (
          usuario_id, conta_id, categoria_id, tipo, descricao, valor,
          frequencia, data_inicio, data_fim
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          req.usuarioId,
          conta_id || null,
          categoria_id || null,
          tipo === 'conta_receber' ? 'conta_receber' : 'conta_pagar',
          descricao.trim(),
          valor_previsto,
          recorrencia.frequencia,
          data_prevista,
          recorrencia.data_fim || null
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(agenda);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar agenda.' });
  } finally {
    client.release();
  }
}

async function criarParcelamento(req, res) {
  const {
    descricao,
    valor_total,
    quantidade_parcelas,
    data_primeira_parcela,
    conta_id,
    categoria_id
  } = req.body;

  if (!descricao || !valor_total || !quantidade_parcelas || !data_primeira_parcela) {
    return res.status(400).json({ erro: 'Preencha todos os campos do parcelamento.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const parc = await client.query(
      `INSERT INTO parcelamentos (
        usuario_id, conta_id, categoria_id, descricao, valor_total,
        quantidade_parcelas, data_primeira_parcela
      ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.usuarioId, conta_id || null, categoria_id || null, descricao, valor_total, quantidade_parcelas, data_primeira_parcela]
    );
    const parcelamento = parc.rows[0];
    const valorParcela = Math.round((valor_total / quantidade_parcelas) * 100) / 100;
    const [ano, mes, dia] = data_primeira_parcela.split('-').map(Number);

    for (let n = 1; n <= quantidade_parcelas; n++) {
      const venc = new Date(ano, mes - 1 + (n - 1), dia);
      const dataIso = venc.toISOString().slice(0, 10);

      const ag = await client.query(
        `INSERT INTO agenda_financeira (
          usuario_id, conta_id, categoria_id, tipo, descricao, valor_previsto, data_prevista
        ) VALUES ($1,$2,$3,'parcela',$4,$5,$6) RETURNING id`,
        [req.usuarioId, conta_id || null, categoria_id || null, `${descricao} (${n}/${quantidade_parcelas})`, valorParcela, dataIso]
      );

      await client.query(
        `INSERT INTO parcelas (parcelamento_id, agenda_id, numero_parcela, valor_parcela, vencimento)
         VALUES ($1,$2,$3,$4,$5)`,
        [parcelamento.id, ag.rows[0].id, n, valorParcela, dataIso]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(parcelamento);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ erro: 'Erro ao criar parcelamento.' });
  } finally {
    client.release();
  }
}

async function verificarAgendaDoUsuario(agendaId, usuarioId) {
  const { rows } = await pool.query(
    'SELECT id FROM agenda_financeira WHERE id = $1 AND usuario_id = $2',
    [agendaId, usuarioId]
  );
  return rows[0];
}

async function realizar(req, res) {
  const { conta_id, valor, data, observacao } = req.body;
  try {
    const ok = await verificarAgendaDoUsuario(req.params.id, req.usuarioId);
    if (!ok) return res.status(404).json({ erro: 'Agenda não encontrada.' });

    const { rows: agendaRows } = await pool.query(
      'SELECT valor_previsto, data_prevista FROM agenda_financeira WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.usuarioId]
    );
    const agenda = agendaRows[0];
    if (!agenda) return res.status(404).json({ erro: 'Agenda não encontrada.' });

    const valorFinal = (valor !== undefined && valor !== null && valor !== '') ? valor : agenda.valor_previsto;
    const dataFinal = data || agenda.data_prevista || new Date().toISOString().slice(0, 10);

    const { rows } = await pool.query(
      `SELECT realizar_agenda($1::uuid, $2::uuid, $3::numeric, $4::date, $5) AS movimentacao_id`,
      [req.params.id, conta_id || null, valorFinal, dataFinal, observacao || null]
    );
    res.json({
      mensagem: 'Agenda realizada com sucesso.',
      movimentacao_id: rows[0].movimentacao_id
    });
  } catch (err) {
    res.status(400).json({ erro: err.message || 'Erro ao realizar agenda.' });
  }
}

async function cancelar(req, res) {
  const { motivo } = req.body;
  try {
    const ok = await verificarAgendaDoUsuario(req.params.id, req.usuarioId);
    if (!ok) return res.status(404).json({ erro: 'Agenda não encontrada.' });

    const { rows } = await pool.query(
      'SELECT cancelar_agenda($1::uuid, $2) AS mensagem',
      [req.params.id, motivo || null]
    );
    res.json({ mensagem: rows[0].mensagem });
  } catch (err) {
    res.status(400).json({ erro: err.message || 'Erro ao cancelar agenda.' });
  }
}

module.exports = { listar, criar, criarParcelamento, realizar, cancelar };
