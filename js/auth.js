const PAGINAS_PUBLICAS = ['login.html', 'cadastro.html', 'recuperar-senha.html', 'index.html'];

const Auth = {
  paginaAtual() {
    return (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  },

  async exigirLogin() {
    if (PAGINAS_PUBLICAS.includes(this.paginaAtual())) return null;
    if (!API.getToken()) {
      window.location.href = '/login.html';
      return null;
    }
    try {
      const usuario = await API.me();
      API.setSessao(API.getToken(), usuario);
      return usuario;
    } catch {
      API.limparSessao();
      window.location.href = '/login.html';
      return null;
    }
  },

  logout() {
    API.limparSessao();
    window.location.href = '/login.html';
  },

  async inicializarApp(paginaAtiva) {
    const tema = Utils.obterTema();
    Utils.aplicarTema(tema);
    const usuario = await this.exigirLogin();
    if (!usuario) return null;
    Layout.renderizarSidebar(usuario, paginaAtiva);
    Layout.inicializarMenuMobile();
    return usuario;
  },

  inicializarLogin() {
    if (API.getToken()) {
      window.location.href = '/inicio.html';
      return;
    }
    Utils.aplicarTema(Utils.obterTema());
    document.getElementById('formLogin')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      Utils.esconderAlerta('alertaLogin');
      try {
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const { token, usuario } = await API.login({ email, senha });
        API.setSessao(token, usuario);
        window.location.href = '/inicio.html';
      } catch (err) {
        Utils.mostrarAlerta('alertaLogin', err.message);
      }
    });
  },

  inicializarCadastro() {
    if (API.getToken()) {
      window.location.href = '/inicio.html';
      return;
    }
    Utils.aplicarTema(Utils.obterTema());
    this.alternarCampos();

    document.querySelectorAll('[name="tipo_uso"]').forEach((el) => {
      el.addEventListener('change', () => this.alternarCampos());
    });
    document.getElementById('documento_numero')?.addEventListener('input', (e) => {
      const tipo = document.querySelector('[name="documento_tipo"]:checked')?.value;
      e.target.value = tipo === 'CNPJ' ? Utils.mascararCNPJ(e.target.value) : Utils.mascararCPF(e.target.value);
    });

    document.getElementById('formCadastro')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      Utils.esconderAlerta('alertaCadastro');
      const body = {
        nome: document.getElementById('nome').value.trim(),
        email: document.getElementById('email').value.trim(),
        senha: document.getElementById('senha').value,
        tipo_uso: document.querySelector('[name="tipo_uso"]:checked')?.value,
        documento_tipo: document.querySelector('[name="documento_tipo"]:checked')?.value,
        documento_numero: document.getElementById('documento_numero').value.replace(/\D/g, ''),
        perfil_detalhado: document.getElementById('perfil_detalhado').value,
        nivel_interface: document.querySelector('[name="nivel_interface"]:checked')?.value || 'simples'
      };
      if (body.documento_tipo === 'CPF' && !Utils.validarCPF(body.documento_numero)) {
        return Utils.mostrarAlerta('alertaCadastro', 'CPF inválido.');
      }
      if (body.documento_tipo === 'CNPJ' && !Utils.validarCNPJ(body.documento_numero)) {
        return Utils.mostrarAlerta('alertaCadastro', 'CNPJ inválido.');
      }
      try {
        const { token, usuario } = await API.cadastro(body);
        API.setSessao(token, usuario);
        window.location.href = '/inicio.html';
      } catch (err) {
        Utils.mostrarAlerta('alertaCadastro', err.message);
      }
    });
  },

  alternarCampos() {
    const uso = document.querySelector('[name="tipo_uso"]:checked')?.value || 'pessoal';
    const perfil = document.getElementById('perfil_detalhado');
    if (!perfil) return;
    const opcoes = {
      pessoal: [
        { value: 'estudante', label: 'Estudante' },
        { value: 'trabalhador_clt', label: 'Trabalhador CLT' },
        { value: 'desempregado', label: 'Desempregado' },
        { value: 'controle_familiar', label: 'Controle familiar' },
        { value: 'aposentado', label: 'Aposentado' },
        { value: 'pessoa_fisica_geral', label: 'Pessoa física geral' }
      ],
      autonomo: [
        { value: 'freelancer', label: 'Freelancer' },
        { value: 'prestador_servicos', label: 'Prestador de serviços' },
        { value: 'vendedor_autonomo', label: 'Vendedor autônomo' },
        { value: 'mei', label: 'MEI' },
        { value: 'profissional_liberal', label: 'Profissional liberal' },
        { value: 'criador_conteudo', label: 'Criador de conteúdo' },
        { value: 'motorista_entregador', label: 'Motorista ou entregador' },
        { value: 'pequeno_empreendedor_individual', label: 'Pequeno empreendedor individual' }
      ],
      empresa: [
        { value: 'mei_equipe', label: 'MEI com equipe' },
        { value: 'microempresa', label: 'Microempresa' },
        { value: 'pequena_empresa', label: 'Pequena empresa' },
        { value: 'comercio', label: 'Comércio' },
        { value: 'prestadora_servicos', label: 'Prestadora de serviços' },
        { value: 'loja_fisica', label: 'Loja física' },
        { value: 'loja_online', label: 'Loja online' },
        { value: 'escritorio', label: 'Escritório' },
        { value: 'outro_negocio', label: 'Outro negócio' }
      ]
    };
    perfil.innerHTML = (opcoes[uso] || []).map((v) => `<option value="${v.value}">${v.label}</option>`).join('');
  },

  inicializarRecuperar() {
    Utils.aplicarTema(Utils.obterTema());
    document.getElementById('formRecuperar')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const data = await API.recuperarSenha(document.getElementById('email').value);
        Utils.mostrarAlerta('alertaRecuperar', data.mensagem, 'success');
      } catch (err) {
        Utils.mostrarAlerta('alertaRecuperar', err.message);
      }
    });
  },

  inicializarIndex() {
    window.location.href = API.getToken() ? '/inicio.html' : '/login.html';
  }
};

window.Auth = Auth;
