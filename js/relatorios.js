let chartMensal, chartGastos, chartFluxoProjetado;

async function carregar() {
  const u = await Auth.inicializarApp('relatorios.html');
  if (!u) return;

  const [mensal, gastos, pend, prev, fluxo] = await Promise.all([
    API.relatorioResultadoMensal(),
    API.relatorioGastosCategoria(),
    API.relatorioPendencias(),
    API.relatorioSaldoPrevisto(),
    API.fluxoProjetado(90)
  ]);

  const atual = mensal[0] || {};
  const anterior = mensal[1] || {};
  const diff = (atual.resultado_financeiro || 0) - (anterior.resultado_financeiro || 0);

  document.getElementById('statsRel').innerHTML = `
    <div class="stat-card"><h3>Entradas (mês)</h3><div class="stat-value positive">${Utils.formatarMoeda(atual.total_entradas)}</div></div>
    <div class="stat-card"><h3>Saídas (mês)</h3><div class="stat-value negative">${Utils.formatarMoeda(atual.total_saidas)}</div></div>
    <div class="stat-card"><h3>Resultado financeiro</h3><div class="stat-value">${Utils.formatarMoeda(atual.resultado_financeiro)}</div></div>
    <div class="stat-card"><h3>Vs mês anterior</h3><div class="stat-value ${diff >= 0 ? 'positive' : 'negative'}">${diff >= 0 ? '+' : ''}${Utils.formatarMoeda(diff)}</div></div>
    <div class="stat-card"><h3>Saldo previsto</h3><div class="stat-value">${Utils.formatarMoeda(prev?.saldo_previsto)}</div></div>`;

  document.getElementById('tabelaPend').innerHTML = pend.length
    ? pend.map((p) => `<tr><td>${p.data_prevista_formatada}</td><td>${Utils.escaparHtml(p.descricao)}</td><td>${Utils.formatarMoeda(p.valor_previsto)}</td><td><span class="badge ${Utils.classeStatus(p.status)}">${Utils.labelStatus(p.status)}</span></td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="4">Sem pendências.</td></tr>';

  // Fluxo projetado
  const alertaFluxo = document.getElementById('alertaFluxo');
  const saldoNegativo = fluxo.some(f => f.saldo_acumulado < 0);
  if (saldoNegativo) {
    alertaFluxo.style.display = 'block';
    alertaFluxo.className = 'alert alert-error';
    alertaFluxo.textContent = '⚠️ Saldo negativo previsto em algum período.';
  } else {
    alertaFluxo.style.display = 'none';
  }

  document.getElementById('tabelaFluxo').innerHTML = fluxo.length
    ? fluxo.map((f) => `<tr><td>${Utils.formatarData(f.data_prevista)}</td><td class="valor-entrada">${Utils.formatarMoeda(f.entradas_previstas)}</td><td class="valor-saida">${Utils.formatarMoeda(f.saidas_previstas)}</td><td>${Utils.formatarMoeda(f.entradas_previstas - f.saidas_previstas)}</td><td class="${f.saldo_acumulado >= 0 ? 'valor-entrada' : 'valor-saida'}">${Utils.formatarMoeda(f.saldo_acumulado)}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="5">Nenhum compromisso futuro.</td></tr>';

  document.querySelectorAll('[data-dias]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const dias = parseInt(btn.dataset.dias);
      const novoFluxo = await API.fluxoProjetado(dias);
      renderizarFluxoProjetado(novoFluxo);
    });
  });

  if (typeof Chart !== 'undefined') {
    const ultimos = mensal.slice(0, 6).reverse();
    if (chartMensal) chartMensal.destroy();
    chartMensal = new Chart(document.getElementById('chartMensal'), {
      type: 'line',
      data: {
        labels: ultimos.map((m) => m.mes_ano),
        datasets: [{ label: 'Resultado', data: ultimos.map((m) => m.resultado_financeiro), borderColor: '#1F7A3A', fill: false }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
    const top = gastos.slice(0, 8);
    if (chartGastos) chartGastos.destroy();
    chartGastos = new Chart(document.getElementById('chartGastos'), {
      type: 'bar',
      data: { labels: top.map((g) => g.categoria), datasets: [{ data: top.map((g) => g.total_gasto), backgroundColor: '#D4A017' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
    renderizarFluxoProjetado(fluxo);
  }
}

function renderizarFluxoProjetado(fluxo) {
  if (chartFluxoProjetado) chartFluxoProjetado.destroy();
  chartFluxoProjetado = new Chart(document.getElementById('chartFluxoProjetado'), {
    type: 'line',
    data: {
      labels: fluxo.map(f => Utils.formatarData(f.data_prevista)),
      datasets: [{
        label: 'Saldo acumulado',
        data: fluxo.map(f => f.saldo_acumulado),
        borderColor: fluxo.some(f => f.saldo_acumulado < 0) ? '#D64545' : '#1F7A3A',
        backgroundColor: fluxo.some(f => f.saldo_acumulado < 0) ? 'rgba(214, 69, 69, 0.1)' : 'rgba(31, 122, 58, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

document.addEventListener('DOMContentLoaded', carregar);
