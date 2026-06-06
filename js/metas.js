async function carregar() {
  const usuario = await Auth.inicializarApp('metas.html');
  if (!usuario) return;

  document.getElementById('btnNovaMeta').addEventListener('click', abrirModalMeta);
  document.getElementById('fecharModalMeta').addEventListener('click', fecharModalMeta);
  document.getElementById('salvarMeta').addEventListener('click', salvarMeta);
  document.getElementById('fecharModalAporte').addEventListener('click', fecharModalAporte);
  document.getElementById('salvarAporte').addEventListener('click', salvarAporte);

  await listar();
}

async function listar() {
  const metas = await API.listarMetas();
  const grid = document.getElementById('gridMetas');

  if (!metas.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Nenhuma meta definida. Clique em "+ Nova meta" para começar.</p>';
    return;
  }

  grid.innerHTML = metas.map(m => {
    const concluida = m.status === 'concluida';
    const corProgresso = concluida ? 'var(--verde)' : m.cor;
    return `
      <div class="stat-card" style="border-left:4px solid ${m.cor}">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <span style="font-size:2rem">${m.icone}</span>
          <div>
            <strong>${Utils.escaparHtml(m.nome)}</strong>
            ${concluida ? '<span style="background:var(--verde);color:white;padding:2px 8px;border-radius:12px;font-size:.75rem;margin-left:8px">Concluída 🎉</span>' : ''}
          </div>
        </div>
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:.85rem">
            <span>${Utils.formatarMoeda(m.valor_atual)} de ${Utils.formatarMoeda(m.valor_alvo)}</span>
            <span>${m.percentual}%</span>
          </div>
          <div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden">
            <div style="height:100%;background:${corProgresso};width:${Math.min(m.percentual, 100)}%"></div>
          </div>
        </div>
        ${m.dias_restantes !== null ? `<div style="font-size:.8rem;color:var(--text-muted);margin-bottom:8px">Faltam ${m.dias_restantes} dias</div>` : ''}
        ${m.aporte_mensal_sugerido !== null && !concluida ? `<div style="font-size:.8rem;color:var(--text-muted);margin-bottom:8px">Aporte sugerido: ${Utils.formatarMoeda(m.aporte_mensal_sugerido)}/mês</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:12px">
          ${!concluida ? `<button class="btn-sm btn-primary" data-aporte="${m.id}">Registrar aporte</button>` : ''}
          <button class="btn-sm btn-ghost" data-cancelar="${m.id}">Cancelar</button>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-aporte]').forEach(btn => {
    btn.addEventListener('click', () => abrirModalAporte(btn.dataset.aporte));
  });

  grid.querySelectorAll('[data-cancelar]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Cancelar esta meta?')) return;
      await API.cancelarMeta(btn.dataset.cancelar);
      await listar();
    });
  });
}

function abrirModalMeta() {
  document.getElementById('modalMeta').style.display = 'flex';
}

function fecharModalMeta() {
  document.getElementById('modalMeta').style.display = 'none';
}

async function salvarMeta() {
  const nome = document.getElementById('metaNome').value.trim();
  const valorAlvo = parseFloat(document.getElementById('metaValorAlvo').value);
  const dataLimite = document.getElementById('metaDataLimite').value;
  const icone = document.getElementById('metaIcone').value || '🎯';
  const cor = document.getElementById('metaCor').value;
  const descricao = document.getElementById('metaDescricao').value.trim();

  if (!nome || !valorAlvo) {
    alert('Preencha nome e valor alvo.');
    return;
  }

  await API.criarMeta({
    nome,
    valor_alvo: valorAlvo,
    data_limite: dataLimite || null,
    icone,
    cor,
    descricao: descricao || null
  });

  fecharModalMeta();
  document.getElementById('metaNome').value = '';
  document.getElementById('metaValorAlvo').value = '';
  document.getElementById('metaDataLimite').value = '';
  document.getElementById('metaDescricao').value = '';
  await listar();
}

function abrirModalAporte(metaId) {
  document.getElementById('aporteMetaId').value = metaId;
  document.getElementById('aporteData').value = new Date().toISOString().slice(0, 10);
  document.getElementById('modalAporte').style.display = 'flex';
}

function fecharModalAporte() {
  document.getElementById('modalAporte').style.display = 'none';
}

async function salvarAporte() {
  const metaId = document.getElementById('aporteMetaId').value;
  const valor = parseFloat(document.getElementById('aporteValor').value);
  const data = document.getElementById('aporteData').value;
  const observacao = document.getElementById('aporteObservacao').value.trim();

  if (!valor || valor <= 0) {
    alert('Informe um valor válido.');
    return;
  }

  await API.registrarAporte(metaId, {
    valor,
    data: data || null,
    observacao: observacao || null
  });

  fecharModalAporte();
  document.getElementById('aporteValor').value = '';
  document.getElementById('aporteObservacao').value = '';
  await listar();
}

document.addEventListener('DOMContentLoaded', carregar);
