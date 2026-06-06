/**
 * Layout compartilhado — menu adaptado ao tipo_uso
 */

const MENUS = {
  pessoal: [
    { href: 'inicio.html', label: 'Início' },
    { href: 'registrar.html', label: 'Registrar' },
    { href: 'movimentacoes.html', label: 'Movimentações' },
    { href: 'agenda.html', label: 'Agenda' },
    { href: 'meu-dinheiro.html', label: 'Meu dinheiro' },
    { href: 'relatorios.html', label: 'Relatórios' },
    { href: 'configuracoes.html', label: 'Configurações' }
  ],
  autonomo: [
    { href: 'inicio.html', label: 'Início' },
    { href: 'registrar.html', label: 'Registrar' },
    { href: 'movimentacoes.html', label: 'Movimentações' },
    { href: 'agenda.html', label: 'Agenda' },
    { href: 'clientes.html', label: 'Clientes e serviços' },
    { href: 'meu-dinheiro.html', label: 'Meu dinheiro' },
    { href: 'relatorios.html', label: 'Relatórios' },
    { href: 'configuracoes.html', label: 'Configurações' }
  ],
  empresa: [
    { href: 'inicio.html', label: 'Início' },
    { href: 'registrar.html', label: 'Registrar' },
    { href: 'movimentacoes.html', label: 'Caixa' },
    { href: 'agenda.html', label: 'Agenda' },
    { href: 'clientes.html', label: 'Clientes e fornecedores' },
    { href: 'relatorios.html', label: 'Relatórios' },
    { href: 'configuracoes.html', label: 'Configurações' }
  ]
};

const Layout = {
  renderizarSidebar(usuario, paginaAtiva) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || !usuario) return;

    const itens = MENUS[usuario.tipo_uso] || MENUS.pessoal;
    const links = itens.map((item) => `
      <a href="${item.href}" class="nav-link ${paginaAtiva === item.href ? 'active' : ''}">
        <span class="nav-label">${item.label}</span>
      </a>`).join('');

    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <a href="inicio.html" class="logo-link" id="logoGerencia">
          <img src="assets/img/logo-gerencia.png" alt="Gerencia!" class="logo-img">
        </a>
      </div>
      <div class="sidebar-user">
        <span class="badge badge-uso">${Utils.labelTipoUso(usuario.tipo_uso)}</span>
        <span class="user-name">${Utils.escaparHtml(usuario.nome)}</span>
      </div>
      <nav class="sidebar-nav">${links}</nav>
      <div class="sidebar-footer">
        <button type="button" class="btn-ghost btn-block" id="btnLogout">Sair</button>
      </div>`;

    document.getElementById('btnLogout')?.addEventListener('click', () => Auth.logout());
    if (window.Secrets) Secrets.inicializarLogo();
  },

  inicializarMenuMobile() {
    document.getElementById('btnMenu')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('is-open');
      document.getElementById('sidebarOverlay')?.classList.toggle('is-open');
    });
    document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('is-open');
      document.getElementById('sidebarOverlay')?.classList.remove('is-open');
    });
  }
};

window.Layout = Layout;
