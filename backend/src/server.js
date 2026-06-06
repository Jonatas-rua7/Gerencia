const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool } = require('./db');

const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const contasRoutes = require('./routes/contas.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const movimentacoesRoutes = require('./routes/movimentacoes.routes');
const agendaRoutes = require('./routes/agenda.routes');
const transferenciasRoutes = require('./routes/transferencias.routes');
const relatoriosRoutes = require('./routes/relatorios.routes');
const assistenteRoutes = require('./routes/assistente.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const rendasRoutes = require('./routes/rendas.routes');
const orcamentosRoutes = require('./routes/orcamentos.routes');
const metasRoutes = require('./routes/metas.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Arquivos estáticos do front-end (pasta raiz do projeto)
app.use(express.static(path.join(__dirname, '../..')));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'API do Gerencia funcionando' });
  } catch {
    res.status(503).json({
      status: 'erro',
      message: 'API online, mas banco indisponível. Verifique o PostgreSQL.'
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contas', contasRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/movimentacoes', movimentacoesRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/transferencias', transferenciasRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/assistente', assistenteRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/rendas-previstas', rendasRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/metas', metasRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`Gerencia! API em http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});
