// ==================== LAYOUT COMPARTILHADO ====================
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { obterPerfil, logoutUsuario } from './db.js';
import { carregarTema, escaparHtml } from './utils.js';

const PAGINA = window.location.pathname.split('/').pop() || 'index.html';

// Mapeamento de páginas para título e nav ativo
const CONFIG_PAGINAS = {
    'index.html':       { titulo: 'Dashboard',       nav: 'dashboard' },
    'lancamentos.html': { titulo: 'Lançamentos',      nav: 'lancamentos' },
    'relatorios.html':  { titulo: 'Relatórios',       nav: 'relatorios' },
    'configuracoes.html':{ titulo: 'Configurações',   nav: 'config' },
    'adm.html':         { titulo: 'Painel ADM',       nav: 'adm' }
};

export function inicializarLayout(callback) {
    carregarTema();

    const loading = document.getElementById('loadingOverlay');

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const perfil = await obterPerfil(user.uid);
            if (!perfil) { await logoutUsuario(); window.location.href = 'login.html'; return; }
            if (perfil.bloqueado) { await logoutUsuario(); window.location.href = 'login.html'; return; }

            // Guarda perfil globalmente na página
            window._perfil = perfil;

            renderizarLayout(perfil);
            if (loading) loading.style.opacity = '0';
            setTimeout(() => { if (loading) loading.style.display = 'none'; }, 400);

            if (typeof callback === 'function') await callback(perfil);

        } catch (e) {
            console.error('Erro ao carregar layout:', e);
        }
    });
}

function renderizarLayout(perfil) {
    const config = CONFIG_PAGINAS[PAGINA] || { titulo: 'Gerencia!', nav: '' };
    const isAdm = perfil.role === 'adm';

    // Topbar
    const topbarTitle = document.getElementById('topbarTitle');
    if (topbarTitle) topbarTitle.textContent = config.titulo;

    const topbarBadge = document.getElementById('topbarBadge');
    if (topbarBadge) {
        if (isAdm) {
            topbarBadge.textContent = '👑 ADM';
            topbarBadge.className = 'topbar-badge adm';
        } else {
            topbarBadge.textContent = perfil.tipo === 'PJ' ? '🏢 Empresa' : '👤 Pessoa Física';
            topbarBadge.className = `topbar-badge ${perfil.tipo === 'PJ' ? 'pj' : 'pf'}`;
        }
    }

    // Sidebar user
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userType = document.getElementById('userType');
    const userAdmBadge = document.getElementById('userAdmBadge');

    if (userAvatar) userAvatar.textContent = (perfil.nome || '?')[0].toUpperCase();
    if (userName) userName.textContent = perfil.nome?.split(' ')[0] || perfil.email;
    if (userType) userType.textContent = perfil.tipo === 'PJ' ? perfil.nomeFantasia || 'Empresa' : 'Conta Pessoal';
    if (userAdmBadge) userAdmBadge.style.display = isAdm ? 'inline' : 'none';

    // Nav ADM
    const navAdm = document.getElementById('navAdm');
    const navAdmSection = document.getElementById('navAdmSection');
    if (navAdm) navAdm.style.display = isAdm ? 'flex' : 'none';
    if (navAdmSection) navAdmSection.style.display = isAdm ? 'block' : 'none';

    // Marca link ativo
    const links = document.querySelectorAll('.nav-link[data-nav]');
    links.forEach(l => {
        l.classList.toggle('active', l.dataset.nav === config.nav);
    });
}

// Logout global
window.fazerLogout = async function() {
    await logoutUsuario();
    window.location.href = 'login.html';
};

// Sidebar HTML (injetado em cada página)
export const SIDEBAR_HTML = `
<aside class="sidebar">
    <div class="sidebar-logo">
        <h1>Gerencia!</h1>
        <p>Gestão Financeira</p>
    </div>

    <nav class="sidebar-nav">
        <a href="index.html" class="nav-link" data-nav="dashboard">
            <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            Dashboard
        </a>

        <a href="lancamentos.html" class="nav-link" data-nav="lancamentos">
            <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
            Lançamentos
        </a>

        <a href="relatorios.html" class="nav-link" data-nav="relatorios">
            <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            Relatórios
        </a>

        <a href="configuracoes.html" class="nav-link" data-nav="config">
            <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Configurações
        </a>

        <div id="navAdmSection" style="display:none">
            <div class="nav-section-label">Administração</div>
            <a href="adm.html" class="nav-link adm-link" data-nav="adm" id="navAdm" style="display:none">
                <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                Painel ADM
            </a>
        </div>
    </nav>

    <div class="sidebar-user">
        <div class="user-avatar" id="userAvatar">?</div>
        <div class="user-info">
            <div class="user-name" id="userName">Carregando...</div>
            <div class="user-type" id="userType"></div>
        </div>
        <span class="badge-adm" id="userAdmBadge" style="display:none">ADM</span>
    </div>
</aside>
`;

export const TOPBAR_HTML = `
<header class="topbar">
    <span class="topbar-title" id="topbarTitle">Gerencia!</span>
    <div class="topbar-right">
        <span class="topbar-badge" id="topbarBadge"></span>
        <button onclick="fazerLogout()" class="btn btn-secondary btn-sm">Sair</button>
    </div>
</header>
`;

export const LOADING_HTML = `
<div class="loading-overlay" id="loadingOverlay">
    <div class="loading-logo">Gerencia!</div>
    <div class="loading-spinner"></div>
    <div class="loading-text">Carregando...</div>
</div>
`;