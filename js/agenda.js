async function listar() {
  const status = document.getElementById('filtroStatus').value;
  const lista = await API.listarAgenda(status ? { status } : {});
  const tbody = document.getElementById('tabela');
  if (!lista.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Agenda vazia.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map((a) => {
    const podeRealizar = ['pendente', 'atrasado', 'parcial'].includes(a.status);
    const podeCancelar = podeRealizar;
    return `<tr>
      <td>${a.data_prevista_formatada || Utils.formatarData(a.data_prevista)}</td>
      <td>${Utils.escaparHtml(a.descricao)}<br><small style="color:var(--text-muted)">${a.tipo}</small></td>
      <td>${Utils.formatarMoeda(a.valor_previsto)}</td>
      <td><span class="badge ${Utils.classeStatus(a.status)}">${Utils.labelStatus(a.status)}</span></td>
      <td>
        ${podeRealizar ? `<button class="btn-sm btn-success" data-realizar="${a.agenda_id}">Realizar</button>` : ''}
        ${podeCancelar ? `<button class="btn-sm btn-danger" data-cancelar="${a.agenda_id}">Cancelar</button>` : ''}
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-realizar]').forEach((b) => b.addEventListener('click', async () => {
    try {
      await API.realizarAgenda(b.dataset.realizar, {});
      listar();
    } catch (e) { alert(e.message); }
  }));
  tbody.querySelectorAll('[data-cancelar]').forEach((b) => b.addEventListener('click', async () => {
    const motivo = prompt('Motivo do cancelamento (opcional):');
    try {
      await API.cancelarAgenda(b.dataset.cancelar, motivo);
      listar();
    } catch (e) { alert(e.message); }
  }));
}

document.addEventListener('DOMContentLoaded', async () => {
  const usuario = await Auth.inicializarApp('agenda.html');
  if (!usuario) return;
  // Agenda é acessível para todos os perfis, mas empresa tem título diferente
  if (usuario.tipo_uso === 'empresa') {
    document.querySelector('h1').textContent = 'A pagar e receber';
  }
  document.getElementById('filtroStatus').addEventListener('change', listar);
  await listar();
});
