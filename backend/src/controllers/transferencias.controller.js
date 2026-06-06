const { pool } = require('../db');

async function registrar(req, res) {
  const {
    conta_origem_id,
    conta_destino_id,
    valor,
    data_transferencia,
    descricao,
    observacao
  } = req.body;

  if (!conta_origem_id || !conta_destino_id || !valor) {
    return res.status(400).json({ erro: 'Informe contas e valor.' });
  }

  try {
    // Validar se as contas pertencem ao usuário
    const { rows: contas } = await pool.query(
      'SELECT id FROM contas WHERE id IN ($1, $2) AND usuario_id = $3',
      [conta_origem_id, conta_destino_id, req.usuarioId]
    );
    if (contas.length !== 2) {
      return res.status(403).json({ erro: 'Uma ou ambas as contas não pertencem ao usuário.' });
    }

    const { rows } = await pool.query(
      `SELECT registrar_transferencia($1::uuid, $2::uuid, $3::numeric, $4::date, $5, $6) AS id`,
      [
        conta_origem_id,
        conta_destino_id,
        valor,
        data_transferencia || null,
        descricao || 'Transferência entre contas',
        observacao || null
      ]
    );
    res.status(201).json({ id: rows[0].id, mensagem: 'Transferência registrada.' });
  } catch (err) {
    res.status(400).json({ erro: err.message || 'Erro ao registrar transferência.' });
  }
}

module.exports = { registrar };
