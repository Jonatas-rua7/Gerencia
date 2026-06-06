const { pool } = require('../db');

async function listar(req, res) {
  const { mes, ano } = req.query;
  const mesAtual = mes || new Date().getMonth() + 1;
  const anoAtual = ano || new Date().getFullYear();
  try {
    const { rows } = await pool.query(
      'SELECT * FROM vw_orcamento_vs_real WHERE usuario_id = $1 AND mes = $2 AND ano = $3 ORDER BY percentual_usado DESC',
      [req.usuarioId, mesAtual, anoAtual]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar orçamentos.' });
  }
}

async function salvar(req, res) {
  const { categoria_id, mes, ano, valor_limite } = req.body;
  if (!categoria_id || !mes || !ano || !valor_limite)
    return res.status(400).json({ erro: 'Preencha categoria, mês, ano e valor limite.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO orcamentos (usuario_id, categoria_id, mes, ano, valor_limite)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (usuario_id, categoria_id, mes, ano)
       DO UPDATE SET valor_limite = EXCLUDED.valor_limite
       RETURNING *`,
      [req.usuarioId, categoria_id, mes, ano, valor_limite]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao salvar orçamento.' });
  }
}

async function excluir(req, res) {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM orcamentos WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.usuarioId]
    );
    if (!rowCount) return res.status(404).json({ erro: 'Orçamento não encontrado.' });
    res.json({ mensagem: 'Orçamento removido.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir orçamento.' });
  }
}

module.exports = { listar, salvar, excluir };
