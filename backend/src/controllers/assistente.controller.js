const { pool } = require('../db');

async function sugerirCategoria(req, res) {
  const { texto, tipo } = req.query;
  if (!texto) return res.status(400).json({ erro: 'Informe o texto para sugestão.' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM sugerir_melhor_categoria($1::uuid, $2, $3)',
      [req.usuarioId, texto, tipo || null]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao sugerir categoria.' });
  }
}

async function atualizarAtrasadas(req, res) {
  try {
    const { rows } = await pool.query('SELECT atualizar_agendas_atrasadas() AS total');
    res.json({ total_atualizadas: rows[0].total });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar agendas atrasadas.' });
  }
}

async function verificarSaldoPrevisto(req, res) {
  const limite = Number(req.body.limite ?? 0);
  try {
    const { rows } = await pool.query(
      'SELECT gerar_aviso_saldo_previsto_baixo($1::uuid, $2::numeric) AS mensagem',
      [req.usuarioId, limite]
    );
    res.json({ mensagem: rows[0].mensagem });
  } catch (err) {
    res.status(400).json({ erro: err.message || 'Erro ao verificar saldo previsto.' });
  }
}

async function gerarAlertas(req, res) {
  const uid = req.usuarioId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const upsertAviso = async (tipo, titulo, mensagem, nivel) => {
      await client.query(
        `INSERT INTO avisos_financeiros (usuario_id, tipo, titulo, mensagem, nivel)
         SELECT $1,$2,$3,$4,$5
         WHERE NOT EXISTS (
           SELECT 1 FROM avisos_financeiros
           WHERE usuario_id=$1 AND tipo=$2 AND resolvido=false
           AND criado_em::date = CURRENT_DATE
         )`,
        [uid, tipo, titulo, mensagem, nivel]
      );
    };

    const { rows: vencendo } = await client.query(
      `SELECT descricao, valor_previsto, data_prevista FROM agenda_financeira
       WHERE usuario_id=$1 AND status='pendente' AND tipo='conta_pagar'
       AND data_prevista BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'`,
      [uid]
    );
    for (const v of vencendo) {
      await upsertAviso(
        `vencimento_${v.data_prevista}`,
        '⏰ Conta vencendo em breve',
        `"${v.descricao}" vence em ${new Date(v.data_prevista).toLocaleDateString('pt-BR')} — R$ ${Number(v.valor_previsto).toFixed(2)}`,
        'atencao'
      );
    }

    const { rows: estourados } = await client.query(
      `SELECT categoria, percentual_usado FROM vw_orcamento_vs_real
       WHERE usuario_id=$1 AND mes=EXTRACT(MONTH FROM NOW()) AND ano=EXTRACT(YEAR FROM NOW())
       AND percentual_usado >= 100`,
      [uid]
    );
    for (const e of estourados) {
      await upsertAviso(
        `orcamento_estourado_${e.categoria}`,
        '🔴 Orçamento estourado',
        `Categoria "${e.categoria}" ultrapassou 100% do limite (${e.percentual_usado}% usado).`,
        'critico'
      );
    }

    const { rows: quaseEstourados } = await client.query(
      `SELECT categoria, percentual_usado FROM vw_orcamento_vs_real
       WHERE usuario_id=$1 AND mes=EXTRACT(MONTH FROM NOW()) AND ano=EXTRACT(YEAR FROM NOW())
       AND percentual_usado >= 80 AND percentual_usado < 100`,
      [uid]
    );
    for (const q of quaseEstourados) {
      await upsertAviso(
        `orcamento_limite_${q.categoria}`,
        '🟡 Orçamento próximo do limite',
        `Categoria "${q.categoria}" está em ${q.percentual_usado}% do limite mensal.`,
        'atencao'
      );
    }

    await client.query('COMMIT');

    const { rows: todos } = await client.query(
      `SELECT id, tipo, titulo, mensagem, nivel, lido, criado_em
       FROM avisos_financeiros WHERE usuario_id=$1 AND resolvido=false
       ORDER BY criado_em DESC LIMIT 20`,
      [uid]
    );
    res.json({ gerados: vencendo.length + estourados.length + quaseEstourados.length, avisos: todos });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar alertas.' });
  } finally {
    client.release();
  }
}

async function marcarLido(req, res) {
  try {
    await pool.query(
      'UPDATE avisos_financeiros SET lido=true, resolvido=true WHERE id=$1 AND usuario_id=$2',
      [req.params.id, req.usuarioId]
    );
    res.json({ mensagem: 'Aviso marcado como lido.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar aviso.' });
  }
}

module.exports = { sugerirCategoria, atualizarAtrasadas, verificarSaldoPrevisto, gerarAlertas, marcarLido };
