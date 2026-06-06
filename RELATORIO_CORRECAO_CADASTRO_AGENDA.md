# Relatório de Correção de Cadastro e Agenda - Gerencia!

Data: 05/06/2026

---

## 1. Opções de Perfil Detalhado Adicionadas

O campo `perfil_detalhado` foi corrigido para mostrar opções diferentes conforme o `tipo_uso` escolhido.

### 1.1. Perfil Pessoal
Quando `tipo_uso = pessoal`, o select mostra:
- Estudante
- Trabalhador CLT
- Desempregado
- Controle familiar
- Aposentado
- Pessoa física geral

### 1.2. Perfil Autônomo
Quando `tipo_uso = autonomo`, o select mostra:
- Freelancer
- Prestador de serviços
- Vendedor autônomo
- MEI
- Profissional liberal
- Criador de conteúdo
- Motorista ou entregador
- Pequeno empreendedor individual

### 1.3. Perfil Empresa
Quando `tipo_uso = empresa`, o select mostra:
- MEI com equipe
- Microempresa
- Pequena empresa
- Comércio
- Prestadora de serviços
- Loja física
- Loja online
- Escritório
- Outro negócio

---

## 2. Arquivos Alterados

### Frontend
- `js/auth.js` - Atualizada função `alternarCampos()` para mostrar opções corretas de perfil detalhado conforme tipo_uso
- `cadastro.html` - Atualizado texto das opções de interface para ficar mais claro
- `js/layout.js` - Adicionada Agenda no menu para todos os perfis (pessoal, autonomo, empresa)
- `js/agenda.js` - Atualizado comentário para refletir que Agenda é acessível para todos os perfis

### Detalhes das Alterações

#### js/auth.js
```javascript
alternarCampos() {
  const uso = document.querySelector('[name="tipo_uso"]:checked')?.value || 'pessoal';
  const perfil = document.getElementById('perfil_detalhado');
  if (!perfil) return;
  const opcoes = {
    pessoal: [
      { value: 'estudante', label: 'Estudante' },
      { value: 'trabalhador_clt', label: 'Trabalhador CLT' },
      { value: 'desempregado', label: 'Desempregado' },
      { value: 'controle_familiar', label: 'Controle familiar' },
      { value: 'aposentado', label: 'Aposentado' },
      { value: 'pessoa_fisica_geral', label: 'Pessoa física geral' }
    ],
    autonomo: [
      { value: 'freelancer', label: 'Freelancer' },
      { value: 'prestador_servicos', label: 'Prestador de serviços' },
      { value: 'vendedor_autonomo', label: 'Vendedor autônomo' },
      { value: 'mei', label: 'MEI' },
      { value: 'profissional_liberal', label: 'Profissional liberal' },
      { value: 'criador_conteudo', label: 'Criador de conteúdo' },
      { value: 'motorista_entregador', label: 'Motorista ou entregador' },
      { value: 'pequeno_empreendedor_individual', label: 'Pequeno empreendedor individual' }
    ],
    empresa: [
      { value: 'mei_equipe', label: 'MEI com equipe' },
      { value: 'microempresa', label: 'Microempresa' },
      { value: 'pequena_empresa', label: 'Pequena empresa' },
      { value: 'comercio', label: 'Comércio' },
      { value: 'prestadora_servicos', label: 'Prestadora de serviços' },
      { value: 'loja_fisica', label: 'Loja física' },
      { value: 'loja_online', label: 'Loja online' },
      { value: 'escritorio', label: 'Escritório' },
      { value: 'outro_negocio', label: 'Outro negócio' }
    ]
  };
  perfil.innerHTML = (opcoes[uso] || []).map((v) => `<option value="${v.value}">${v.label}</option>`).join('');
}
```

#### cadastro.html
```html
<div class="input-group">
  <label>Interface</label>
  <div class="radio-row">
    <label><input type="radio" name="nivel_interface" value="simples" checked> Simples: essencial</label>
    <label><input type="radio" name="nivel_interface" value="avancado"> Avançado: detalhes</label>
  </div>
</div>
```

