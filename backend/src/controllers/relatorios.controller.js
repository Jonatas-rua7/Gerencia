const { pool } = require('../db');

async function resultadoMensal(req, res) {
  const { ano, mes } = req.query;
  try {
    let sql = 'SELECT * FROM vw_resultado_mensal WHERE usuario_id = $1';
    const params = [req.usuarioId];
    if (ano) {
      sql += ' AND ano = $2';
      params.push(Number(ano));
      if (mes) {
        sql += ' AND mes = $3';
        params.push(Number(mes));
      }
    }
    sql += ' ORDER BY ano DESC, mes DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar resultado mensal.' });
  }
}

async function gastosCategoria(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM vw_gastos_por_categoria WHERE usuario_id = $1 ORDER BY total_gasto DESC',
      [req.usuarioId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar gastos por categoria.' });
  }
}

async function pendencias(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM vw_pendencias_financeiras WHERE usuario_id = $1 ORDER BY data_prevista',
      [req.usuarioId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar pendências.' });
  }
}

async function saldoPrevisto(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM vw_saldo_previsto_usuario WHERE usuario_id = $1',
      [req.usuarioId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar saldo previsto.' });
  }
}

async function fluxoProjetado(req, res) {
  const dias = Math.min(parseInt(req.query.dias) || 90, 180);
  try {
    const { rows } = await pool.query(
      `SELECT
         data_prevista,
         COALESCE(SUM(CASE WHEN tipo IN ('conta_receber','recorrencia') OR (tipo='compromisso' AND valor_previsto > 0) THEN valor_previsto ELSE 0 END), 0) AS entradas_previstas,
         COALESCE(SUM(CASE WHEN tipo IN ('conta_pagar','parcela') OR (tipo='compromisso' AND valor_previsto < 0) THEN valor_previsto ELSE 0 END), 0) AS saidas_previstas
       FROM agenda_financeira
       WHERE usuario_id = $1
         AND status = 'pendente'
         AND data_prevista BETWEEN CURRENT_DATE AND CURRENT_DATE + ($2 || ' days')::INTERVAL
       GROUP BY data_prevista
       ORDER BY data_prevista`,
      [req.usuarioId, dias]
    );

    let acumulado = 0;
    const resultado = rows.map(r => {
      acumulado += Number(r.entradas_previstas) - Number(r.saidas_previstas);
      return { ...r, saldo_acumulado: acumulado };
    });

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao calcular fluxo projetado.' });
  }
}

module.exports = { resultadoMensal, gastosCategoria, pendencias, saldoPrevisto, fluxoProjetado };
