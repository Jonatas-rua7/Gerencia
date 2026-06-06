let usuario;
let clientes = [];
let servicos = [];
let fornecedores = [];
let editarClienteId = null;
let editarServicoId = null;
let editarFornecedorId = null;

const tiposServicoPorPerfil = {
  autonomo: ['design', 'edição', 'programação', 'aula', 'consultoria', 'entrega', 'manutenção', 'venda', 'outro serviço'],
  empresa: ['venda de produto', 'prestação de serviço', 'contrato mensal', 'orçamento', 'pedido', 'manutenção', 'assinatura', 'outro'],
  pessoal: ['serviço', 'produto', 'outro']
};

async function carregar() {
  usuario = await Auth.inicializarApp('clientes.html');
  if (!usuario) return;

  document.getElementById('descricaoClientes').textContent = usuario.tipo_uso === 'empresa'
    ? 'Registre clientes, fornecedores, contratos e a situação financeira futura.'
    : 'Registre clientes, serviços e valores a receber para seu uso.';

  if (usuario.tipo_uso === 'empresa') {
    document.getElementById('cardFornecedores').style.display = 'block';
    document.getElementById('tituloClientes').textContent = 'Clientes e fornecedores';
  } else {
    document.getElementById('cardFornecedores').style.display = 'none';
    document.getElementById('tituloClientes').textContent = 'Clientes e serviços';
  }

  await atualizarDados();
}

async function atualizarDados() {
  [clientes, servicos, fornecedores] = await Promise.all([
    API.listarClientes(),
    API.listarServicos(),
    API.listarFornecedores().catch(() => [])
  ]);

  preencherTipoServico();
  preencherClienteSelect();
  renderClientes();
  renderServicos();
  renderFornecedores();
}

function preencherTipoServico() {
  const tipos = tiposServicoPorPerfil[usuario.tipo_uso] || tiposServicoPorPerfil.pessoal;
  document.getElementById('tipoServico').innerHTML = `
    <option value="">Tipo de serviço</option>
    ${tipos.map((tipo) => `<option value="${tipo}">${Utils.escaparHtml(tipo)}</option>`).join('')}
  `;
}

function preencherClienteSelect() {
  const select = document.getElementById('clienteServico');
  select.innerHTML = `
    <option value="">Selecione um cliente</option>
    ${clientes.map((c) => `<option value="${c.id}">${Utils.escaparHtml(c.nome)}</option>`).join('')}
  `;
}

function renderClientes() {
  const tbody = document.getElementById('tabelaClientes');
  tbody.innerHTML = clientes.map((c) => `
    <tr>
      <td>${Utils.escaparHtml(c.nome)}</td>
      <td>${Utils.escaparHtml(c.contato || c.telefone || '—')}</td>
      <td>${Utils.escaparHtml(c.documento || '—')}</td>
      <td>${Utils.escaparHtml(c.tipo || '—')}</td>
      <td>${Utils.escaparHtml(c.observacao || '—')}</td>
      <td><button type="button" class="btn-sm" data-editar-cliente="${c.id}">Editar</button></td>
    </tr>
  `).join('') || '<tr class="empty-row"><td colspan="6">Nenhum cliente.</td></tr>';

  tbody.querySelectorAll('[data-editar-cliente]').forEach((btn) => {
    btn.addEventListener('click', () => iniciarEdicaoCliente(btn.dataset.editarCliente));
  });
}

