const { pool } = require('../db');

async function listar(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM vw_saldo_contas WHERE usuario_id = $1 ORDER BY conta',
      [req.usuarioId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar contas.' });
  }
}

async function criar(req, res) {
  const { nome, tipo_conta, saldo_inicial = 0 } = req.body;
  if (!nome || !tipo_conta) {
    return res.status(400).json({ erro: 'Informe nome e tipo da conta.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO contas (usuario_id, nome, tipo_conta, saldo_inicial)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.usuarioId, nome.trim(), tipo_conta, saldo_inicial]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar conta.' });
  }
}

async function atualizar(req, res) {
  const { nome, tipo_conta, saldo_inicial, ativa } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE contas SET
        nome = COALESCE($1, nome),
        tipo_conta = COALESCE($2, tipo_conta),
        saldo_inicial = COALESCE($3, saldo_inicial),
        ativa = COALESCE($4, ativa)
       WHERE id = $5 AND usuario_id = $6 RETURNING *`,
      [nome, tipo_conta, saldo_inicial, ativa, req.params.id, req.usuarioId]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Conta não encontrada.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar conta.' });
  }
}

async function listarCaixinhas(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM caixinhas WHERE usuario_id = $1 ORDER BY nome',
      [req.usuarioId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar caixinhas.' });
  }
}

async function criarCaixinha(req, res) {
  const { nome, objetivo, valor_separado = 0, meta_valor, conta_id } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Informe o nome da caixinha.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO caixinhas (usuario_id, conta_id, nome, objetivo, valor_separado, meta_valor)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.usuarioId, conta_id || null, nome, objetivo || null, valor_separado, meta_valor || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar caixinha.' });
  }
}

async function listarCompromissos(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM compromissos_financeiros WHERE usuario_id = $1 ORDER BY nome',
      [req.usuarioId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar compromissos.' });
  }
}

module.exports = {
  listar,
  criar,
  atualizar,
  listarCaixinhas,
  criarCaixinha,
  listarCompromissos
};
