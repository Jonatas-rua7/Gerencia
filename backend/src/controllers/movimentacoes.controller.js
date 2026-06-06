const { pool } = require('../db');

async function listar(req, res) {
  const { data_inicio, data_fim, tipo } = req.query;
  try {
    let sql = 'SELECT * FROM vw_movimentacoes_detalhadas WHERE usuario_id = $1';
    const params = [req.usuarioId];
    let i = 2;
    if (tipo) {
      sql += ` AND tipo = $${i++}`;
      params.push(tipo);
    }
    if (data_inicio) {
      sql += ` AND data_movimentacao >= $${i++}`;
      params.push(data_inicio);
    }
    if (data_fim) {
      sql += ` AND data_movimentacao <= $${i++}`;
      params.push(data_fim);
    }
    sql += ' ORDER BY data_movimentacao DESC, criado_em DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar movimentações.' });
  }
}

async function criar(req, res) {
  const {
    tipo,
    descricao,
    valor,
    data_movimentacao,
    conta_id,
    categoria_id,
    observacao
  } = req.body;

  if (!tipo || !descricao || !valor || !data_movimentacao || !conta_id) {
    return res.status(400).json({ erro: 'Preencha tipo, descrição, valor, data e conta.' });
  }

  try {
    // Validar se a conta pertence ao usuário
    const { rows: contaCheck } = await pool.query(
      'SELECT id FROM contas WHERE id = $1 AND usuario_id = $2',
      [conta_id, req.usuarioId]
    );
    if (!contaCheck[0]) {
      return res.status(403).json({ erro: 'Conta não pertence ao usuário.' });
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

    const { rows } = await pool.query(
      `INSERT INTO movimentacoes (
        usuario_id, conta_id, categoria_id, tipo, descricao,
        valor, data_movimentacao, origem, observacao
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'manual',$8) RETURNING *`,
      [
        req.usuarioId,
        conta_id,
        categoria_id || null,
        tipo,
        descricao.trim(),
        valor,
        data_movimentacao,
        observacao || null
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao registrar movimentação.' });
  }
}

async function atualizar(req, res) {
  const { descricao, valor, data_movimentacao, conta_id, categoria_id, observacao } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE movimentacoes SET
        descricao = COALESCE($1, descricao),
        valor = COALESCE($2, valor),
        data_movimentacao = COALESCE($3, data_movimentacao),
        conta_id = COALESCE($4, conta_id),
        categoria_id = $5,
        observacao = COALESCE($6, observacao)
       WHERE id = $7 AND usuario_id = $8 AND origem = 'manual' RETURNING *`,
      [descricao, valor, data_movimentacao, conta_id, categoria_id ?? null, observacao, req.params.id, req.usuarioId]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Movimentação não encontrada ou não editável.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar movimentação.' });
  }
}

async function excluir(req, res) {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM movimentacoes WHERE id = $1 AND usuario_id = $2 AND origem = 'manual'`,
      [req.params.id, req.usuarioId]
    );
    if (!rowCount) return res.status(404).json({ erro: 'Movimentação não encontrada.' });
    res.json({ mensagem: 'Movimentação excluída.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir movimentação.' });
  }
}

async function duplicar(req, res) {
  try {
    const { rows: original } = await pool.query(
      'SELECT * FROM movimentacoes WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.usuarioId]
    );
    if (!original[0]) return res.status(404).json({ erro: 'Movimentação não encontrada.' });

    const m = original[0];
    const { rows } = await pool.query(
      `INSERT INTO movimentacoes (usuario_id, conta_id, categoria_id, tipo, descricao, valor, data_movimentacao, origem, observacao)
       VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE,'manual',$7) RETURNING *`,
      [req.usuarioId, m.conta_id, m.categoria_id, m.tipo, m.descricao + ' (cópia)', m.valor, m.observacao]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao duplicar movimentação.' });
  }
}

module.exports = { listar, criar, atualizar, excluir, duplicar };
