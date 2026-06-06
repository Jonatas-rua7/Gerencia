const { pool } = require('../db');

async function listar(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT *,
        ROUND((valor_atual / NULLIF(valor_alvo,0)) * 100, 1) AS percentual,
        CASE WHEN data_limite IS NOT NULL
          THEN GREATEST(0, DATE_PART('day', data_limite::timestamp - NOW()::timestamp)::int)
          ELSE NULL END AS dias_restantes,
        CASE WHEN data_limite IS NOT NULL AND data_limite > CURRENT_DATE
          THEN ROUND((valor_alvo - valor_atual) /
            NULLIF(DATE_PART('month', AGE(data_limite, CURRENT_DATE)) +
              DATE_PART('year', AGE(data_limite, CURRENT_DATE)) * 12, 0), 2)
          ELSE NULL END AS aporte_mensal_sugerido
       FROM metas WHERE usuario_id = $1 AND status != 'cancelada'
       ORDER BY status ASC, data_limite ASC NULLS LAST`,
      [req.usuarioId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar metas.' });
  }
}

async function criar(req, res) {
  const { nome, descricao, valor_alvo, data_limite, icone, cor } = req.body;
  if (!nome || !valor_alvo)
    return res.status(400).json({ erro: 'Preencha nome e valor alvo.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO metas (usuario_id, nome, descricao, valor_alvo, data_limite, icone, cor)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.usuarioId, nome.trim(), descricao||null, valor_alvo, data_limite||null, icone||'🎯', cor||'#1F7A3A']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar meta.' });
  }
}

async function registrarAporte(req, res) {
  const { valor, data, observacao } = req.body;
  if (!valor || valor <= 0)
    return res.status(400).json({ erro: 'Informe um valor válido.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: metaCheck } = await client.query(
      'SELECT id, valor_alvo, valor_atual FROM metas WHERE id = $1 AND usuario_id = $2 AND status = $3',
      [req.params.id, req.usuarioId, 'ativa']
    );
    if (!metaCheck[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Meta não encontrada.' });
    }

    await client.query(
      'INSERT INTO meta_aportes (meta_id, usuario_id, valor, data, observacao) VALUES ($1,$2,$3,$4,$5)',
      [req.params.id, req.usuarioId, valor, data||new Date().toISOString().slice(0,10), observacao||null]
    );

    const novoValor = Number(metaCheck[0].valor_atual) + Number(valor);
    const novoStatus = novoValor >= Number(metaCheck[0].valor_alvo) ? 'concluida' : 'ativa';
    const { rows } = await client.query(
      'UPDATE metas SET valor_atual = $1, status = $2 WHERE id = $3 RETURNING *',
      [novoValor, novoStatus, req.params.id]
    );
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao registrar aporte.' });
  } finally {
    client.release();
  }
}

async function excluir(req, res) {
  try {
    const { rowCount } = await pool.query(
      `UPDATE metas SET status = 'cancelada' WHERE id = $1 AND usuario_id = $2`,
      [req.params.id, req.usuarioId]
    );
    if (!rowCount) return res.status(404).json({ erro: 'Meta não encontrada.' });
    res.json({ mensagem: 'Meta cancelada.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao cancelar meta.' });
  }
}

module.exports = { listar, criar, registrarAporte, excluir };
