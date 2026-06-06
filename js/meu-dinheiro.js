async function carregar() {
  const u = await Auth.inicializarApp('meu-dinheiro.html');
  if (!u) return;
  if (u.tipo_uso === 'empresa') {
    document.getElementById('tituloMeuDinheiro').textContent = 'Caixa';
  }
  const [contas, caixinhas, compromissos] = await Promise.all([
    API.listarContas(),
    API.listarCaixinhas(),
    API.listarCompromissos()
  ]);
  document.getElementById('tabelaContas').innerHTML = contas.length
    ? contas.map((c) => `<tr><td>${Utils.escaparHtml(c.conta)}</td><td>${c.tipo_conta}</td><td>${Utils.formatarMoeda(c.saldo_atual)}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="3">Nenhuma conta.</td></tr>';
  document.getElementById('listaCaixinhas').innerHTML = caixinhas.length
    ? caixinhas.map((cx) => `<div class="stat-card" style="margin-bottom:8px"><strong>${Utils.escaparHtml(cx.nome)}</strong><div>${Utils.formatarMoeda(cx.valor_separado)}${cx.meta_valor ? ` / meta ${Utils.formatarMoeda(cx.meta_valor)}` : ''}</div></div>`).join('')
    : '<p style="color:var(--text-muted)">Nenhuma caixinha ainda.</p>';
  document.getElementById('tabelaCompromissos').innerHTML = compromissos.length
    ? compromissos.map((c) => `<tr><td>${Utils.escaparHtml(c.nome)}</td><td>${Utils.formatarMoeda(c.valor_parcela)}</td><td>${c.status}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="3">Nenhum compromisso.</td></tr>';
}

document.addEventListener('DOMContentLoaded', () => {
  carregar();
  document.getElementById('formCaixinha')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await API.criarCaixinha({ nome: document.getElementById('nomeCx').value, valor_separado: document.getElementById('valorCx').value || 0 });
    document.getElementById('formCaixinha').reset();
    carregar();
  });
});
