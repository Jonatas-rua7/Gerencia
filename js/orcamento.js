async function carregar() {
  const usuario = await Auth.inicializarApp('orcamento.html');
  if (!usuario) return;

  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();
  document.getElementById('mesOrcamento').value = mesAtual;
  document.getElementById('anoOrcamento').value = anoAtual;

  document.getElementById('mesOrcamento').addEventListener('change', listar);
  document.getElementById('anoOrcamento').addEventListener('change', listar);
  document.getElementById('btnDefinirLimites').addEventListener('click', abrirModalLimites);
  document.getElementById('fecharModalLimites').addEventListener('click', fecharModalLimites);
  document.getElementById('salvarLimites').addEventListener('click', salvarLimites);

  await listar();
}

async function listar() {
  const mes = document.getElementById('mesOrcamento').value;
  const ano = document.getElementById('anoOrcamento').value;
  const orcamentos = await API.listarOrcamentos(mes, ano);
  const grid = document.getElementById('gridOrcamentos');
  const alerta = document.getElementById('alertaOrcamento');

  if (!orcamentos.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Nenhum orçamento definido. Clique em "Definir limites" para começar.</p>';
    alerta.style.display = 'none';
    return;
  }

  const estourados = orcamentos.filter(o => o.percentual_usado >= 100);
  if (estourados.length > 0) {
    alerta.style.display = 'block';
    alerta.className = 'alert alert-error';
    alerta.textContent = `⚠️ ${estourados.length} categoria(s) ultrapassaram o limite!`;
  } else {
    alerta.style.display = 'none';
  }

  grid.innerHTML = orcamentos.map(o => {
    const corBarra = o.percentual_usado >= 100 ? 'var(--saida)' : o.percentual_usado >= 70 ? 'var(--dourado)' : 'var(--verde)';
    return `
      <div class="stat-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="width:12px;height:12px;border-radius:50%;background:${o.cor}"></div>
          <strong>${Utils.escaparHtml(o.categoria)}</strong>
        </div>
        <div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden;margin-bottom:8px">
          <div style="height:100%;background:${corBarra};width:${Math.min(o.percentual_usado, 100)}%"></div>
        </div>
        <div style="font-size:.85rem;color:var(--text-muted)">
          ${Utils.formatarMoeda(o.valor_gasto)} de ${Utils.formatarMoeda(o.valor_limite)}
        </div>
        <div style="font-size:.8rem;color:${o.saldo_orcamento >= 0 ? 'var(--verde)' : 'var(--saida)'};margin-top:4px">
          Restante: ${Utils.formatarMoeda(o.saldo_orcamento)}
        </div>
        <button class="btn-sm btn-ghost" style="margin-top:8px" data-excluir="${o.id}">Remover</button>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-excluir]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remover este orçamento?')) return;
      await API.excluirOrcamento(btn.dataset.excluir);
      await listar();
    });
  });
}

async function abrirModalLimites() {
  const modal = document.getElementById('modalLimites');
  const lista = document.getElementById('listaCategoriasLimites');
  const categorias = await API.listarCategorias('saida');

  lista.innerHTML = categorias.map(c => `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;padding:8px;background:var(--bg);border-radius:6px">
      <div style="width:12px;height:12px;border-radius:50%;background:${c.cor}"></div>
      <span style="flex:1">${Utils.escaparHtml(c.nome)}</span>
      <input type="number" step="0.01" min="0" class="input-limite" data-categoria="${c.id}" placeholder="R$ 0,00" style="width:120px;padding:6px;border-radius:4px;border:1px solid var(--border)">
    </div>
  `).join('');

  modal.style.display = 'flex';
}

function fecharModalLimites() {
  document.getElementById('modalLimites').style.display = 'none';
}

async function salvarLimites() {
  const mes = document.getElementById('mesOrcamento').value;
  const ano = document.getElementById('anoOrcamento').value;
  const inputs = document.querySelectorAll('.input-limite');
  const promessas = [];

  inputs.forEach(input => {
    const valor = parseFloat(input.value);
    if (!isNaN(valor) && valor > 0) {
      promessas.push(API.salvarOrcamento({
        categoria_id: input.dataset.categoria,
        mes: parseInt(mes),
        ano: parseInt(ano),
        valor_limite: valor
      }));
    }
  });

  await Promise.all(promessas);
  fecharModalLimites();
  await listar();
}

document.addEventListener('DOMContentLoaded', carregar);
