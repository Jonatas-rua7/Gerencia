const { pool } = require('../db');

async function obterPerfil(req, res) {
  try {
    const [usuario, config] = await Promise.all([
      pool.query(
        `SELECT id, nome, email, tipo_uso, documento_tipo, documento_numero,
                perfil_detalhado, nivel_interface, criado_em
         FROM usuarios WHERE id = $1`,
        [req.usuarioId]
      ),
      pool.query('SELECT * FROM configuracoes_usuario WHERE usuario_id = $1', [req.usuarioId])
    ]);
    if (!usuario.rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json({
      usuario: usuario.rows[0],
      configuracoes: config.rows[0] || null
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar perfil.' });
  }
}

async function atualizarPerfil(req, res) {
  const { nome, email, documento_numero, perfil_detalhado, nivel_interface, configuracoes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE usuarios SET
        nome = COALESCE($1, nome),
        email = COALESCE($2, email),
        documento_numero = COALESCE($3, documento_numero),
        perfil_detalhado = COALESCE($4, perfil_detalhado),
        nivel_interface = COALESCE($5, nivel_interface)
       WHERE id = $6 RETURNING id, nome, email, tipo_uso, documento_tipo, documento_numero, perfil_detalhado, nivel_interface`,
      [nome, email, documento_numero, perfil_detalhado, nivel_interface, req.usuarioId]
    );

    if (configuracoes) {
      await client.query(
        `UPDATE configuracoes_usuario SET
          tema = COALESCE($1, tema),
          cor_principal = COALESCE($2, cor_principal),
          cor_destaque = COALESCE($3, cor_destaque),
          mostrar_dicas = COALESCE($4, mostrar_dicas),
          receber_alertas = COALESCE($5, receber_alertas)
         WHERE usuario_id = $6`,
        [
          configuracoes.tema,
          configuracoes.cor_principal,
          configuracoes.cor_destaque,
          configuracoes.mostrar_dicas,
          configuracoes.receber_alertas,
          req.usuarioId
        ]
      );
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ erro: 'Erro ao atualizar perfil.' });
  } finally {
    client.release();
  }
}

async function listarClientes(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM clientes WHERE usuario_id = $1 AND ativo = true ORDER BY nome',
      [req.usuarioId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar clientes.' });
  }
}

async function criarCliente(req, res) {
  const { nome, contato, documento, observacao, tipo, email } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Informe o nome do cliente.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO clientes (usuario_id, nome, contato, email, documento, observacao, tipo)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.usuarioId, nome, contato || null, email || null, documento || null, observacao || null, tipo || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar cliente.' });
  }
}

async function atualizarCliente(req, res) {
  const { nome, contato, documento, observacao, tipo, email } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE clientes SET
         nome = COALESCE($1, nome),
         contato = COALESCE($2, contato),
         email = COALESCE($3, email),
         documento = COALESCE($4, documento),
         observacao = COALESCE($5, observacao),
         tipo = COALESCE($6, tipo)
       WHERE id = $7 AND usuario_id = $8 RETURNING *`,
      [nome, contato, email, documento, observacao, tipo, req.params.id, req.usuarioId]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Cliente não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar cliente.' });
  }
}

async function listarFornecedores(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM fornecedores WHERE usuario_id = $1 AND ativo = true ORDER BY nome',
      [req.usuarioId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar fornecedores.' });
  }
}

async function criarFornecedor(req, res) {
  const { nome, contato, documento, observacao } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Informe o nome do fornecedor.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO fornecedores (usuario_id, nome, contato, documento, observacao)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.usuarioId, nome, contato || null, documento || null, observacao || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar fornecedor.' });
  }
}

async function atualizarFornecedor(req, res) {
  const { nome, contato, documento, observacao } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE fornecedores SET
         nome = COALESCE($1, nome),
         contato = COALESCE($2, contato),
         documento = COALESCE($3, documento),
         observacao = COALESCE($4, observacao)
       WHERE id = $5 AND usuario_id = $6 RETURNING *`,
      [nome, contato, documento, observacao, req.params.id, req.usuarioId]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Fornecedor não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar fornecedor.' });
  }
}

async function listarServicos(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, c.nome AS cliente_nome FROM servicos s
       LEFT JOIN clientes c ON c.id = s.cliente_id
       WHERE s.usuario_id = $1 ORDER BY s.nome`,
      [req.usuarioId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar serviços.' });
  }
}

async function criarServico(req, res) {
  const { nome, descricao, valor_padrao, cliente_id, status, situacao_financeira, tipo } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Informe o nome do serviço.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO servicos (usuario_id, cliente_id, nome, descricao, valor_padrao, status, situacao_financeira, tipo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.usuarioId, cliente_id || null, nome, descricao || null, valor_padrao || null, status || 'ativo', situacao_financeira || 'nada_pendente', tipo || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar serviço.' });
  }
}

async function atualizarServico(req, res) {
  const { nome, descricao, valor_padrao, cliente_id, status, situacao_financeira, tipo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE servicos SET
         nome = COALESCE($1, nome),
         descricao = COALESCE($2, descricao),
         valor_padrao = COALESCE($3, valor_padrao),
         cliente_id = COALESCE($4, cliente_id),
         status = COALESCE($5, status),
         situacao_financeira = COALESCE($6, situacao_financeira),
         tipo = COALESCE($7, tipo)
       WHERE id = $8 AND usuario_id = $9 RETURNING *`,
      [nome, descricao, valor_padrao, cliente_id || null, status, situacao_financeira, tipo, req.params.id, req.usuarioId]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Serviço não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar serviço.' });
  }
}

module.exports = {
  obterPerfil,
  atualizarPerfil,
  listarClientes,
  criarCliente,
  atualizarCliente,
  listarFornecedores,
  criarFornecedor,
  atualizarFornecedor,
  listarServicos,
  criarServico,
  atualizarServico
};