function renderServicos() {
  const tbody = document.getElementById('tabelaServicos');
  tbody.innerHTML = servicos.map((s) => `
    <tr>
      <td>${Utils.escaparHtml(s.nome)}</td>
      <td>${Utils.escaparHtml(s.tipo || '—')}</td>
      <td>${Utils.escaparHtml(s.cliente_nome || '—')}</td>
      <td>${Utils.formatarMoeda(s.valor_padrao || s.valor_combinado)}</td>
      <td><span class="badge ${Utils.classeStatus(s.status)}">${Utils.escaparHtml(s.status || 'ativo')}</span></td>
      <td>${Utils.escaparHtml(Utils.labelSituacaoFinanceira(s.situacao_financeira))}</td>
      <td><button type="button" class="btn-sm" data-editar-servico="${s.id}">Editar</button></td>
    </tr>
  `).join('') || '<tr class="empty-row"><td colspan="7">Nenhum serviço.</td></tr>';

  tbody.querySelectorAll('[data-editar-servico]').forEach((btn) => {
    btn.addEventListener('click', () => iniciarEdicaoServico(btn.dataset.editarServico));
  });
}

function renderFornecedores() {
  const tbody = document.getElementById('tabelaFornecedores');
  tbody.innerHTML = fornecedores.map((f) => `
    <tr>
      <td>${Utils.escaparHtml(f.nome)}</td>
      <td>${Utils.escaparHtml(f.contato || '—')}</td>
      <td>${Utils.escaparHtml(f.documento || '—')}</td>
      <td>${Utils.escaparHtml(f.observacao || '—')}</td>
      <td><button type="button" class="btn-sm" data-editar-fornecedor="${f.id}">Editar</button></td>
    </tr>
  `).join('') || '<tr class="empty-row"><td colspan="5">Nenhum fornecedor.</td></tr>';

  tbody.querySelectorAll('[data-editar-fornecedor]').forEach((btn) => {
    btn.addEventListener('click', () => iniciarEdicaoFornecedor(btn.dataset.editarFornecedor));
  });
}

function iniciarEdicaoCliente(id) {
  const cliente = clientes.find((c) => c.id === id);
  if (!cliente) return;
  editarClienteId = id;
  document.getElementById('nomeCliente').value = cliente.nome;
  document.getElementById('telefoneCliente').value = cliente.contato || cliente.telefone || '';
  document.getElementById('emailCliente').value = cliente.email || '';
  document.getElementById('documentoCliente').value = cliente.documento || '';
  document.getElementById('tipoCliente').value = cliente.tipo || '';
  document.getElementById('observacaoCliente').value = cliente.observacao || '';
  document.querySelector('#formCliente button[type="submit"]').textContent = 'Atualizar cliente';
}

function iniciarEdicaoServico(id) {
  const servico = servicos.find((s) => s.id === id);
  if (!servico) return;
  editarServicoId = id;
  document.getElementById('nomeServico').value = servico.nome;
  document.getElementById('tipoServico').value = servico.tipo || '';
  document.getElementById('clienteServico').value = servico.cliente_id || '';
  document.getElementById('valorServico').value = servico.valor_padrao || servico.valor_combinado || '';
  document.getElementById('statusServico').value = servico.status || 'ativo';
  document.getElementById('situacaoServico').value = servico.situacao_financeira || 'nada_pendente';
  document.getElementById('observacaoServico').value = servico.descricao || '';
  document.querySelector('#formServico button[type="submit"]').textContent = 'Atualizar serviço';
}

function iniciarEdicaoFornecedor(id) {
  const fornecedor = fornecedores.find((f) => f.id === id);
  if (!fornecedor) return;
  editarFornecedorId = id;
  document.getElementById('nomeFornecedor').value = fornecedor.nome;
  document.getElementById('contatoFornecedor').value = fornecedor.contato || '';
  document.getElementById('documentoFornecedor').value = fornecedor.documento || '';
  document.getElementById('observacaoFornecedor').value = fornecedor.observacao || '';
  document.querySelector('#formFornecedor button[type="submit"]').textContent = 'Atualizar fornecedor';
}

function resetClienteForm() {
  editarClienteId = null;
  document.getElementById('formCliente').reset();
  document.querySelector('#formCliente button[type="submit"]').textContent = 'Salvar cliente';
}

function resetServicoForm() {
  editarServicoId = null;
  document.getElementById('formServico').reset();
  document.querySelector('#formServico button[type="submit"]').textContent = 'Salvar serviço';
}

