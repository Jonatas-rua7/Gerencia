const { pool } = require('../db');

async function obterDashboard(req, res) {
  const uid = req.usuarioId;
  try {
    const [dash, saldoPrevisto, avisos, comp] = await Promise.all([
      pool.query('SELECT * FROM vw_dashboard_usuario WHERE usuario_id = $1', [uid]),
      pool.query('SELECT * FROM vw_saldo_previsto_usuario WHERE usuario_id = $1', [uid]),
      pool.query(
        `SELECT id, tipo, titulo, mensagem, nivel, lido, criado_em
         FROM avisos_financeiros
         WHERE usuario_id = $1 AND resolvido = false
         ORDER BY criado_em DESC LIMIT 10`,
        [uid]
      ),
      pool.query(
        `SELECT
          COALESCE(SUM(CASE WHEN tipo='entrada' AND EXTRACT(MONTH FROM data_movimentacao)=EXTRACT(MONTH FROM NOW())
            AND EXTRACT(YEAR FROM data_movimentacao)=EXTRACT(YEAR FROM NOW()) THEN valor END), 0) AS entradas_mes,
          COALESCE(SUM(CASE WHEN tipo='entrada' AND data_movimentacao >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
            AND data_movimentacao < DATE_TRUNC('month', NOW()) THEN valor END), 0) AS entradas_mes_ant,
          COALESCE(SUM(CASE WHEN tipo='saida' AND EXTRACT(MONTH FROM data_movimentacao)=EXTRACT(MONTH FROM NOW())
            AND EXTRACT(YEAR FROM data_movimentacao)=EXTRACT(YEAR FROM NOW()) THEN valor END), 0) AS saidas_mes,
          COALESCE(SUM(CASE WHEN tipo='saida' AND data_movimentacao >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
            AND data_movimentacao < DATE_TRUNC('month', NOW()) THEN valor END), 0) AS saidas_mes_ant
        FROM movimentacoes WHERE usuario_id = $1
          AND data_movimentacao >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'`,
        [uid]
      )
    ]);

    const calcVar = (atual, ant) =>
      ant === 0 ? null : Math.round(((atual - ant) / ant) * 100 * 10) / 10;

    res.json({
      resumo: dash.rows[0] || null,
      saldo_previsto: saldoPrevisto.rows[0] || null,
      avisos: avisos.rows,
      comparativo: {
        var_entradas: calcVar(comp.rows[0].entradas_mes, comp.rows[0].entradas_mes_ant),
        var_saidas: calcVar(comp.rows[0].saidas_mes, comp.rows[0].saidas_mes_ant)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao carregar dashboard.' });
  }
}

module.exports = { obterDashboard };
