const Utils = {
  MESES: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],

  formatarMoeda(valor) {
    const n = Number(valor);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(n) ? n : 0);
  },

  formatarData(dataIso) {
    if (!dataIso) return '-';
    if (typeof dataIso === 'string' && dataIso.includes('/')) return dataIso;
    const [a, m, d] = String(dataIso).slice(0, 10).split('-');
    return d && m && a ? `${d}/${m}/${a}` : '-';
  },

  hojeISO() {
    return new Date().toISOString().slice(0, 10);
  },

  escaparHtml(t) {
    const m = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(t ?? '').replace(/[&<>"']/g, (c) => m[c]);
  },

  mostrarAlerta(id, msg, tipo = 'error') {
    const el = document.getElementById(id);
    if (!el) return alert(msg);
    el.textContent = msg;
    el.className = `alert alert-${tipo === 'success' ? 'success' : 'error'}`;
    el.style.display = 'block';
  },

  esconderAlerta(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  },

  validarCPF(cpf) {
    const v = String(cpf).replace(/\D/g, '');
    if (v.length !== 11 || /^(\d)\1{10}$/.test(v)) return false;
    let s = 0;
    for (let i = 0; i < 9; i++) s += +v[i] * (10 - i);
    let d = 11 - (s % 11);
    if (d > 9) d = 0;
    if (d !== +v[9]) return false;
    s = 0;
    for (let i = 0; i < 10; i++) s += +v[i] * (11 - i);
    d = 11 - (s % 11);
    if (d > 9) d = 0;
    return d === +v[10];
  },

  validarCNPJ(cnpj) {
    const v = String(cnpj).replace(/\D/g, '');
    if (v.length !== 14 || /^(\d)\1{13}$/.test(v)) return false;
    const calc = (n, p) => {
      let s = 0;
      for (let i = 0; i < p.length; i++) s += +n[i] * p[i];
      const r = s % 11;
      return r < 2 ? 0 : 11 - r;
    };
    const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const base = v.slice(0, 12);
    return `${calc(base, p1)}${calc(base + calc(base, p1), p2)}` === v.slice(12);
  },

  mascararCPF(v) {
    const n = String(v).replace(/\D/g, '').slice(0, 11);
    return n.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
  },

  mascararCNPJ(v) {
    const n = String(v).replace(/\D/g, '').slice(0, 14);
    return n.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  },

  labelStatus(s) {
    return { pendente: 'Pendente', pago: 'Pago', recebido: 'Recebido', atrasado: 'Atrasado', parcial: 'Parcial', cancelado: 'Cancelado' }[s] || s;
  },

  labelSituacaoFinanceira(valor) {
    return {
      nada_pendente: 'Nada pendente',
      a_receber: 'A receber',
      pago_parcialmente: 'Pago parcialmente',
      pago: 'Pago',
      atrasado: 'Atrasado'
    }[valor] || valor || '—';
  },

  classeStatus(s) {
    if (s === 'pago' || s === 'recebido') return 'badge-success';
    if (s === 'atrasado') return 'badge-danger';
    if (s === 'cancelado') return 'badge-muted';
    if (s === 'parcial') return 'badge-info';
    return 'badge-warning';
  },

  labelTipoUso(t) {
    return { pessoal: 'Pessoal', autonomo: 'Autônomo', empresa: 'Empresa' }[t] || t;
  },

  aplicarTema(tema) {
    const mapa = { padrao: 'light', escuro: 'dark', personalizado: 'custom', underground: 'underground' };
    document.documentElement.setAttribute('data-theme', mapa[tema] || tema || 'light');
    localStorage.setItem(GerenciaConfig.TEMA_KEY, tema || 'padrao');
  },

  obterTema() {
    return localStorage.getItem(GerenciaConfig.TEMA_KEY) || 'padrao';
  },

  abrirModal(id) {
    document.getElementById(id)?.classList.add('is-open');
  },

  fecharModal(id) {
    document.getElementById(id)?.classList.remove('is-open');
  }
};

window.Utils = Utils;