function resetFornecedorForm() {
  editarFornecedorId = null;
  document.getElementById('formFornecedor').reset();
  document.querySelector('#formFornecedor button[type="submit"]').textContent = 'Salvar fornecedor';
}

async function salvarCliente(event) {
  event.preventDefault();
  Utils.esconderAlerta('alertaClientes');
  const payload = {
    nome: document.getElementById('nomeCliente').value.trim(),
    contato: document.getElementById('telefoneCliente').value.trim() || null,
    email: document.getElementById('emailCliente').value.trim() || null,
    documento: document.getElementById('documentoCliente').value.trim() || null,
    observacao: document.getElementById('observacaoCliente').value.trim() || null,
    tipo: document.getElementById('tipoCliente').value || null
  };
  if (!payload.nome) return Utils.mostrarAlerta('alertaClientes', 'Informe o nome do cliente.');
  try {
    if (editarClienteId) {
      await API.atualizarCliente(editarClienteId, payload);
      Utils.mostrarAlerta('alertaClientes', 'Cliente atualizado com sucesso.', 'success');
    } else {
      await API.criarCliente(payload);
      Utils.mostrarAlerta('alertaClientes', 'Cliente criado com sucesso.', 'success');
    }
    resetClienteForm();
    await atualizarDados();
  } catch (err) {
    Utils.mostrarAlerta('alertaClientes', err.message);
  }
}

async function salvarServico(event) {
  event.preventDefault();
  Utils.esconderAlerta('alertaClientes');
  const payload = {
    nome: document.getElementById('nomeServico').value.trim(),
    tipo: document.getElementById('tipoServico').value || null,
    cliente_id: document.getElementById('clienteServico').value || null,
    valor_padrao: document.getElementById('valorServico').value || null,
    status: document.getElementById('statusServico').value || null,
    situacao_financeira: document.getElementById('situacaoServico').value || null,
    descricao: document.getElementById('observacaoServico').value.trim() || null
  };
  if (!payload.nome || !payload.cliente_id || !payload.valor_padrao) {
    return Utils.mostrarAlerta('alertaClientes', 'Preencha nome, cliente e valor do serviço.');
  }
  try {
    if (editarServicoId) {
      await API.atualizarServico(editarServicoId, payload);
      Utils.mostrarAlerta('alertaClientes', 'Serviço atualizado com sucesso.', 'success');
    } else {
      await API.criarServico(payload);
      Utils.mostrarAlerta('alertaClientes', 'Serviço criado com sucesso.', 'success');
    }
    resetServicoForm();
    await atualizarDados();
  } catch (err) {
    Utils.mostrarAlerta('alertaClientes', err.message);
  }
}

async function salvarFornecedor(event) {
  event.preventDefault();
  Utils.esconderAlerta('alertaClientes');
  const payload = {
    nome: document.getElementById('nomeFornecedor').value.trim(),
    contato: document.getElementById('contatoFornecedor').value.trim() || null,
    documento: document.getElementById('documentoFornecedor').value.trim() || null,
    observacao: document.getElementById('observacaoFornecedor').value.trim() || null
  };
  if (!payload.nome) return Utils.mostrarAlerta('alertaClientes', 'Informe o nome do fornecedor.');
  try {
    if (editarFornecedorId) {
      await API.atualizarFornecedor(editarFornecedorId, payload);
      Utils.mostrarAlerta('alertaClientes', 'Fornecedor atualizado com sucesso.', 'success');
    } else {
      await API.criarFornecedor(payload);
      Utils.mostrarAlerta('alertaClientes', 'Fornecedor criado com sucesso.', 'success');
    }
    resetFornecedorForm();
    await atualizarDados();
  } catch (err) {
    Utils.mostrarAlerta('alertaClientes', err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  carregar();
  document.getElementById('formCliente')?.addEventListener('submit', salvarCliente);
  document.getElementById('formServico')?.addEventListener('submit', salvarServico);
  document.getElementById('formFornecedor')?.addEventListener('submit', salvarFornecedor);
});
