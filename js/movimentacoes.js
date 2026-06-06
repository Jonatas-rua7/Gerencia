async function listar() {
  const params = {};
  const tipo = document.getElementById('filtroTipo').value;
  if (tipo) params.tipo = tipo;
  if (document.getElementById('dataInicio').value) params.data_inicio = document.getElementById('dataInicio').value;
  if (document.getElementById('dataFim').value) params.data_fim = document.getElementById('dataFim').value;
  const lista = await API.listarMovimentacoes(params);
  const tbody = document.getElementById('tabela');
  if (!lista.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhuma movimentação real no período.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map((m) => `
    <tr>
      <td>${m.data_movimentacao_formatada || Utils.formatarData(m.data_movimentacao)}</td>
      <td>${Utils.escaparHtml(m.descricao)}</td>
      <td>${Utils.escaparHtml(m.categoria || '—')}</td>
      <td>${Utils.escaparHtml(m.conta)}</td>
      <td class="${m.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida'}">${Utils.formatarMoeda(m.valor)}</td>
      <td>
        ${m.origem === 'manual' ? `
          <button class="btn-sm btn-secondary" data-edit="${m.movimentacao_id}" title="Editar">✏️</button>
          <button class="btn-sm btn-secondary" data-dup="${m.movimentacao_id}" title="Duplicar">📋</button>
          <button class="btn-sm btn-danger" data-del="${m.movimentacao_id}" title="Excluir">🗑️</button>
        ` : '<span title="Gerado pela agenda">🔒</span>'}
      </td>
    </tr>`).join('');
  tbody.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Excluir movimentação?')) return;
    await API.excluirMovimentacao(b.dataset.del);
    listar();
  }));
  tbody.querySelectorAll('[data-dup]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Duplicar movimentação?')) return;
    await API.duplicarMovimentacao(b.dataset.dup);
    listar();
  }));
  tbody.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', async () => {
    const id = b.dataset.edit;
    const mov = lista.find(m => m.movimentacao_id === id);
    if (!mov) return;
    const novaDescricao = prompt('Nova descrição:', mov.descricao);
    if (novaDescricao === null) return;
    const novoValor = prompt('Novo valor:', mov.valor);
    if (novoValor === null) return;
    await API.atualizarMovimentacao(id, { descricao: novaDescricao, valor: parseFloat(novoValor) });
    listar();
  }));
}

document.addEventListener('DOMContentLoaded', async () => {
  const u = await Auth.inicializarApp('movimentacoes.html');
  if (!u) return;
  if (u.tipo_uso === 'empresa') document.getElementById('tituloPagina').textContent = 'Caixa';
  document.getElementById('btnFiltrar').addEventListener('click', listar);
  await listar();
});