#### js/layout.js
```javascript
const MENUS = {
  pessoal: [
    { href: 'inicio.html', label: 'Início' },
    { href: 'registrar.html', label: 'Registrar' },
    { href: 'movimentacoes.html', label: 'Movimentações' },
    { href: 'agenda.html', label: 'Agenda' },  // ADICIONADO
    { href: 'meu-dinheiro.html', label: 'Meu dinheiro' },
    { href: 'relatorios.html', label: 'Relatórios' },
    { href: 'configuracoes.html', label: 'Configurações' }
  ],
  autonomo: [
    { href: 'inicio.html', label: 'Início' },
    { href: 'registrar.html', label: 'Registrar' },
    { href: 'movimentacoes.html', label: 'Movimentações' },
    { href: 'agenda.html', label: 'Agenda' },  // ADICIONADO
    { href: 'clientes.html', label: 'Clientes e serviços' },
    { href: 'meu-dinheiro.html', label: 'Meu dinheiro' },
    { href: 'relatorios.html', label: 'Relatórios' },
    { href: 'configuracoes.html', label: 'Configurações' }
  ],
  empresa: [
    { href: 'inicio.html', label: 'Início' },
    { href: 'registrar.html', label: 'Registrar' },
    { href: 'movimentacoes.html', label: 'Caixa' },
    { href: 'agenda.html', label: 'Agenda' },  // ADICIONADO
    { href: 'agenda.html', label: 'A pagar e receber' },
    { href: 'clientes.html', label: 'Clientes e fornecedores' },
    { href: 'relatorios.html', label: 'Relatórios' },
    { href: 'configuracoes.html', label: 'Configurações' }
  ]
};
```

---

## 3. Como o Select Muda Conforme o Tipo de Uso

O select de `perfil_detalhado` atualiza automaticamente quando o usuário troca entre Pessoal, Autônomo e Empresa.

### Funcionamento
1. Quando a página carrega, o select é preenchido com as opções do tipo de uso selecionado (padrão: pessoal)
2. Quando o usuário clica em outro tipo de uso (autonomo ou empresa), o evento `change` é disparado
3. A função `alternarCampos()` é chamada
4. A função verifica qual tipo de uso está selecionado
5. O select é atualizado com as opções correspondentes ao tipo de uso escolhido

### Exemplo
- Usuário seleciona "Pessoal" → select mostra: Estudante, Trabalhador CLT, Desempregado, etc.
- Usuário muda para "Autônomo" → select mostra: Freelancer, Prestador de serviços, Vendedor autônomo, etc.
- Usuário muda para "Empresa" → select mostra: MEI com equipe, Microempresa, Pequena empresa, etc.

---

## 4. Como a Agenda Funciona para Pessoal, Autônomo e Empresa

### 4.1. Acesso à Agenda
Todos os perfis agora têm acesso à agenda financeira através do menu lateral:
- **Pessoal**: Menu "Agenda"
- **Autônomo**: Menu "Agenda"
- **Empresa**: Menu "Agenda" e "A pagar e receber" (ambos apontam para agenda.html)

### 4.2. Título da Agenda
- **Pessoal**: Título "Agenda financeira"
- **Autônomo**: Título "Agenda financeira"
- **Empresa**: Título "A pagar e receber"

### 4.3. Funcionalidades da Agenda
A agenda funciona da mesma forma para todos os perfis:
- Criar contas a pagar
- Criar contas a receber
- Listar pendências
- Listar atrasadas
- Realizar agenda (gera movimentação real)
- Cancelar agenda

### 4.4. Tipos de Compromissos por Perfil

#### Perfil Pessoal
A agenda permite:
- Aluguel
- Conta de luz
- Conta de água
- Internet
- Cartão de crédito
- Mensalidade
- Salário previsto
- Dinheiro a receber
- Parcelas
- Compromissos financeiros pessoais

