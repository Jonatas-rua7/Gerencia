// ==================== CONFIGURAÇÃO GLOBAL ====================
let graficoFluxo = null;
let graficoCategorias = null;
let graficoEvolucao = null;
let graficoGastosCategoria = null;
let graficoComparativo = null;

const STORAGE_KEY = 'gerencia_local_v3';
const SESSION_KEY = 'gerencia_usuario_id';
const PAGINAS_PUBLICAS = ['login.html', 'cadastro.html'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
let lancamentosRelatorioAtual = [];

// ==================== CATEGORIAS POR TIPO DE CONTA ====================
const CATEGORIAS_PF = {
    entrada: [
        { id: 'pf_ent_salario', nome: 'Salario', cor: '#10B981' },
        { id: 'pf_ent_freelance', nome: 'Freelance', cor: '#22C55E' },
        { id: 'pf_ent_investimentos', nome: 'Investimentos', cor: '#059669' },
        { id: 'pf_ent_presente', nome: 'Presente', cor: '#3B82F6' },
        { id: 'pf_ent_outros', nome: 'Outras Entradas', cor: '#6B7280' }
    ],
    saida: [
        { id: 'pf_sai_moradia', nome: 'Moradia', cor: '#EF4444' },
        { id: 'pf_sai_alimentacao', nome: 'Alimentacao', cor: '#F97316' },
        { id: 'pf_sai_transporte', nome: 'Transporte', cor: '#F59E0B' },
        { id: 'pf_sai_saude', nome: 'Saude', cor: '#EC4899' },
        { id: 'pf_sai_educacao', nome: 'Educacao', cor: '#8B5CF6' },
        { id: 'pf_sai_lazer', nome: 'Lazer', cor: '#6366F1' },
        { id: 'pf_sai_vestuario', nome: 'Vestuario', cor: '#14B8A6' },
        { id: 'pf_sai_outros', nome: 'Outras Saidas', cor: '#6B7280' }
    ]
};

const CATEGORIAS_PJ = {
    entrada: [
        { id: 'pj_ent_receita_operacional', nome: 'Receita Operacional', cor: '#10B981' },
        { id: 'pj_ent_receita_servicos', nome: 'Venda de Servicos', cor: '#22C55E' },
        { id: 'pj_ent_receita_produtos', nome: 'Venda de Produtos', cor: '#059669' },
        { id: 'pj_ent_receita_financeira', nome: 'Receita Financeira', cor: '#3B82F6' },
        { id: 'pj_ent_outras_receitas', nome: 'Outras Receitas', cor: '#6B7280' }
    ],
    saida: [
        { id: 'pj_sai_custo_mercadoria', nome: 'CMV - Custo Mercadoria', cor: '#EF4444' },
        { id: 'pj_sai_folha_pagamento', nome: 'Folha de Pagamento', cor: '#F97316' },
        { id: 'pj_sai_impostos', nome: 'Impostos e Taxas', cor: '#F59E0B' },
        { id: 'pj_sai_aluguel', nome: 'Aluguel', cor: '#EC4899' },
        { id: 'pj_sai_energia', nome: 'Energia Eletrica', cor: '#8B5CF6' },
        { id: 'pj_sai_agua', nome: 'Agua e Esgoto', cor: '#6366F1' },
        { id: 'pj_sai_internet', nome: 'Internet e Telefone', cor: '#14B8A6' },
        { id: 'pj_sai_marketing', nome: 'Marketing e Propaganda', cor: '#D946EF' },
        { id: 'pj_sai_manutencao', nome: 'Manutencao', cor: '#F43F5E' },
        { id: 'pj_sai_materiais', nome: 'Materiais de Escritorio', cor: '#0EA5E9' },
        { id: 'pj_sai_viagens', nome: 'Viagens e Refeicoes', cor: '#84CC16' },
        { id: 'pj_sai_despesas_bancarias', nome: 'Despesas Bancarias', cor: '#A855F7' },
        { id: 'pj_sai_outros_custos', nome: 'Outros Custos', cor: '#6B7280' }
    ]
};

// ==================== UTILITÁRIOS ====================
function paginaAtual() {
    const pagina = window.location.pathname.split('/').pop();
    return (pagina || 'index.html').toLowerCase();
}

function gerarId(prefixo = 'id') {
    return `${prefixo}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function limparNumeros(valor) {
    return String(valor || '').replace(/\D/g, '');
}

function parseNumero(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(parseNumero(valor));
}

function formatarData(dataIso) {
    if (!dataIso) return '-';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
}

function dataParaISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function criarDataLocal(dataIso) {
    if (!dataIso) return null;
    const [ano, mes, dia] = dataIso.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
}

function escaparHtml(texto) {
    const mapa = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return String(texto ?? '').replace(/[&<>"']/g, (c) => mapa[c]);
}

function mostrarAlerta(alertaId, mensagem, tipo = 'error') {
    const alerta = document.getElementById(alertaId);
    if (!alerta) {
        alert(mensagem);
        return;
    }
    alerta.textContent = mensagem;
    alerta.className = `alert ${tipo === 'success' ? 'alert-success' : 'alert-error'}`;
    alerta.style.display = 'block';
}

function esconderAlerta(alertaId) {
    const alerta = document.getElementById(alertaId);
    if (alerta) alerta.style.display = 'none';
}

// ==================== BANCO DE DADOS LOCAL ====================
function getCategoriasPorTipoUsuario(tipoUsuario) {
    if (tipoUsuario === 'PJ') return CATEGORIAS_PJ;
    return CATEGORIAS_PF;
}

function getCategoriasFlat(tipoUsuario) {
    const categoriasTipo = getCategoriasPorTipoUsuario(tipoUsuario);
    return [
        ...categoriasTipo.entrada.map(c => ({ ...c, tipo: 'entrada' })),
        ...categoriasTipo.saida.map(c => ({ ...c, tipo: 'saida' }))
    ];
}

function garantirEstruturaBanco(db) {
    const base = db && typeof db === 'object' ? db : {};
    return {
        usuarios: Array.isArray(base.usuarios) ? base.usuarios : [],
        contas: Array.isArray(base.contas) ? base.contas : [],
        categorias: Array.isArray(base.categorias) ? base.categorias : [],
        lancamentos: Array.isArray(base.lancamentos) ? base.lancamentos : []
    };
}

function salvarBanco(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function carregarBanco() {
    let db = {};
    try {
        const bruto = localStorage.getItem(STORAGE_KEY);
        db = bruto ? JSON.parse(bruto) : {};
    } catch (erro) {
        db = {};
    }
    return garantirEstruturaBanco(db);
}

function obterUsuarioIdSessao() {
    return sessionStorage.getItem(SESSION_KEY);
}

function definirUsuarioSessao(usuarioId) {
    sessionStorage.setItem(SESSION_KEY, usuarioId);
}

function limparSessao() {
    sessionStorage.removeItem(SESSION_KEY);
}

function logout() {
    limparSessao();
    window.location.href = 'login.html';
    return true;
}

function obterUsuarioAtual(db = carregarBanco()) {
    const usuarioId = obterUsuarioIdSessao();
    if (!usuarioId) return null;
    return db.usuarios.find((usuario) => usuario.id === usuarioId) || null;
}

function obterCategoriasUsuario(usuario, db = carregarBanco()) {
    if (!usuario) return [];
    const categoriasDoUsuario = db.categorias.filter(c => c.usuarioId === usuario.id);
    if (categoriasDoUsuario.length > 0) return categoriasDoUsuario;
    
    const categoriasPadrao = getCategoriasFlat(usuario.tipo);
    const novasCategorias = categoriasPadrao.map(cat => ({
        id: gerarId('cat'),
        usuarioId: usuario.id,
        nome: cat.nome,
        tipo: cat.tipo,
        cor: cat.cor
    }));
    
    db.categorias.push(...novasCategorias);
    salvarBanco(db);
    return novasCategorias;
}

function obterCategoriasPorTipo(tipo, usuario, db = carregarBanco()) {
    const categorias = obterCategoriasUsuario(usuario, db);
    return categorias.filter((categoria) => categoria.tipo === tipo);
}

function obterContasUsuario(usuarioId, db = carregarBanco()) {
    return db.contas.filter((conta) => conta.usuarioId === usuarioId);
}

function obterLancamentosUsuario(usuarioId, db = carregarBanco()) {
    return db.lancamentos.filter((lancamento) => lancamento.usuarioId === usuarioId);
}

function mapaPorId(lista) {
    const mapa = {};
    lista.forEach((item) => { mapa[item.id] = item; });
    return mapa;
}

function compararLancamentosDesc(a, b) {
    return (b.data || '').localeCompare(a.data || '');
}

function garantirContaPadrao(usuarioId, db) {
    const existeConta = db.contas.some((conta) => conta.usuarioId === usuarioId);
    if (!existeConta) {
        db.contas.push({
            id: gerarId('conta'),
            usuarioId,
            nome: 'Conta Principal',
            saldoInicial: 0
        });
        salvarBanco(db);
    }
}

// ==================== VALIDAÇÕES PF/PJ ====================
function validarCPF(cpf) {
    const valor = limparNumeros(cpf);
    if (valor.length !== 11 || /^(\d)\1{10}$/.test(valor)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += Number(valor[i]) * (10 - i);
    let digito = 11 - (soma % 11);
    if (digito > 9) digito = 0;
    if (digito !== Number(valor[9])) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += Number(valor[i]) * (11 - i);
    digito = 11 - (soma % 11);
    if (digito > 9) digito = 0;
    return digito === Number(valor[10]);
}

function validarCNPJ(cnpj) {
    const valor = limparNumeros(cnpj);
    if (valor.length !== 14 || /^(\d)\1{13}$/.test(valor)) return false;

    const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const calcularDigito = (numeros, pesos) => {
        const soma = numeros.split('').reduce((acc, num, idx) => acc + Number(num) * pesos[idx], 0);
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    const base = valor.slice(0, 12);
    const digito1 = calcularDigito(base, pesos1);
    const digito2 = calcularDigito(`${base}${digito1}`, pesos2);
    return `${digito1}${digito2}` === valor.slice(12);
}

function mascararCPF(valor) {
    const numeros = limparNumeros(valor).slice(0, 11);
    return numeros
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function mascararCNPJ(valor) {
    const numeros = limparNumeros(valor).slice(0, 14);
    return numeros
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

function aplicarMascara(campo) {
    if (!campo) return;
    if (campo.id === 'cpf') campo.value = mascararCPF(campo.value);
    if (campo.id === 'cnpj') campo.value = mascararCNPJ(campo.value);
}

function alternarTipoPessoa() {
    const tipo = document.querySelector('input[name="tipo"]:checked')?.value || 'PF';
    const pfFields = document.getElementById('pfFields');
    const pjFields = document.getElementById('pjFields');
    const cpf = document.getElementById('cpf');
    const cnpj = document.getElementById('cnpj');
    const razao = document.getElementById('razao_social');
    const nomeFantasia = document.getElementById('nome_fantasia');
    const ie = document.getElementById('inscricao_estadual');

    if (pfFields) pfFields.style.display = tipo === 'PF' ? 'block' : 'none';
    if (pjFields) pjFields.style.display = tipo === 'PJ' ? 'block' : 'none';
    if (cpf) cpf.required = tipo === 'PF';
    if (cnpj) cnpj.required = tipo === 'PJ';
    if (razao) razao.required = tipo === 'PJ';
    if (nomeFantasia) nomeFantasia.required = tipo === 'PJ';
    if (ie) ie.required = tipo === 'PJ';
}

// ==================== MÉTRICAS ESPECÍFICAS POR TIPO ====================
function calcularMetricasUsuario(usuario, lancamentos) {
    const entradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((s, l) => s + parseNumero(l.valor), 0);
    const saidas = lancamentos.filter(l => l.tipo === 'saida').reduce((s, l) => s + parseNumero(l.valor), 0);
    const saldo = entradas - saidas;
    const margemLucro = entradas > 0 ? (saldo / entradas) * 100 : 0;

    if (usuario?.tipo === 'PJ') {
        return { entradas, saidas, saldo, margemLucro, lucroLiquido: saldo };
    }
    return { entradas, saidas, saldo, margemLucro: 0, lucroLiquido: 0 };
}

function calcularCustosOperacionais(lancamentos) {
    const categoriasCusto = [
        'pj_sai_custo_mercadoria', 'pj_sai_folha_pagamento', 'pj_sai_aluguel',
        'pj_sai_energia', 'pj_sai_agua', 'pj_sai_internet'
    ];
    return lancamentos
        .filter(l => l.tipo === 'saida' && categoriasCusto.includes(l.categoriaId))
        .reduce((s, l) => s + parseNumero(l.valor), 0);
}

// ==================== LOGIN E CADASTRO ====================
function inicializarLogin() {
    const form = document.getElementById('formLogin');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        esconderAlerta('alertaLogin');

        const email = (document.getElementById('email')?.value || '').trim().toLowerCase();
        const senha = document.getElementById('senha')?.value || '';

        if (!email || !senha) {
            mostrarAlerta('alertaLogin', 'Informe e-mail e senha.');
            return;
        }

        const db = carregarBanco();
        const usuario = db.usuarios.find((item) => item.email.toLowerCase() === email && item.senha === senha);

        if (!usuario) {
            mostrarAlerta('alertaLogin', 'E-mail ou senha invalidos.');
            return;
        }

        definirUsuarioSessao(usuario.id);
        window.location.href = 'index.html';
    });
}

function inicializarCadastro() {
    const form = document.getElementById('formCadastro');
    if (!form) return;

    alternarTipoPessoa();

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        esconderAlerta('alerta');

        const nome = (document.getElementById('nome')?.value || '').trim();
        const email = (document.getElementById('email')?.value || '').trim().toLowerCase();
        const senha = document.getElementById('senha')?.value || '';
        const confirmarSenha = document.getElementById('confirmar_senha')?.value || '';
        const tipo = document.querySelector('input[name="tipo"]:checked')?.value || 'PF';
        const cpf = document.getElementById('cpf')?.value || '';
        const cnpj = document.getElementById('cnpj')?.value || '';
        const razaoSocial = (document.getElementById('razao_social')?.value || '').trim();
        const nomeFantasia = (document.getElementById('nome_fantasia')?.value || '').trim();
        const inscricaoEstadual = (document.getElementById('inscricao_estadual')?.value || '').trim();

        if (nome.length < 3) {
            mostrarAlerta('alerta', 'Informe o nome completo (minimo 3 caracteres).');
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            mostrarAlerta('alerta', 'Informe um e-mail valido.');
            return;
        }

        if (senha.length < 6) {
            mostrarAlerta('alerta', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (senha !== confirmarSenha) {
            mostrarAlerta('alerta', 'As senhas nao conferem.');
            return;
        }

        if (tipo === 'PF' && !validarCPF(cpf)) {
            mostrarAlerta('alerta', 'CPF invalido.');
            return;
        }

        if (tipo === 'PJ') {
            if (!validarCNPJ(cnpj)) {
                mostrarAlerta('alerta', 'CNPJ invalido.');
                return;
            }
            if (razaoSocial.length < 3) {
                mostrarAlerta('alerta', 'Informe a razao social.');
                return;
            }
            if (nomeFantasia.length < 2) {
                mostrarAlerta('alerta', 'Informe o nome fantasia.');
                return;
            }
        }

        const db = carregarBanco();
        const emailJaExiste = db.usuarios.some((usuario) => usuario.email.toLowerCase() === email);
        if (emailJaExiste) {
            mostrarAlerta('alerta', 'Ja existe uma conta com este e-mail.');
            return;
        }

        const novoUsuario = {
            id: gerarId('usr'),
            nome,
            email,
            senha,
            tipo,
            cpf: tipo === 'PF' ? limparNumeros(cpf) : '',
            cnpj: tipo === 'PJ' ? limparNumeros(cnpj) : '',
            razaoSocial: tipo === 'PJ' ? razaoSocial : '',
            nomeFantasia: tipo === 'PJ' ? nomeFantasia : '',
            inscricaoEstadual: tipo === 'PJ' ? inscricaoEstadual : '',
            criadoEm: new Date().toISOString()
        };

        db.usuarios.push(novoUsuario);
        db.contas.push({
            id: gerarId('conta'),
            usuarioId: novoUsuario.id,
            nome: tipo === 'PJ' ? 'Conta Empresarial' : 'Conta Pessoal',
            saldoInicial: 0
        });
        
        salvarBanco(db);

        mostrarAlerta('alerta', 'Conta criada com sucesso! Redirecionando...', 'success');
        definirUsuarioSessao(novoUsuario.id);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 700);
    });
}

// ==================== LANÇAMENTOS ====================
function abrirModalLancamento() {
    const modal = document.getElementById('modalLancamento');
    if (!modal) return;
    modal.style.display = 'flex';
    carregarCategorias();
    carregarContas();

    const campoData = document.getElementById('lancamentoData');
    if (campoData && !campoData.value) campoData.value = dataParaISO(new Date());
}

function fecharModalLancamento() {
    const modal = document.getElementById('modalLancamento');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('formLancamento');
    if (form) form.reset();
}

function carregarCategorias() {
    const select = document.getElementById('lancamentoCategoria');
    if (!select) return;

    const usuario = obterUsuarioAtual();
    if (!usuario) return;

    const tipo = document.getElementById('lancamentoTipo')?.value || 'entrada';
    const categorias = obterCategoriasPorTipo(tipo, usuario);

    select.innerHTML = '<option value="">Selecione uma categoria</option>';
    categorias.forEach((categoria) => {
        select.innerHTML += `<option value="${categoria.id}" style="background:${categoria.cor}20">${escaparHtml(categoria.nome)}</option>`;
    });
}

function atualizarCategorias() {
    carregarCategorias();
}

function carregarContas() {
    const select = document.getElementById('lancamentoConta');
    if (!select) return;

    const db = carregarBanco();
    const usuarioId = obterUsuarioIdSessao();
    if (!usuarioId) return;

    const contas = obterContasUsuario(usuarioId, db);
    select.innerHTML = '<option value="">Selecione uma conta</option>';
    contas.forEach((conta) => {
        select.innerHTML += `<option value="${conta.id}">${escaparHtml(conta.nome)}</option>`;
    });
}

function carregarFiltrosCategorias() {
    const select = document.getElementById('filtroCategoria');
    if (!select) return;

    const usuario = obterUsuarioAtual();
    if (!usuario) return;

    const db = carregarBanco();
    const categorias = obterCategoriasUsuario(usuario, db);
    
    select.innerHTML = '<option value="todas">Todas</option>';
    categorias.forEach((categoria) => {
        select.innerHTML += `<option value="${categoria.id}">${escaparHtml(categoria.nome)}</option>`;
    });
}

function salvarLancamento(event) {
    event.preventDefault();
    const usuarioId = obterUsuarioIdSessao();
    if (!usuarioId) {
        window.location.href = 'login.html';
        return;
    }

    const tipo = document.getElementById('lancamentoTipo')?.value || 'entrada';
    const descricao = (document.getElementById('lancamentoDescricao')?.value || '').trim();
    const valor = parseNumero(document.getElementById('lancamentoValor')?.value);
    const data = document.getElementById('lancamentoData')?.value || '';
    const categoriaId = document.getElementById('lancamentoCategoria')?.value || '';
    const contaId = document.getElementById('lancamentoConta')?.value || '';
    const observacao = (document.getElementById('lancamentoObs')?.value || '').trim();

    if (!descricao || !valor || valor <= 0 || !data || !categoriaId || !contaId) {
        alert('Preencha todos os campos obrigatorios do lancamento.');
        return;
    }

    const db = carregarBanco();
    db.lancamentos.push({
        id: gerarId('lan'),
        usuarioId,
        tipo,
        descricao,
        valor,
        data,
        categoriaId,
        contaId,
        observacao,
        criadoEm: new Date().toISOString()
    });
    salvarBanco(db);

    fecharModalLancamento();
    carregarLancamentos();
    alert('Lancamento salvo com sucesso!');
}

function carregarLancamentos() {
    const tabela = document.getElementById('tabelaLancamentos');
    if (!tabela) return;

    const db = carregarBanco();
    const usuarioId = obterUsuarioIdSessao();
    if (!usuarioId) return;

    const usuario = obterUsuarioAtual(db);
    if (!usuario) return;

    const filtroTipo = document.getElementById('filtroTipo')?.value || 'todos';
    const filtroCategoria = document.getElementById('filtroCategoria')?.value || 'todas';
    const filtroDataInicio = document.getElementById('filtroDataInicio')?.value || '';
    const filtroDataFim = document.getElementById('filtroDataFim')?.value || '';

    const categoriasMap = mapaPorId(obterCategoriasUsuario(usuario, db));
    const contasMap = mapaPorId(obterContasUsuario(usuarioId, db));

    let lancamentos = obterLancamentosUsuario(usuarioId, db);
    if (filtroTipo !== 'todos') lancamentos = lancamentos.filter(l => l.tipo === filtroTipo);
    if (filtroCategoria !== 'todas') lancamentos = lancamentos.filter(l => l.categoriaId === filtroCategoria);
    if (filtroDataInicio) lancamentos = lancamentos.filter(l => l.data >= filtroDataInicio);
    if (filtroDataFim) lancamentos = lancamentos.filter(l => l.data <= filtroDataFim);

    lancamentos.sort(compararLancamentosDesc);

    if (lancamentos.length === 0) {
        tabela.innerHTML = '<tr class="placeholder-row"><td colspan="6">Nenhum lancamento encontrado</td></tr>';
        return;
    }

    tabela.innerHTML = lancamentos.map((lancamento) => {
        const categoria = categoriasMap[lancamento.categoriaId];
        const conta = contasMap[lancamento.contaId];
        const classeValor = lancamento.tipo === 'entrada' ? 'entrada' : 'saida';
        const sinal = lancamento.tipo === 'entrada' ? '+' : '-';
        const corCategoria = categoria?.cor || '#6B7280';

        return `
            <tr>
                <td>${formatarData(lancamento.data)}</td>
                <td>${escaparHtml(lancamento.descricao)}</td>
                <td><span style="background: ${corCategoria}20; color: ${corCategoria}; padding: 4px 8px; border-radius: 8px;">${escaparHtml(categoria?.nome || 'Sem categoria')}</span></td>
                <td>${escaparHtml(conta?.nome || 'Conta removida')}</td>
                <td class="${classeValor}">${sinal}${formatarMoeda(lancamento.valor)}</td>
                <td><button onclick="excluirLancamento('${lancamento.id}')" class="btn-icon">Excluir</button></td>
            </tr>
        `;
    }).join('');
}

function excluirLancamento(id) {
    const usuarioId = obterUsuarioIdSessao();
    if (!usuarioId) return;

    if (!confirm('Tem certeza que deseja excluir este lancamento?')) return;

    const db = carregarBanco();
    db.lancamentos = db.lancamentos.filter(l => !(l.id === id && l.usuarioId === usuarioId));
    salvarBanco(db);

    carregarLancamentos();
    alert('Lancamento excluido com sucesso.');
}

function aplicarFiltros() {
    carregarLancamentos();
}

// ==================== DASHBOARD ====================
function calcularSaldoContas(contas, lancamentos) {
    const totaisPorConta = {};
    lancamentos.forEach((lancamento) => {
        const fator = lancamento.tipo === 'entrada' ? 1 : -1;
        totaisPorConta[lancamento.contaId] = (totaisPorConta[lancamento.contaId] || 0) + fator * parseNumero(lancamento.valor);
    });

    return contas.reduce((acc, conta) => {
        return acc + parseNumero(conta.saldoInicial) + (totaisPorConta[conta.id] || 0);
    }, 0);
}

function montarUltimosMeses(quantidade = 6) {
    const meses = [];
    const hoje = new Date();
    for (let i = quantidade - 1; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        meses.push({
            chave: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`,
            label: `${MESES[data.getMonth()]}/${String(data.getFullYear()).slice(-2)}`
        });
    }
    return meses;
}

