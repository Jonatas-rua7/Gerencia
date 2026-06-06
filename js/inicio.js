let chartFluxo, chartCat;

function badgeVariacao(v) {
  if (v === null) return '';
  const cor = v > 0 ? 'var(--saida)' : 'var(--entrada)';
  const seta = v > 0 ? '↑' : '↓';
  return `<span style="font-size:.75rem;color:${cor};display:block;margin-top:4px">${seta} ${Math.abs(v)}% vs mês ant.</span>`;
}

async function carregar() {
  const usuario = await Auth.inicializarApp('inicio.html');
  if (!usuario) return;

  await API.atualizarAtrasadas().catch(() => {});

  const [dash, movs, gastos, rendas] = await Promise.all([
    API.dashboard(),
    API.listarMovimentacoes({ data_inicio: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01` }),
    API.relatorioGastosCategoria(),
    API.listarRendasPrevistas()
  ]);

  if (!rendas || rendas.length === 0) {
    window.location.href = '/configuracoes.html?setup=renda';
    return;
  }

  const r = dash.resumo || {};
  const sp = dash.saldo_previsto || {};
  const comp = dash.comparativo || {};

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><h3>Saldo total</h3><div class="stat-value">${Utils.formatarMoeda(r.saldo_total)}</div></div>
    <div class="stat-card"><h3>Entradas</h3><div class="stat-value positive">${Utils.formatarMoeda(r.total_entradas)}</div>${badgeVariacao(comp.var_entradas)}</div>
    <div class="stat-card"><h3>Saídas</h3><div class="stat-value negative">${Utils.formatarMoeda(r.total_saidas)}</div>${badgeVariacao(comp.var_saidas)}</div>
    <div class="stat-card"><h3>A pagar</h3><div class="stat-value">${Utils.formatarMoeda(r.total_a_pagar)}</div></div>
    <div class="stat-card"><h3>A receber</h3><div class="stat-value">${Utils.formatarMoeda(r.total_a_receber)}</div></div>
    <div class="stat-card"><h3>Pendências</h3><div class="stat-value">${r.total_pendencias || 0}</div></div>
    <div class="stat-card"><h3>Atrasadas</h3><div class="stat-value negative">${r.total_atrasadas || 0}</div></div>
    <div class="stat-card"><h3>Em caixinhas</h3><div class="stat-value">${Utils.formatarMoeda(r.total_em_caixinhas)}</div></div>
    ${usuario.tipo_uso === 'empresa' ? `<div class="stat-card"><h3>Resultado financeiro</h3><div class="stat-value ${(r.total_entradas - r.total_saidas) >= 0 ? 'positive' : 'negative'}">${Utils.formatarMoeda((r.total_entradas || 0) - (r.total_saidas || 0))}</div></div>` : ''}`;

  document.getElementById('cardSaldoPrevisto').innerHTML = `
    <h3 class="card-title">Saldo previsto</h3>
    <p style="font-size:1.25rem;font-weight:700;color:var(--verde)">${Utils.formatarMoeda(sp.saldo_previsto)}</p>
    <p style="color:var(--text-muted);font-size:.85rem;margin-top:6px">Saldo atual + recebimentos previstos − pagamentos previstos</p>`;

  const renda = rendas && rendas.length ? rendas[0] : null;
  const estimativaMes = renda ? (renda.frequencia === 'semanal' ? renda.valor_previsto * 4
    : renda.frequencia === 'quinzenal' ? renda.valor_previsto * 2
    : renda.frequencia === 'mensal' ? renda.valor_previsto
    : renda.valor_previsto) : 0;

  document.getElementById('cardRendaPrevista').innerHTML = renda ? `
    <h3 class="card-title">Renda prevista</h3>
    <p><strong>${Utils.escaparHtml(renda.descricao || renda.tipo_renda)}</strong></p>
    <p>Próximo valor: <strong>${Utils.formatarMoeda(renda.valor_previsto)}</strong></p>
    <p>Frequência: <strong>${Utils.escaparHtml(renda.frequencia)}</strong></p>
    <p>Estimativa mensal: <strong>${Utils.formatarMoeda(estimativaMes)}</strong></p>
    ${renda.criar_na_agenda ? '<p style="color:var(--text-muted);font-size:.85rem">Previsão criada na agenda financeira.</p>' : '<p style="color:var(--text-muted);font-size:.85rem">Renda prevista armazenada sem criar previsão na agenda.</p>'}
    ${renda.valor_previsto < (r.total_a_pagar || 0) ? '<p class="aviso-item nivel-atencao">A renda prevista é menor que as contas futuras.</p>' : ''}
  ` : `
    <h3 class="card-title">Renda prevista</h3>
    <p style="color:var(--text-muted);font-size:.95rem;margin-bottom:12px">Ainda não há renda principal configurada.</p>
    <p><a href="/configuracoes.html">Configure sua renda no menu Configurações</a></p>
  `;

  const avisos = dash.avisos || [];
  document.getElementById('listaAvisos').innerHTML = avisos.length
    ? avisos.map((a) => `<div class="aviso-item ${a.nivel === 'atencao' ? 'nivel-atencao' : ''}"><strong>${Utils.escaparHtml(a.titulo)}</strong><p>${Utils.escaparHtml(a.mensagem)}</p></div>`).join('')
    : '<p class="empty-row">Nenhum aviso no momento.</p>';

  const ultimas = movs.slice(0, 6);
  document.getElementById('ultimasMov').innerHTML = ultimas.length
    ? ultimas.map((m) => `<tr><td>${m.data_movimentacao_formatada || Utils.formatarData(m.data_movimentacao)}</td><td>${Utils.escaparHtml(m.descricao)}</td><td class="${m.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida'}">${Utils.formatarMoeda(m.valor)}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="3">Nenhuma movimentação ainda.</td></tr>';

  if (typeof Chart !== 'undefined') {
    if (chartFluxo) chartFluxo.destroy();
    chartFluxo = new Chart(document.getElementById('chartFluxo'), {
      type: 'bar',
      data: {
        labels: ['Entradas', 'Saídas'],
        datasets: [{ data: [r.total_entradas || 0, r.total_saidas || 0], backgroundColor: ['#1F7A3A', '#D64545'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    const top = (gastos || []).slice(0, 6);
    if (chartCat) chartCat.destroy();
    chartCat = new Chart(document.getElementById('chartCategorias'), {
      type: 'doughnut',
      data: {
        labels: top.map((g) => g.categoria),
        datasets: [{ data: top.map((g) => g.total_gasto), backgroundColor: ['#1F7A3A', '#D4A017', '#0F3D2E', '#2E9E44', '#F5E6B3', '#6B7280'] }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

document.addEventListener('DOMContentLoaded', carregar);