#### Perfil Autônomo
A agenda permite:
- Contas a pagar
- Contas a receber
- Pagamentos de clientes
- Cobranças pendentes
- Serviços agendados
- Parcelas
- Impostos ou taxas
- Despesas de trabalho

#### Perfil Empresa
A agenda permite:
- Contas a pagar
- Contas a receber
- Fornecedores
- Clientes
- Folha/pagamentos
- Impostos
- Aluguel comercial
- Serviços contratados
- Parcelas
- Vencimentos recorrentes

### 4.5. Categorias
O sistema permite que cada usuário crie suas próprias categorias conforme sua necessidade. Não há categorias fixas por perfil, o que dá flexibilidade para o usuário adaptar o sistema ao seu contexto.

### 4.6. Regra Principal: Agenda vs Movimentação Real
- **Agenda financeira**: Previsão/pendência, NÃO altera saldo
- **Movimentação real**: Altera saldo imediatamente
- **Realizar agenda**: Cria movimentação real correspondente e altera saldo

---

## 5. Tela Registrar

A tela Registrar já possui as 5 opções para todos os perfis:
1. Entrada real
2. Saída real
3. Transferência entre contas
4. Conta a pagar futura (agenda)
5. Conta a receber futura (agenda)

A diferença entre os perfis está nas categorias disponíveis, que podem ser criadas conforme a necessidade de cada usuário.

---

## 6. Como Testar Passo a Passo

### 6.1. Teste 1: Cadastro Escolhendo Pessoal
1. Acessar http://localhost:3000/cadastro.html
2. Preencher:
   - Nome: Teste Pessoal
   - E-mail: teste@pessoal.com
   - Senha: 123456
   - Tipo de uso: Pessoal
   - Documento tipo: CPF
   - Documento número: 123.456.789-00
3. Verificar se o select "Perfil detalhado" mostra:
   - Estudante
   - Trabalhador CLT
   - Desempregado
   - Controle familiar
   - Aposentado
   - Pessoa física geral
4. Selecionar uma opção (ex: Trabalhador CLT)
5. Interface: selecionar "Simples: essencial"
6. Clicar em "Cadastrar"
7. Verificar se redireciona para login

### 6.2. Teste 2: Cadastro Escolhendo Autônomo
1. Acessar http://localhost:3000/cadastro.html
2. Preencher:
   - Nome: Teste Autônomo
   - E-mail: teste@autonomo.com
   - Senha: 123456
   - Tipo de uso: Autônomo
   - Documento tipo: CPF
   - Documento número: 987.654.321-00
3. Verificar se o select "Perfil detalhado" mostra:
   - Freelancer
   - Prestador de serviços
   - Vendedor autônomo
   - MEI
   - Profissional liberal
   - Criador de conteúdo
   - Motorista ou entregador
   - Pequeno empreendedor individual
4. Selecionar uma opção (ex: Freelancer)
5. Interface: selecionar "Avançado: detalhes"
6. Clicar em "Cadastrar"
7. Verificar se redireciona para login

### 6.3. Teste 3: Cadastro Escolhendo Empresa
1. Acessar http://localhost:3000/cadastro.html
2. Preencher:
   - Nome: Teste Empresa
   - E-mail: teste@empresa.com
   - Senha: 123456
   - Tipo de uso: Empresa
   - Documento tipo: CNPJ
   - Documento número: 12.345.678/0001-90
3. Verificar se o select "Perfil detalhado" mostra:
   - MEI com equipe
   - Microempresa
   - Pequena empresa
   - Comércio
   - Prestadora de serviços
   - Loja física
   - Loja online
   - Escritório
   - Outro negócio
4. Selecionar uma opção (ex: Microempresa)
5. Interface: selecionar "Simples: essencial"
6. Clicar em "Cadastrar"
7. Verificar se redireciona para login

