/**
 * Cliente HTTP da API Gerencia!
 * Todos os dados financeiros passam por aqui → PostgreSQL via backend.
 */

const API = {
  getToken() {
    return localStorage.getItem(GerenciaConfig.TOKEN_KEY);
  },

  setSessao(token, usuario) {
    localStorage.setItem(GerenciaConfig.TOKEN_KEY, token);
    if (usuario) localStorage.setItem(GerenciaConfig.USUARIO_KEY, JSON.stringify(usuario));
  },

  limparSessao() {
    localStorage.removeItem(GerenciaConfig.TOKEN_KEY);
    localStorage.removeItem(GerenciaConfig.USUARIO_KEY);
  },

  getUsuarioCache() {
    try {
      const u = localStorage.getItem(GerenciaConfig.USUARIO_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${GerenciaConfig.API_BASE}${path}`, { ...options, headers });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (res.status === 401) {
      this.limparSessao();
      if (!path.includes('/auth/login') && !path.includes('/auth/cadastro')) {
        window.location.href = '/login.html';
      }
    }

    if (!res.ok) {
      const msg = data?.erro || data?.message || 'Erro na requisição.';
      throw new Error(msg);
    }
    return data;
  },

  // Auth
  cadastro: (body) => API.request('/auth/cadastro', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => API.request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => API.request('/auth/me'),
  recuperarSenha: (email) => API.request('/auth/recuperar-senha', { method: 'POST', body: JSON.stringify({ email }) }),

  // Dashboard
  dashboard: () => API.request('/dashboard'),

  // Contas
  listarContas: () => API.request('/contas'),
  criarConta: (body) => API.request('/contas', { method: 'POST', body: JSON.stringify(body) }),
  listarCaixinhas: () => API.request('/contas/caixinhas/listar'),
  criarCaixinha: (body) => API.request('/contas/caixinhas', { method: 'POST', body: JSON.stringify(body) }),
  listarCompromissos: () => API.request('/contas/compromissos/listar'),

  // Categorias
  listarCategorias: (tipo) => API.request(`/categorias${tipo ? `?tipo=${tipo}` : ''}`),
  criarCategoria: (body) => API.request('/categorias', { method: 'POST', body: JSON.stringify(body) }),
  atualizarCategoria: (id, body) => API.request(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  excluirCategoria: (id) => API.request(`/categorias/${id}`, { method: 'DELETE' }),

  // Movimentações reais
  listarMovimentacoes: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return API.request(`/movimentacoes${q ? `?${q}` : ''}`);
  },
  criarMovimentacao: (body) => API.request('/movimentacoes', { method: 'POST', body: JSON.stringify(body) }),
  atualizarMovimentacao: (id, body) => API.request(`/movimentacoes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  duplicarMovimentacao: (id) => API.request(`/movimentacoes/${id}/duplicar`, { method: 'POST', body: '{}' }),
  excluirMovimentacao: (id) => API.request(`/movimentacoes/${id}`, { method: 'DELETE' }),

  // Agenda
  listarAgenda: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return API.request(`/agenda${q ? `?${q}` : ''}`);
  },
  criarAgenda: (body) => API.request('/agenda', { method: 'POST', body: JSON.stringify(body) }),
  realizarAgenda: (id, body) => API.request(`/agenda/${id}/realizar`, { method: 'POST', body: JSON.stringify(body || {}) }),
  cancelarAgenda: (id, motivo) => API.request(`/agenda/${id}/cancelar`, { method: 'POST', body: JSON.stringify({ motivo }) }),
  criarParcelamento: (body) => API.request('/agenda/parcelamento', { method: 'POST', body: JSON.stringify(body) }),

  // Transferências
  registrarTransferencia: (body) => API.request('/transferencias', { method: 'POST', body: JSON.stringify(body) }),

  // Relatórios
  relatorioResultadoMensal: (ano, mes) => {
    const p = new URLSearchParams();
    if (ano) p.set('ano', ano);
    if (mes) p.set('mes', mes);
    const q = p.toString();
    return API.request(`/relatorios/resultado-mensal${q ? `?${q}` : ''}`);
  },
  relatorioGastosCategoria: () => API.request('/relatorios/gastos-categoria'),
  relatorioPendencias: () => API.request('/relatorios/pendencias'),
  relatorioSaldoPrevisto: () => API.request('/relatorios/saldo-previsto'),
  fluxoProjetado: (dias = 90) => API.request(`/relatorios/fluxo-projetado?dias=${dias}`),

  // Assistente
  sugerirCategoria: (texto, tipo) => {
    const p = new URLSearchParams({ texto });
    if (tipo) p.set('tipo', tipo);
    return API.request(`/assistente/sugerir-categoria?${p}`);
  },
  atualizarAtrasadas: () => API.request('/assistente/atualizar-atrasadas', { method: 'POST', body: '{}' }),
  verificarSaldoPrevisto: (limite = 0) => API.request('/assistente/verificar-saldo-previsto', { method: 'POST', body: JSON.stringify({ limite }) }),

  // Orçamentos
  listarOrcamentos: (mes, ano) => API.request(`/orcamentos?mes=${mes}&ano=${ano}`),
  salvarOrcamento: (body) => API.request('/orcamentos', { method: 'POST', body: JSON.stringify(body) }),
  excluirOrcamento: (id) => API.request(`/orcamentos/${id}`, { method: 'DELETE' }),

  // Metas
  listarMetas: () => API.request('/metas'),
  criarMeta: (body) => API.request('/metas', { method: 'POST', body: JSON.stringify(body) }),
  registrarAporte: (id, body) => API.request(`/metas/${id}/aportes`, { method: 'POST', body: JSON.stringify(body) }),
  cancelarMeta: (id) => API.request(`/metas/${id}`, { method: 'DELETE' }),

  // Perfil
  obterPerfil: () => API.request('/usuarios/perfil'),
  atualizarPerfil: (body) => API.request('/usuarios/perfil', { method: 'PUT', body: JSON.stringify(body) }),
  listarClientes: () => API.request('/usuarios/clientes'),
  criarCliente: (body) => API.request('/usuarios/clientes', { method: 'POST', body: JSON.stringify(body) }),
  listarFornecedores: () => API.request('/usuarios/fornecedores'),
  criarFornecedor: (body) => API.request('/usuarios/fornecedores', { method: 'POST', body: JSON.stringify(body) }),
  listarServicos: () => API.request('/usuarios/servicos'),
  criarServico: (body) => API.request('/usuarios/servicos', { method: 'POST', body: JSON.stringify(body) }),
  atualizarCliente: (id, body) => API.request(`/usuarios/clientes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  atualizarFornecedor: (id, body) => API.request(`/usuarios/fornecedores/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  atualizarServico: (id, body) => API.request(`/usuarios/servicos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Renda prevista
  listarRendasPrevistas: () => API.request('/rendas-previstas'),
  criarRendaPrevista: (body) => API.request('/rendas-previstas', { method: 'POST', body: JSON.stringify(body) }),
  atualizarRendaPrevista: (id, body) => API.request(`/rendas-previstas/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  atualizarAgenda: (id, body) => API.request(`/agenda/${id}`, { method: 'PUT', body: JSON.stringify(body) })
};

window.API = API;
