let usuario, contas, categorias, tipoAtual = 'entrada';

async function init() {
  usuario = await Auth.inicializarApp('registrar.html');
  if (!usuario) return;
  contas = await API.listarContas();
  document.getElementById('data').value = Utils.hojeISO();
  preencherContas();
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      tipoAtual = btn.dataset.tipo;
      atualizarForm();
    });
  });
  document.getElementById('oqueFoi').addEventListener('blur', sugerirCategoria);
  document.getElementById('formRegistrar').addEventListener('submit', salvar);
  atualizarForm();
}

function preencherContas() {
  const opts = contas.map((c) => `<option value="${c.conta_id}">${Utils.escaparHtml(c.conta)}</option>`).join('');
  document.getElementById('conta_id').innerHTML = opts;
  document.getElementById('conta_destino_id').innerHTML = opts;
}

async function atualizarForm() {
  const isTransf = tipoAtual === 'transferencia';
  const isAgenda = tipoAtual === 'conta_pagar' || tipoAtual === 'conta_receber';
  document.getElementById('grupoContaDestino').style.display = isTransf ? 'block' : 'none';
  document.getElementById('grupoCategorias').style.display = isTransf ? 'none' : 'block';
  document.getElementById('grupoRecorrencia').style.display = isAgenda ? 'block' : 'none';
  document.getElementById('labelData').textContent = isAgenda ? 'Vencimento / previsão' : 'Data';

  const tipoCat = tipoAtual === 'entrada' || tipoAtual === 'conta_receber' ? 'entrada' : 'saida';
  if (!isTransf) {
    categorias = await API.listarCategorias(tipoCat);
    renderChips();
  }
}

function renderChips() {
  const chips = document.getElementById('chipsCategoria');
  const lista = [...(categorias || []), { id: '', nome: 'Não sei / depois' }];
  chips.innerHTML = lista.map((c) =>
    `<button type="button" class="chip" data-id="${c.id}">${Utils.escaparHtml(c.nome)}</button>`
  ).join('');
  chips.querySelectorAll('.chip').forEach((ch) => {
    ch.addEventListener('click', () => {
      chips.querySelectorAll('.chip').forEach((x) => x.classList.remove('selected'));
      ch.classList.add('selected');
      document.getElementById('categoria_id').value = ch.dataset.id;
    });
  });
}

async function sugerirCategoria() {
  const texto = document.getElementById('oqueFoi').value.trim();
  if (!texto || tipoAtual === 'transferencia') return;
  try {
    const s = await API.sugerirCategoria(texto, tipoAtual === 'entrada' ? 'entrada' : 'saida');
    if (s?.categoria_id) {
      document.getElementById('categoria_id').value = s.categoria_id;
      document.getElementById('sugestaoCategoria').textContent = `Sugestão: ${s.categoria_nome}`;
      document.getElementById('sugestaoCategoria').style.display = 'block';
      document.querySelector(`.chip[data-id="${s.categoria_id}"]`)?.classList.add('selected');
    }
  } catch { /* opcional */ }
}

async function salvar(e) {
  e.preventDefault();
  Utils.esconderAlerta('alertaRegistrar');
  const body = {
    descricao: document.getElementById('oqueFoi').value.trim(),
    valor: document.getElementById('valor').value,
    data: document.getElementById('data').value,
    conta_id: document.getElementById('conta_id').value,
    categoria_id: document.getElementById('categoria_id').value || null,
    observacao: document.getElementById('observacao').value
  };
  try {
    if (tipoAtual === 'transferencia') {
      await API.registrarTransferencia({
        conta_origem_id: body.conta_id,
        conta_destino_id: document.getElementById('conta_destino_id').value,
        valor: body.valor,
        data_transferencia: body.data,
        descricao: body.descricao,
        observacao: body.observacao
      });
    } else if (tipoAtual === 'entrada' || tipoAtual === 'saida') {
      await API.criarMovimentacao({
        tipo: tipoAtual,
        descricao: body.descricao,
        valor: body.valor,
        data_movimentacao: body.data,
        conta_id: body.conta_id,
        categoria_id: body.categoria_id,
        observacao: body.observacao
      });
    } else {
      const freq = document.getElementById('frequencia').value;
      await API.criarAgenda({
        tipo: tipoAtual,
        descricao: body.descricao,
        valor_previsto: body.valor,
        data_prevista: body.data,
        conta_id: body.conta_id,
        categoria_id: body.categoria_id,
        observacao: body.observacao,
        recorrencia: freq !== 'nenhuma' ? { frequencia: freq } : null
      });
    }
    Utils.mostrarAlerta('alertaRegistrar', 'Registro salvo com sucesso!', 'success');
    document.getElementById('formRegistrar').reset();
    document.getElementById('data').value = Utils.hojeISO();
    document.getElementById('categoria_id').value = '';
    document.getElementById('sugestaoCategoria').style.display = 'none';
  } catch (err) {
    Utils.mostrarAlerta('alertaRegistrar', err.message);
  }
}

document.addEventListener('DOMContentLoaded', init);
