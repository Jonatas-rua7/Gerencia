
/**
 * Gerencia! — Preparação da conta fictícia de demonstração.
 * Executar dentro da pasta backend:
 * node scripts/preparar-demo.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const DEMO_NOME = 'Usuário Demo Gerencia';
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@gerencia.app';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'GerenciaDemo2026!';
const MARCADOR = '[GERENCIA_DEMO_SEED_V1]';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function executar() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const usuarios = await client.query(
      `SELECT id, nome, email
       FROM usuarios
       WHERE LOWER(nome) = LOWER($1)
          OR LOWER(email) = LOWER($2)
       FOR UPDATE`,
      [DEMO_NOME, DEMO_EMAIL]
    );

    if (usuarios.rowCount !== 1) {
      throw new Error(
        `Esperava encontrar exatamente 1 usuário demo, mas encontrei ${usuarios.rowCount}.`
      );
    }

    const usuario = usuarios.rows[0];
    const senhaHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    await client.query(
      `UPDATE usuarios SET email = $1, senha_hash = $2 WHERE id = $3`,
      [DEMO_EMAIL, senhaHash, usuario.id]
    );

    const contaResult = await client.query(
      `SELECT id FROM contas
       WHERE usuario_id = $1 AND ativa = TRUE
       ORDER BY criado_em ASC LIMIT 1`,
      [usuario.id]
    );

    if (!contaResult.rows[0]) {
      throw new Error('O usuário demo não possui conta ativa.');
    }

    const contaId = contaResult.rows[0].id;

    const categoriasResult = await client.query(
      `SELECT id, nome, tipo FROM categorias
       WHERE usuario_id = $1 AND ativa = TRUE`,
      [usuario.id]
    );

    const categorias = categoriasResult.rows;

    function categoria(nome, tipo) {
      const item = categorias.find(
        c => c.nome.toLowerCase() === nome.toLowerCase() &&
             c.tipo === tipo
      );

      if (!item) {
        throw new Error(`Categoria não encontrada: ${nome} (${tipo}).`);
      }

      return item.id;
    }

    const catSalario = categoria('Salário', 'entrada');
    const catAlimentacao = categoria('Alimentação', 'saida');
    const catTransporte = categoria('Transporte', 'saida');
    const catMoradia = categoria('Moradia', 'saida');
    const catAssinaturas = categoria('Assinaturas', 'saida');
    const catOutrasSaidas = categoria('Outras saídas', 'saida');

    const movimentacoesExistentes = await client.query(
      `SELECT 1 FROM movimentacoes
       WHERE usuario_id = $1 AND observacao LIKE $2 LIMIT 1`,
      [usuario.id, `${MARCADOR}%`]
    );

    if (!movimentacoesExistentes.rowCount) {
      const movimentacoes = [
        ['Salário mensal', 4200, 'entrada', catSalario, '2026-11-05'],
        ['Freelance de design', 650, 'entrada', catSalario, '2026-11-12'],
        ['Mercado da semana', 386.40, 'saida', catAlimentacao, '2026-11-06'],
        ['Combustível e transporte', 220, 'saida', catTransporte, '2026-11-08'],
        ['Aluguel', 1350, 'saida', catMoradia, '2026-11-10'],
        ['Internet residencial', 109.90, 'saida', catAssinaturas, '2026-11-11'],
        ['Cinema e lazer', 95, 'saida', catOutrasSaidas, '2026-11-15'],
        ['Farmácia', 74.80, 'saida', catOutrasSaidas, '2026-11-18'],
        ['Restaurante', 68.50, 'saida', catAlimentacao, '2026-11-21']
      ];

      for (const [descricao, valor, tipo, categoriaId, data] of movimentacoes) {
        await client.query(
          `INSERT INTO movimentacoes
           (usuario_id, conta_id, categoria_id, tipo, descricao,
            valor, data_movimentacao, origem, observacao)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'manual',$8)`,
          [
            usuario.id, contaId, categoriaId, tipo,
            descricao, valor, data,
            `${MARCADOR} Registro fictício para demonstração.`
          ]
        );
      }
    }

    const agendaExistente = await client.query(
      `SELECT 1 FROM agenda_financeira
       WHERE usuario_id = $1 AND observacao LIKE $2 LIMIT 1`,
      [usuario.id, `${MARCADOR}%`]
    );

    if (!agendaExistente.rowCount) {
      const itens = [
        {
          tipo: 'conta_pagar',
          descricao: 'Fatura do cartão',
          valor: 780,
          data: '2026-11-28',
          categoria: catOutrasSaidas
        },
        {
          tipo: 'conta_pagar',
          descricao: 'Plano de internet',
          valor: 109.90,
          data: '2026-12-05',
          categoria: catAssinaturas
        },
        {
          tipo: 'conta_receber',
          descricao: 'Pagamento de projeto freelance',
          valor: 850,
          data: '2026-12-03',
          categoria: catSalario
        }
      ];

      for (const item of itens) {
        const agenda = await client.query(
          `INSERT INTO agenda_financeira
           (usuario_id, conta_id, categoria_id, tipo, descricao,
            valor_previsto, data_prevista, status, observacao)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'pendente',$8)
           RETURNING id`,
          [
            usuario.id, contaId, item.categoria, item.tipo,
            item.descricao, item.valor, item.data,
            `${MARCADOR} Item fictício para demonstração.`
          ]
        );

        if (item.tipo === 'conta_pagar') {
          await client.query(
            `INSERT INTO contas_pagar
             (agenda_id, usuario_id, fornecedor_nome)
             VALUES ($1,$2,$3)`,
            [agenda.rows[0].id, usuario.id, 'Fornecedor fictício']
          );
        } else {
          await client.query(
            `INSERT INTO contas_receber
             (agenda_id, usuario_id, cliente_nome)
             VALUES ($1,$2,$3)`,
            [agenda.rows[0].id, usuario.id, 'Cliente fictício']
          );
        }
      }
    }

    const orcamentos = [
      [catAlimentacao, 900],
      [catTransporte, 450],
      [catMoradia, 1500],
      [catAssinaturas, 250],
      [catOutrasSaidas, 350]
    ];

    for (const [categoriaId, limite] of orcamentos) {
      await client.query(
        `INSERT INTO orcamentos
         (usuario_id, categoria_id, mes, ano, valor_limite)
         VALUES ($1,$2,11,2026,$3)
         ON CONFLICT (usuario_id, categoria_id, mes, ano)
         DO UPDATE SET valor_limite = EXCLUDED.valor_limite`,
        [usuario.id, categoriaId, limite]
      );
    }

    await client.query(
      `INSERT INTO metas
       (usuario_id, nome, descricao, valor_alvo, valor_atual,
        data_limite, icone, cor)
       SELECT $1, 'Reserva de emergência',
              'Objetivo fictício para demonstração do Gerencia!',
              10000, 3200, DATE '2027-06-30', '🎯', '#1F7A3A'
       WHERE NOT EXISTS (
         SELECT 1 FROM metas
         WHERE usuario_id = $1
           AND nome = 'Reserva de emergência'
       )`,
      [usuario.id]
    );

    await client.query('COMMIT');

    console.log('Demonstração preparada com sucesso!');
    console.log(`E-mail: ${DEMO_EMAIL}`);
    console.log(`Senha: ${DEMO_PASSWORD}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Falha. Alterações revertidas:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

executar();
