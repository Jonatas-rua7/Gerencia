const tiposRendaPorPerfil = {
  pessoal: [
    { value: 'salario', label: 'Salário' },
    { value: 'mesada', label: 'Mesada' },
    { value: 'auxilio', label: 'Auxílio / benefício' },
    { value: 'renda_extra', label: 'Renda extra' },
    { value: 'renda_variavel', label: 'Renda variável' },
    { value: 'outro', label: 'Outro' }
  ],
  autonomo: [
    { value: 'pagamento_por_cliente', label: 'Pagamento por cliente' },
    { value: 'pagamento_por_servico', label: 'Pagamento por serviço' },
    { value: 'renda_semanal', label: 'Renda semanal' },
    { value: 'renda_mensal_variavel', label: 'Renda mensal variável' },
    { value: 'comissao', label: 'Comissão' },
    { value: 'vendas', label: 'Vendas' },
    { value: 'outro', label: 'Outro' }
  ],
  empresa: [
    { value: 'vendas', label: 'Vendas' },
    { value: 'prestacao_de_servico', label: 'Prestação de serviço' },
    { value: 'contratos_mensais', label: 'Contratos mensais' },
    { value: 'recebimentos_recorrentes', label: 'Recebimentos recorrentes' },
    { value: 'faturamento_variavel', label: 'Faturamento variável' },
    { value: 'outro', label: 'Outro' }
  ]
};

let rendaPrevistaId = null;

async function carregarCategorias() {
  const cats = await API.listarCategorias();
  document.getElementById('listaCategorias').innerHTML = cats.map((c) =>
    `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="width:14px;height:14px;border-radius:4px;background:${c.cor}"></span>
      ${Utils.escaparHtml(c.nome)} <small>(${c.tipo})</small>
      ${c.padrao ? '' : `<button class="btn-sm btn-danger" data-del="${c.id}">×</button>`}
    </div>`
  ).join('');
  document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    await API.excluirCategoria(b.dataset.del);
    carregarCategorias();
  }));
}

function atualizarTemasUI() {
  const t = Utils.obterTema();
  document.querySelectorAll('.theme-btn').forEach((b) => b.classList.toggle('active', b.dataset.tema === t));
  document.getElementById('coresPersonalizadas').style.display = t === 'personalizado' ? 'block' : 'none';
  if (Secrets.undergroundDesbloqueado()) {
    document.getElementById('opcaoUnderground')?.classList.remove('hidden');
    document.getElementById('btnMusicaUnderground')?.classList.remove('hidden');
  }
}

function exibirOnboardingRenda() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('setup') === 'renda') {
    Utils.mostrarAlerta('alertaRendaPrevista', 'Para montar melhor sua agenda e previsões, informe sua renda principal abaixo.', 'success');
  }
}

function preencherTipoRenda(tipoUso) {
  const select = document.getElementById('tipoRenda');
  const opcoes = tiposRendaPorPerfil[tipoUso] || tiposRendaPorPerfil.pessoal;
  select.innerHTML = `
    <option value="">Tipo de renda</option>
    ${opcoes.map((o) => `<option value="${o.value}">${Utils.escaparHtml(o.label)}</option>`).join('')}
  `;
}

function preencherContas(contas) {
  const select = document.getElementById('contaRenda');
  select.innerHTML = `
    <option value="">Conta / carteira</option>
    ${contas.map((c) => `<option value="${c.conta_id ?? c.id}">${Utils.escaparHtml(c.conta)} (${Utils.escaparHtml(c.tipo_conta)})</option>`).join('')}
  `;
}

function preencherFormularioRenda(renda) {
  if (!renda) return;
  rendaPrevistaId = renda.id;
  document.getElementById('tipoRenda').value = renda.tipo_renda;
  document.getElementById('descricaoRenda').value = renda.descricao || '';
  document.getElementById('valorRenda').value = renda.valor_previsto || '';
  document.getElementById('frequenciaRenda').value = renda.frequencia || '';
  document.getElementById('diaRecebimento').value = renda.dia_recebimento || '';
  document.getElementById('contaRenda').value = renda.conta_id || '';
  document.getElementById('criarAgendaRenda').value = String(renda.criar_na_agenda);
}

