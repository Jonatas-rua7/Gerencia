const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { obterCategoriasPadrao } = require('../utils/categoriasPadrao');

function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, tipo_uso: usuario.tipo_uso },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function mapUsuarioPublico(row) {
  if (!row) return null;
  const { senha_hash, ...resto } = row;
  return resto;
}

async function cadastro(req, res) {
  const {
    nome,
    email,
    senha,
    tipo_uso,
    documento_tipo,
    documento_numero,
    perfil_detalhado,
    nivel_interface = 'simples'
  } = req.body;

  if (!nome || !email || !senha || !tipo_uso) {
    return res.status(400).json({ erro: 'Preencha nome, e-mail, senha e tipo de uso.' });
  }

  const tiposUso = ['pessoal', 'autonomo', 'empresa'];
  const perfis = {
    pessoal: ['estudante', 'trabalhador_clt', 'desempregado', 'controle_familiar', 'aposentado', 'pessoa_fisica_geral'],
    autonomo: ['freelancer', 'prestador_servicos', 'vendedor_autonomo', 'mei', 'profissional_liberal', 'criador_conteudo', 'motorista_entregador', 'pequeno_empreendedor_individual'],
    empresa: ['mei_equipe', 'microempresa', 'pequena_empresa', 'comercio', 'prestadora_servicos', 'loja_fisica', 'loja_online', 'escritorio', 'outro_negocio']
  };
  const niveisInterface = ['simples', 'avancado'];

  if (!tiposUso.includes(tipo_uso)) {
    return res.status(400).json({ erro: 'Tipo de uso inválido.' });
  }
  if (!perfil_detalhado || !perfis[tipo_uso].includes(perfil_detalhado)) {
    return res.status(400).json({ erro: 'Perfil detalhado inválido para o tipo de uso selecionado.' });
  }
  if (!niveisInterface.includes(nivel_interface)) {
    return res.status(400).json({ erro: 'Nível de interface inválido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existe = await client.query(
      'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (existe.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const usuarioResult = await client.query(
      `INSERT INTO usuarios (
        nome, email, senha_hash, tipo_uso, documento_tipo,
        documento_numero, perfil_detalhado, nivel_interface
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        nome.trim(),
        email.trim().toLowerCase(),
        senhaHash,
        tipo_uso,
        documento_tipo || null,
        documento_numero || null,
        perfil_detalhado || null,
        nivel_interface
      ]
    );
    const usuario = usuarioResult.rows[0];

    await client.query(
      `INSERT INTO configuracoes_usuario (usuario_id, tema) VALUES ($1, 'padrao')`,
      [usuario.id]
    );

    const nomeConta = tipo_uso === 'empresa' ? 'Conta empresarial' : 'Conta principal';
    const tipoConta = tipo_uso === 'empresa' ? 'conta_empresarial' : 'conta_corrente';
    await client.query(
      `INSERT INTO contas (usuario_id, nome, tipo_conta, saldo_inicial) VALUES ($1,$2,$3,0)`,
      [usuario.id, nomeConta, tipoConta]
    );

    for (const cat of obterCategoriasPadrao(tipo_uso)) {
      await client.query(
        `INSERT INTO categorias (usuario_id, nome, tipo, cor, padrao) VALUES ($1,$2,$3,$4,true)`,
        [usuario.id, cat.nome, cat.tipo, cat.cor]
      );
    }

    await client.query('COMMIT');

    const token = gerarToken(usuario);
    res.status(201).json({ token, usuario: mapUsuarioPublico(usuario) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
  } finally {
    client.release();
  }
}

async function login(req, res) {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    const usuario = rows[0];
    if (!usuario) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    const ok = await bcrypt.compare(senha, usuario.senha_hash);
    if (!ok) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    const token = gerarToken(usuario);
    res.json({ token, usuario: mapUsuarioPublico(usuario) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao fazer login.' });
  }
}

async function me(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.usuarioId]);
    if (!rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(mapUsuarioPublico(rows[0]));
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar usuário.' });
  }
}

async function recuperarSenha(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: 'Informe o e-mail.' });

  try {
    const tokenDemo = `rec_${Date.now()}`;
    await pool.query('SELECT criar_token_recuperacao_demo($1, $2)', [email, tokenDemo]);
    res.json({
      mensagem: 'Token de recuperação gerado (demonstração).',
      token_demo: tokenDemo,
      observacao: 'Em produção, o token seria enviado por e-mail.'
    });
  } catch (err) {
    if (err.message?.includes('não encontrado')) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    res.status(500).json({ erro: 'Erro ao solicitar recuperação.' });
  }
}

module.exports = { cadastro, login, me, recuperarSenha };
