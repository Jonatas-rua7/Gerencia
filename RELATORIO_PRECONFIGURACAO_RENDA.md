# Relatório de Pré-configuração de Renda Prevista

## 1. Onde a pré-configuração de renda foi adicionada
A pré-configuração de renda foi adicionada em `configuracoes.html` dentro da seção de Configurações, com um novo formulário chamado "Minha renda prevista".

## 2. Quais campos foram implementados
Os campos implementados são:
- `tipo_renda`
- `descricao`
- `valor_previsto`
- `frequencia` (`unica`, `semanal`, `quinzenal`, `mensal`, `variavel`)
- `dia_recebimento`
- `conta_id`
- `criar_na_agenda`

## 3. Como funciona para Pessoal, Autônomo e Empresa
O formulário apresenta opções de tipo de renda adaptadas ao `tipo_uso` do usuário:
- Perfil `pessoal`: salário, mesada, auxílio/benefício, renda extra, renda variável, outro.
- Perfil `autonomo`: pagamento por cliente, pagamento por serviço, renda semanal, renda mensal variável, comissão, vendas, outro.
- Perfil `empresa`: vendas, prestação de serviço, contratos mensais, recebimentos recorrentes, faturamento variável, outro.

## 4. Como a renda prevista entra na Agenda
Quando o usuário marca `criar_na_agenda` como sim, o sistema cria um item em `agenda_financeira` com:
- `tipo = conta_receber`
- `descricao` baseada na descrição informada
- `valor_previsto`
- `data_prevista` calculada a partir do `dia_recebimento`

Se a frequência for `semanal`, `quinzenal` ou `mensal`, o sistema também cria uma recorrência em `recorrencias` para manter a previsão no fluxo de agenda.

## 5. Como realizar essa renda e transformar em movimentação real
A renda prevista criada na agenda permanece como previsão. Quando o usuário realiza essa agenda usando a funcionalidade existente de realização de agenda (`/agenda/:id/realizar`), o sistema cria uma movimentação real de entrada e altera o saldo somente no momento da realização.

## 6. Quais arquivos foram alterados
- `configuracoes.html`
- `js/configuracoes.js`
- `js/inicio.js`
- `js/api.js`
- `backend/src/server.js`
- `backend/src/controllers/rendas.controller.js`
- `backend/src/routes/rendas.routes.js`
- `backend/sql/migracao_rendas_previstas.sql`

## 7. Quais tabelas foram usadas ou criadas
- `rendas_previstas` (nova tabela criada)
- `agenda_financeira` (usada para inserir previsão financeira no fluxo de agenda)
- `recorrencias` (usada quando a renda prevista deve gerar recorrência)
- `contas` (para validar a conta/carteira escolhida pelo usuário)
- `usuarios` (para garantir que a renda prevista pertença ao usuário autenticado)

## 8. Como testar passo a passo
1. Crie um usuário com perfil `pessoal` ou outro tipo no cadastro.
2. Acesse `configuracoes.html` após o login.
3. Preencha a seção "Minha renda prevista" com tipo de renda, valor médio, frequência, dia de recebimento, conta e marque "Sim" em criar previsão na agenda.
4. Salve o formulário.
5. Acesse `agenda.html` e verifique que existe um item `conta_receber` previsto com descrição e valor correspondentes.
6. Verifique que o saldo atual não foi alterado pela criação da renda prevista.
7. Realize o item de agenda previsto usando a funcionalidade de realização de agenda.
8. Verifique que, após a realização, uma movimentação real de entrada foi criada e o saldo aumentou.