### 6.4. Teste 4: Usuário Pessoal Criar Conta Futura na Agenda
1. Fazer login com usuário pessoal
2. Verificar se menu lateral mostra "Agenda"
3. Clicar em "Agenda"
4. Verificar se título é "Agenda financeira"
5. Ir para "Registrar"
6. Selecionar aba "Conta a pagar"
7. Preencher:
   - O que foi: Aluguel
   - Valor: 1000
   - Vencimento: data futura
   - Conta: selecionar conta
   - Categoria: Moradia
8. Clicar em "Salvar"
9. Ir para "Agenda" e verificar se conta aparece
10. Ir para "Início" e verificar que saldo NÃO foi alterado

### 6.5. Teste 5: Usuário Autônomo Criar Conta a Receber de Cliente
1. Fazer login com usuário autônomo
2. Verificar se menu lateral mostra "Agenda"
3. Clicar em "Agenda"
4. Verificar se título é "Agenda financeira"
5. Ir para "Registrar"
6. Selecionar aba "Conta a receber"
7. Preencher:
   - O que foi: Serviço de design
   - Valor: 500
   - Vencimento: data futura
   - Conta: selecionar conta
   - Categoria: Serviços
8. Clicar em "Salvar"
9. Ir para "Agenda" e verificar se conta aparece
10. Ir para "Início" e verificar que saldo NÃO foi alterado

### 6.6. Teste 6: Usuário Empresa Criar Conta a Pagar para Fornecedor
1. Fazer login com usuário empresa
2. Verificar se menu lateral mostra "Agenda" e "A pagar e receber"
3. Clicar em "Agenda"
4. Verificar se título é "A pagar e receber"
5. Ir para "Registrar"
6. Selecionar aba "Conta a pagar"
7. Preencher:
   - O que foi: Fornecedor X
   - Valor: 2000
   - Vencimento: data futura
   - Conta: selecionar conta
   - Categoria: Fornecedores
8. Clicar em "Salvar"
9. Ir para "Agenda" e verificar se conta aparece
10. Ir para "Início" e verificar que saldo NÃO foi alterado

### 6.7. Teste 7: Criar Agenda Não Altera Saldo
1. Criar uma conta a pagar na agenda
2. Verificar saldo antes e depois
3. Saldo deve permanecer inalterado
4. Agenda deve aparecer na tela Agenda

### 6.8. Teste 8: Realizar Agenda Cria Movimentação Real e Altera Saldo
1. Criar uma conta a pagar na agenda
2. Verificar saldo antes
3. Ir para Agenda e clicar em "Realizar"
4. Verificar se status mudou para "Pago"
5. Ir para Movimentações e verificar se saída foi criada
6. Ir para Início e verificar se saldo foi atualizado

---

## 7. Observações Importantes

### 7.1. Banco de Dados
O sistema usa os campos já existentes:
- `usuarios.tipo_uso`
- `usuarios.perfil_detalhado`
- `usuarios.nivel_interface`
- `agenda_financeira`
- `movimentacoes`
- `contas_pagar`
- `contas_receber`

Não apaga dados.
Não usa localStorage como banco principal.
Não usa DROP, DELETE ou TRUNCATE.

### 7.2. Categorias
O sistema permite que cada usuário crie suas próprias categorias conforme sua necessidade. Não há categorias fixas por perfil, o que dá flexibilidade para o usuário adaptar o sistema ao seu contexto.

### 7.3. Segurança
Todas as rotas exigem autenticação JWT.
Todas as consultas respeitam o usuário logado.
Nenhum usuário pode acessar dados de outro usuário.

---

## 8. Status Final

- ✅ Perfil detalhado corrigido com opções por tipo_uso
- ✅ Modo de interface com texto mais claro
- ✅ Agenda adicionada no menu para todos os perfis
- ✅ Registrar já tem opções de agenda para todos
- ✅ Categorias flexíveis por usuário
- ✅ Regra de agenda vs movimentação real mantida

**As correções de cadastro e agenda estão concluídas.**