function resetFormularioRenda() {
  rendaPrevistaId = null;
  document.getElementById('formRendaPrevista').reset();
}

async function carregarRendaPrevista() {
  const contas = await API.listarContas();
  preencherContas(contas);
  const rendas = await API.listarRendasPrevistas();
  const renda = rendas.length ? rendas[0] : null;
  preencherFormularioRenda(renda);
}

function mostrarAlertaRenda(msg, tipo = 'error') {
  Utils.mostrarAlerta('alertaRendaPrevista', msg, tipo);
}

async function salvarRendaPrevista(event) {
  event.preventDefault();
  Utils.esconderAlerta('alertaRendaPrevista');

  const contaSelecionada = document.getElementById('contaRenda').value;
  const payload = {
    tipo_renda: document.getElementById('tipoRenda').value,
    descricao: document.getElementById('descricaoRenda').value.trim() || null,
    valor_previsto: document.getElementById('valorRenda').value,
    frequencia: document.getElementById('frequenciaRenda').value,
    dia_recebimento: document.getElementById('diaRecebimento').value || null,
    conta_id: ['','undefined','null'].includes(contaSelecionada) ? null : contaSelecionada,
    criar_na_agenda: document.getElementById('criarAgendaRenda').value
  };

  if (!payload.tipo_renda || !payload.valor_previsto || !payload.frequencia || payload.criar_na_agenda === '') {
    return mostrarAlertaRenda('Preencha os campos obrigatórios de renda prevista.');
  }

  try {
    if (rendaPrevistaId) {
      await API.atualizarRendaPrevista(rendaPrevistaId, payload);
      mostrarAlertaRenda('Renda prevista atualizada com sucesso.', 'success');
    } else {
      await API.criarRendaPrevista(payload);
      mostrarAlertaRenda('Renda prevista salva com sucesso.', 'success');
    }
    resetFormularioRenda();
    await carregarRendaPrevista();
  } catch (err) {
    mostrarAlertaRenda(err.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await Auth.inicializarApp('configuracoes.html'))) return;
  Secrets.inicializarConfig();

  const { usuario, configuracoes } = await API.obterPerfil();
  document.getElementById('nome').value = usuario.nome;
  document.getElementById('email').value = usuario.email;
  document.getElementById('nivel_interface').value = usuario.nivel_interface;
  if (configuracoes?.cor_principal) document.getElementById('corPrincipal').value = configuracoes.cor_principal;
  if (configuracoes?.cor_destaque) document.getElementById('corDestaque').value = configuracoes.cor_destaque;
  Utils.aplicarTema(configuracoes?.tema || Utils.obterTema());
  atualizarTemasUI();
  await carregarCategorias();
  preencherTipoRenda(usuario.tipo_uso);
  await carregarRendaPrevista();
  exibirOnboardingRenda();

  document.getElementById('formPerfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await API.atualizarPerfil({
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        nivel_interface: document.getElementById('nivel_interface').value
      });
      Utils.mostrarAlerta('alertaConfig', 'Perfil atualizado!', 'success');
    } catch (err) {
      Utils.mostrarAlerta('alertaConfig', err.message);
    }
  });

  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tema = btn.dataset.tema;
      Utils.aplicarTema(tema);
      if (tema === 'personalizado') {
        document.documentElement.style.setProperty('--custom-primary', document.getElementById('corPrincipal').value);
        document.documentElement.style.setProperty('--custom-accent', document.getElementById('corDestaque').value);
      }
      await API.atualizarPerfil({
        configuracoes: {
          tema,
          cor_principal: document.getElementById('corPrincipal').value,
          cor_destaque: document.getElementById('corDestaque').value
        }
      }).catch(() => {});
      atualizarTemasUI();
    });
  });

  document.getElementById('formCategoria').addEventListener('submit', async (e) => {
    e.preventDefault();
    await API.criarCategoria({
      nome: document.getElementById('nomeCat').value,
      tipo: document.getElementById('tipoCat').value,
      cor: document.getElementById('corCat').value
    });
    e.target.reset();
    carregarCategorias();
  });

  document.getElementById('formRendaPrevista').addEventListener('submit', salvarRendaPrevista);
});
