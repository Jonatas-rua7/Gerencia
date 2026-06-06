/**
 * Recursos visuais privados/ocultos — não fazem parte da documentação oficial.
 */

const Secrets = {
  undergroundDesbloqueado() {
    return localStorage.getItem('gerencia_underground') === '1';
  },

  desbloquearUnderground() {
    localStorage.setItem('gerencia_underground', '1');
    Utils.mostrarAlerta('alertaConfig', 'Tema Underground desbloqueado.', 'success');
  },

  inicializarLogo() {
    const logo = document.getElementById('logoGerencia');
    if (!logo) return;
    logo.addEventListener('click', (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      this.mostrarBoraBill();
    });
  },

  mostrarBoraBill() {
    const overlay = document.createElement('div');
    overlay.className = 'secret-bora-bill';
    overlay.innerHTML = `
      <div class="secret-bora-content">
        <img src="assets/secret/img/bora-bill.png" alt="" onerror="this.style.display='none'">
        <h2>BORA BILL</h2>
      </div>`;
    document.body.appendChild(overlay);

    try {
      const audio = new Audio('assets/secret/audio/bora-bill.mp3');
      audio.volume = 0.6;
      audio.play().catch(() => {});
    } catch { /* silencioso */ }

    setTimeout(() => overlay.remove(), 3500);
  },

  inicializarConfig() {
    const titulo = document.getElementById('tituloAparencia');
    titulo?.addEventListener('click', (e) => {
      if (e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        this.desbloquearUnderground();
        document.getElementById('opcaoUnderground')?.classList.remove('hidden');
      }
    });

    document.getElementById('btnMusicaUnderground')?.addEventListener('click', () => {
      const ativo = localStorage.getItem('gerencia_underground_audio') === '1';
      if (ativo) {
        localStorage.setItem('gerencia_underground_audio', '0');
        window._undergroundAudio?.pause();
        return;
      }
      localStorage.setItem('gerencia_underground_audio', '1');
      try {
        window._undergroundAudio = new Audio('assets/secret/audio/underground-theme.mp3');
        window._undergroundAudio.loop = true;
        window._undergroundAudio.volume = 0.35;
        window._undergroundAudio.play().catch(() => {});
      } catch { /* silencioso */ }
    });
  }
};

window.Secrets = Secrets;