function carregarDashboard() {
    const db = carregarBanco();
    const usuarioId = obterUsuarioIdSessao();
    if (!usuarioId) return;

    const usuario = obterUsuarioAtual(db);
    if (!usuario) return;

    const contas = obterContasUsuario(usuarioId, db);
    const lancamentos = obterLancamentosUsuario(usuarioId, db);
    const categoriasMap = mapaPorId(obterCategoriasUsuario(usuario, db));
    const metricas = calcularMetricasUsuario(usuario, lancamentos);
    const custosOperacionais = usuario.tipo === 'PJ' ? calcularCustosOperacionais(lancamentos) : 0;

    const saldoTotalEl = document.getElementById('saldoTotal');
    const totalEntradasEl = document.getElementById('totalEntradas');
    const totalSaidasEl = document.getElementById('totalSaidas');
    const totalContasEl = document.getElementById('totalContas');
    const margemLucroEl = document.getElementById('margemLucro');
    const lucroLiquidoEl = document.getElementById('lucroLiquido');
    const custosOperacionaisEl = document.getElementById('custosOperacionais');
    const tipoContaEl = document.getElementById('tipoContaBadge');

    if (saldoTotalEl) saldoTotalEl.textContent = formatarMoeda(metricas.saldo);
    if (totalEntradasEl) totalEntradasEl.textContent = formatarMoeda(metricas.entradas);
    if (totalSaidasEl) totalSaidasEl.textContent = formatarMoeda(metricas.saidas);
    if (totalContasEl) totalContasEl.textContent = String(contas.length);
    
    if (usuario.tipo === 'PJ') {
        if (margemLucroEl) {
            margemLucroEl.style.display = 'flex';
            margemLucroEl.querySelector('.stat-value').textContent = metricas.margemLucro.toFixed(2) + '%';
            const margemClass = metricas.margemLucro >= 20 ? 'positive' : (metricas.margemLucro >= 10 ? 'warning' : 'negative');
            margemLucroEl.querySelector('.stat-value').className = `stat-value ${margemClass}`;
        }
        if (lucroLiquidoEl) {
            lucroLiquidoEl.style.display = 'flex';
            lucroLiquidoEl.querySelector('.stat-value').textContent = formatarMoeda(metricas.lucroLiquido);
        }
        if (custosOperacionaisEl) {
            custosOperacionaisEl.style.display = 'flex';
            custosOperacionaisEl.querySelector('.stat-value').textContent = formatarMoeda(custosOperacionais);
        }
        if (tipoContaEl) {
            tipoContaEl.textContent = 'Pessoa Juridica';
            tipoContaEl.className = 'badge badge-pj';
        }
    } else {
        if (margemLucroEl) margemLucroEl.style.display = 'none';
        if (lucroLiquidoEl) lucroLiquidoEl.style.display = 'none';
        if (custosOperacionaisEl) custosOperacionaisEl.style.display = 'none';
        if (tipoContaEl) {
            tipoContaEl.textContent = 'Pessoa Fisica';
            tipoContaEl.className = 'badge badge-pf';
        }
    }

    const ultimasMovimentacoes = document.getElementById('ultimasMovimentacoes');
    if (ultimasMovimentacoes) {
        const itens = [...lancamentos].sort(compararLancamentosDesc).slice(0, 8);
        if (itens.length === 0) {
            ultimasMovimentacoes.innerHTML = '<tr class="placeholder-row"><td colspan="4">Nenhuma movimentacao cadastrada</td></tr>';
        } else {
            ultimasMovimentacoes.innerHTML = itens.map((item) => {
                const categoria = categoriasMap[item.categoriaId];
                const classeValor = item.tipo === 'entrada' ? 'entrada' : 'saida';
                const sinal = item.tipo === 'entrada' ? '+' : '-';
                return `
                    <tr>
                        <td>${formatarData(item.data)}</td>
                        <td>${escaparHtml(item.descricao)}</td>
                        <td>${escaparHtml(categoria?.nome || 'Sem categoria')}</td>
                        <td class="${classeValor}">${sinal}${formatarMoeda(item.valor)}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    renderizarGraficoFluxo(lancamentos);
    renderizarGraficoCategorias(lancamentos, categoriasMap);
}

function renderizarGraficoFluxo(lancamentos) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('graficoFluxo');
    if (!canvas) return;

    const meses = montarUltimosMeses(6);
    const entradasPorMes = {};
    const saidasPorMes = {};

    lancamentos.forEach((lancamento) => {
        const chaveMes = lancamento.data.slice(0, 7);
        entradasPorMes[chaveMes] = (entradasPorMes[chaveMes] || 0) + (lancamento.tipo === 'entrada' ? parseNumero(lancamento.valor) : 0);
        saidasPorMes[chaveMes] = (saidasPorMes[chaveMes] || 0) + (lancamento.tipo === 'saida' ? parseNumero(lancamento.valor) : 0);
    });

    const labels = meses.map(m => m.label);
    const entradas = meses.map(m => entradasPorMes[m.chave] || 0);
    const saidas = meses.map(m => saidasPorMes[m.chave] || 0);

    if (graficoFluxo) graficoFluxo.destroy();
    graficoFluxo = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Entradas', data: entradas, backgroundColor: '#10B981' },
                { label: 'Saidas', data: saidas, backgroundColor: '#EF4444' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function renderizarGraficoCategorias(lancamentos, categoriasMap) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('graficoCategorias');
    if (!canvas) return;

    const totais = {};
    lancamentos.filter(l => l.tipo === 'saida').forEach(l => {
        totais[l.categoriaId] = (totais[l.categoriaId] || 0) + parseNumero(l.valor);
    });

    const topCategorias = Object.entries(totais).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const labels = topCategorias.map(([id]) => categoriasMap[id]?.nome || 'Sem categoria');
    const data = topCategorias.map(([, v]) => v);
    const cores = topCategorias.map(([id]) => categoriasMap[id]?.cor || '#6B7280');

    if (graficoCategorias) graficoCategorias.destroy();
    graficoCategorias = new Chart(canvas.getContext('2d'), {
        type: 'pie',
        data: {
            labels: labels.length ? labels : ['Sem dados'],
            datasets: [{ data: data.length ? data : [1], backgroundColor: cores.length ? cores : ['#D1D5DB'] }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

// ==================== RELATÓRIOS ====================
function mudarPeriodo() {
    const periodo = document.getElementById('periodoRelatorio')?.value || 'mes';
    const dataInicioGroup = document.getElementById('dataInicioGroup');
    const dataFimGroup = document.getElementById('dataFimGroup');
    const mostrar = periodo === 'custom';
    if (dataInicioGroup) dataInicioGroup.style.display = mostrar ? 'block' : 'none';
    if (dataFimGroup) dataFimGroup.style.display = mostrar ? 'block' : 'none';
}

function obterIntervaloRelatorio() {
    const periodo = document.getElementById('periodoRelatorio')?.value || 'mes';
    const hoje = new Date();
    let inicio, fim;

    if (periodo === 'mes') {
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = hoje;
    } else if (periodo === 'trimestre') {
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
        fim = hoje;
    } else if (periodo === 'ano') {
        inicio = new Date(hoje.getFullYear(), 0, 1);
        fim = hoje;
    } else {
        const inicioInput = document.getElementById('relatorioDataInicio')?.value || '';
        const fimInput = document.getElementById('relatorioDataFim')?.value || '';
        if (!inicioInput || !fimInput) return null;
        inicio = criarDataLocal(inicioInput);
        fim = criarDataLocal(fimInput);
        if (!inicio || !fim || inicio > fim) return null;
    }
    return { inicioIso: dataParaISO(inicio), fimIso: dataParaISO(fim) };
}

function listarMesesNoIntervalo(inicioIso, fimIso) {
    const inicio = criarDataLocal(inicioIso);
    const fim = criarDataLocal(fimIso);
    if (!inicio || !fim) return [];
    const meses = [];
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const limite = new Date(fim.getFullYear(), fim.getMonth(), 1);
    while (cursor <= limite) {
        meses.push({
            chave: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
            label: `${MESES[cursor.getMonth()]}/${String(cursor.getFullYear()).slice(-2)}`
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return meses;
}

function atualizarRelatorios() {
    const intervalo = obterIntervaloRelatorio();
    if (!intervalo) return;

    const db = carregarBanco();
    const usuarioId = obterUsuarioIdSessao();
    if (!usuarioId) return;

    const usuario = obterUsuarioAtual(db);
    if (!usuario) return;

    const categoriasMap = mapaPorId(obterCategoriasUsuario(usuario, db));
    const lancamentos = obterLancamentosUsuario(usuarioId, db)
        .filter(l => l.data >= intervalo.inicioIso && l.data <= intervalo.fimIso);
    
    lancamentosRelatorioAtual = lancamentos;

    const metricas = calcularMetricasUsuario(usuario, lancamentos);
    const mesesCount = listarMesesNoIntervalo(intervalo.inicioIso, intervalo.fimIso).length || 1;
    const mediaGastos = metricas.saidas / mesesCount;

    const relTotalEntradas = document.getElementById('relTotalEntradas');
    const relTotalSaidas = document.getElementById('relTotalSaidas');
    const relSaldoPeriodo = document.getElementById('relSaldoPeriodo');
    const relMediaGastos = document.getElementById('relMediaGastos');

    if (relTotalEntradas) relTotalEntradas.textContent = formatarMoeda(metricas.entradas);
    if (relTotalSaidas) relTotalSaidas.textContent = formatarMoeda(metricas.saidas);
    if (relSaldoPeriodo) {
        relSaldoPeriodo.textContent = formatarMoeda(metricas.saldo);
        relSaldoPeriodo.className = `stat-value ${metricas.saldo >= 0 ? 'positive' : 'negative'}`;
    }
    if (relMediaGastos) relMediaGastos.textContent = formatarMoeda(mediaGastos);

    renderizarGraficoEvolucao(lancamentos, intervalo);
    renderizarGraficoGastosCategoria(lancamentos, categoriasMap);
    renderizarGraficoComparativoMensal(lancamentos, intervalo);

    const topDespesas = document.getElementById('topDespesas');
    if (topDespesas) {
        const despesas = lancamentos.filter(l => l.tipo === 'saida').sort((a, b) => b.valor - a.valor).slice(0, 5);
        if (despesas.length === 0) {
            topDespesas.innerHTML = '<tr class="placeholder-row"><td colspan="4">Nenhuma despesa no periodo</td></tr>';
        } else {
            topDespesas.innerHTML = despesas.map(d => `
                <tr>
                    <td>${formatarData(d.data)}</td>
                    <td>${escaparHtml(d.descricao)}</td>
                    <td>${escaparHtml(categoriasMap[d.categoriaId]?.nome || 'Sem categoria')}</td>
                    <td class="saida">${formatarMoeda(d.valor)}</td>
                </tr>
            `).join('');
        }
    }
}

function renderizarGraficoEvolucao(lancamentos, intervalo) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('graficoEvolucao');
    if (!canvas) return;

    const meses = listarMesesNoIntervalo(intervalo.inicioIso, intervalo.fimIso);
    const saldoMes = {};
    lancamentos.forEach(l => {
        const chave = l.data.slice(0, 7);
        saldoMes[chave] = (saldoMes[chave] || 0) + (l.tipo === 'entrada' ? l.valor : -l.valor);
    });

    let acumulado = 0;
    const pontos = meses.map(m => { acumulado += saldoMes[m.chave] || 0; return acumulado; });

    if (graficoEvolucao) graficoEvolucao.destroy();
    graficoEvolucao = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: meses.map(m => m.label),
            datasets: [{
                label: 'Saldo Acumulado',
                data: pontos,
                borderColor: '#6B21A5',
                backgroundColor: 'rgba(107, 33, 165, 0.12)',
                fill: true,
                tension: 0.35
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function renderizarGraficoGastosCategoria(lancamentos, categoriasMap) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('graficoGastosCategoria');
    if (!canvas) return;

    const totais = {};
    lancamentos.filter(l => l.tipo === 'saida').forEach(l => {
        totais[l.categoriaId] = (totais[l.categoriaId] || 0) + l.valor;
    });

    const top = Object.entries(totais).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const labels = top.map(([id]) => categoriasMap[id]?.nome || 'Sem categoria');
    const data = top.map(([, v]) => v);
    const cores = top.map(([id]) => categoriasMap[id]?.cor || '#6B7280');

    if (graficoGastosCategoria) graficoGastosCategoria.destroy();
    graficoGastosCategoria = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['Sem dados'],
            datasets: [{ data: data.length ? data : [1], backgroundColor: cores.length ? cores : ['#D1D5DB'] }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function renderizarGraficoComparativoMensal(lancamentos, intervalo) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('graficoComparativo');
    if (!canvas) return;

    const meses = listarMesesNoIntervalo(intervalo.inicioIso, intervalo.fimIso);
    const entradas = {}, saidas = {};
    lancamentos.forEach(l => {
        const chave = l.data.slice(0, 7);
        if (l.tipo === 'entrada') entradas[chave] = (entradas[chave] || 0) + l.valor;
        else saidas[chave] = (saidas[chave] || 0) + l.valor;
    });

    if (graficoComparativo) graficoComparativo.destroy();
    graficoComparativo = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: meses.map(m => m.label),
            datasets: [
                { label: 'Entradas', data: meses.map(m => entradas[m.chave] || 0), backgroundColor: '#10B981' },
                { label: 'Saidas', data: meses.map(m => saidas[m.chave] || 0), backgroundColor: '#EF4444' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function exportarRelatorio() {
    if (!lancamentosRelatorioAtual.length) {
        alert('Nao ha dados para exportar no periodo selecionado.');
        return;
    }

    const db = carregarBanco();
    const usuarioId = obterUsuarioIdSessao();
    if (!usuarioId) return;

    const usuario = obterUsuarioAtual(db);
    if (!usuario) return;

    const categoriasMap = mapaPorId(obterCategoriasUsuario(usuario, db));
    const contasMap = mapaPorId(obterContasUsuario(usuarioId, db));

    const cabecalho = ['Data', 'Tipo', 'Descricao', 'Categoria', 'Conta', 'Valor', 'Observacao'];
    const linhas = [cabecalho.map(c => `"${c}"`).join(';')];

    lancamentosRelatorioAtual.forEach(l => {
        const linha = [
            formatarData(l.data),
            l.tipo === 'entrada' ? 'Entrada' : 'Saida',
            l.descricao,
            categoriasMap[l.categoriaId]?.nome || 'Sem categoria',
            contasMap[l.contaId]?.nome || 'Conta removida',
            l.valor.toFixed(2).replace('.', ','),
            l.observacao || ''
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';');
        linhas.push(linha);
    });

    const csv = `\uFEFF${linhas.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${usuario.tipo === 'PJ' ? 'empresarial' : 'pessoal'}_${dataParaISO(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ==================== INICIALIZAÇÃO ====================
function inicializarLancamentos() {
    const form = document.getElementById('formLancamento');
    if (form) form.addEventListener('submit', salvarLancamento);

    const modal = document.getElementById('modalLancamento');
    if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) fecharModalLancamento(); });
    }

    carregarFiltrosCategorias();
    carregarCategorias();
    carregarContas();
    carregarLancamentos();
}

function inicializarDashboard() {
    carregarDashboard();
}

function inicializarRelatorios() {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const dataInicio = document.getElementById('relatorioDataInicio');
    const dataFim = document.getElementById('relatorioDataFim');
    if (dataInicio && !dataInicio.value) dataInicio.value = dataParaISO(primeiroDiaMes);
    if (dataFim && !dataFim.value) dataFim.value = dataParaISO(hoje);
    mudarPeriodo();
    atualizarRelatorios();
}

function inicializarAplicacao() {
    const pagina = paginaAtual();
    const db = carregarBanco();
    const usuarioId = obterUsuarioIdSessao();

    if (PAGINAS_PUBLICAS.includes(pagina) && usuarioId) {
        window.location.href = 'index.html';
        return;
    }

    if (!PAGINAS_PUBLICAS.includes(pagina) && !usuarioId) {
        window.location.href = 'login.html';
        return;
    }

    if (usuarioId && !PAGINAS_PUBLICAS.includes(pagina)) {
        garantirContaPadrao(usuarioId, db);
        const usuario = obterUsuarioAtual(db);
        if (!usuario) {
            limparSessao();
            window.location.href = 'login.html';
            return;
        }
    }

    if (pagina === 'login.html') inicializarLogin();
    else if (pagina === 'cadastro.html') inicializarCadastro();
    else if (pagina === 'lancamentos.html') inicializarLancamentos();
    else if (pagina === 'relatorios.html') inicializarRelatorios();
    else inicializarDashboard();
}

document.addEventListener('DOMContentLoaded', inicializarAplicacao);