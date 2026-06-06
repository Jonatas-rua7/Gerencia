const { pool } = require('../db');

async function listar(req, res) {
  const { tipo } = req.query;
  try {
    let sql = 'SELECT * FROM categorias WHERE usuario_id = $1 AND ativa = true';
    const params = [req.usuarioId];
    if (tipo) {
      sql += ' AND tipo = $2';
      params.push(tipo);
    }
    sql += ' ORDER BY nome';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar categorias.' });
  }
}

async function criar(req, res) {
  const { nome, tipo, cor = '#2E9E44' } = req.body;
  if (!nome || !tipo) {
    return res.status(400).json({ erro: 'Informe nome e tipo.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO categorias (usuario_id, nome, tipo, cor, padrao)
       VALUES ($1,$2,$3,$4,false) RETURNING *`,
      [req.usuarioId, nome.trim(), tipo, cor]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar categoria.' });
  }
}

async function atualizar(req, res) {
  const { nome, tipo, cor, ativa } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE categorias SET
        nome = COALESCE($1, nome),
        tipo = COALESCE($2, tipo),
        cor = COALESCE($3, cor),
        ativa = COALESCE($4, ativa)
       WHERE id = $5 AND usuario_id = $6 RETURNING *`,
      [nome, tipo, cor, ativa, req.params.id, req.usuarioId]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Categoria não encontrada.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar categoria.' });
  }
}

async function excluir(req, res) {
  try {
    const { rowCount } = await pool.query(
      'UPDATE categorias SET ativa = false WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.usuarioId]
    );
    if (!rowCount) return res.status(404).json({ erro: 'Categoria não encontrada.' });
    res.json({ mensagem: 'Categoria desativada.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir categoria.' });
  }
}

module.exports = { listar, criar, atualizar, excluir };
