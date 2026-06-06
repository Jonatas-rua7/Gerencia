# Relatório de Correção Gerencia!

## 1. Arquivos alterados
- `js/layout.js`
- `backend/src/controllers/auth.controller.js`
- `backend/src/controllers/agenda.controller.js`
- `cadastro.html`

## 2. O que foi corrigido no cadastro
- O campo `perfil_detalhado` agora é obrigatório no frontend.
- O frontend atualiza automaticamente os valores de `perfil_detalhado` quando o usuário muda `tipo_uso`.
- O backend passou a validar `tipo_uso`, `perfil_detalhado` e `nivel_interface` antes de salvar.
- Os valores enviados pelo formulário (`nome`, `email`, `senha`, `tipo_uso`, `documento_tipo`, `documento_numero`, `perfil_detalhado`, `nivel_interface`) são persistidos em `usuarios`.

## 3. O que foi corrigido na agenda
- A agenda foi validada para todos os perfis: pessoal, autônomo e empresa.
- O backend respeita `req.usuarioId` ao listar, criar e realizar agenda, garantindo segurança por usuário.
- A criação de agenda para `conta_pagar` e `conta_receber` permanece como agendamento futuro e não altera saldo até a realização.
- No endpoint de realização de agenda foi corrigido o uso de data/valor padrão:
  - se nenhum corpo é enviado, usa `data_prevista` e `valor_previsto` da agenda
  - evita erro de `data_movimentacao` nula ao criar a movimentação real

## 4. O que foi corrigido no menu por perfil
- Ajustado o menu em `js/layout.js` para seguir os requisitos exatos de cada perfil:
  - Pessoal: `Início`, `Registrar`, `Movimentações`, `Agenda`, `Meu dinheiro`, `Relatórios`, `Configurações`
  - Autônomo: `Início`, `Registrar`, `Movimentações`, `Agenda`, `Clientes e serviços`, `Meu dinheiro`, `Relatórios`, `Configurações`
  - Empresa: `Início`, `Registrar`, `Caixa`, `Agenda`, `A pagar e receber`, `Clientes e fornecedores`, `Relatórios`, `Configurações`

## 5. Rotas alteradas/criadas
- Nenhuma rota nova foi criada.
- O endpoint `/api/agenda/:id/realizar` foi ajustado no controlador `backend/src/controllers/agenda.controller.js` para usar valores padrão quando o corpo da requisição está vazio.
- Mantidas as rotas existentes de autenticação e cadastro.

## 6. Tabelas usadas
- `usuarios`
- `agenda_financeira`
- `contas_pagar`
- `contas_receber`
- `contas`
- `categorias`
- `configuracoes_usuario`

## 7. Como testar passo a passo
1. Acesse `http://localhost:3000/cadastro.html`.
2. Preencha nome, email, senha, documento e escolha `Pessoal`.
   - Verifique se `perfil_detalhado` apresenta opções de perfil pessoal.
3. Troque para `Autônomo`.
   - Verifique se `perfil_detalhado` apresenta opções de autônomo.
4. Troque para `Empresa`.
   - Verifique se `perfil_detalhado` apresenta opções de empresa.
5. Conclua o cadastro e confirme que o menu mostra os itens corretos para o seu perfil.
6. Para um usuário pessoal, acesse `registrar.html` e crie um item de `Conta a pagar` futuro.
   - Confirme que a agenda aparece em `agenda.html` e que o saldo da conta não mudou.
7. Para um usuário autônomo, crie um cliente e depois uma `Conta a receber` de cliente.
8. Para um usuário empresa, crie um fornecedor e depois uma `Conta a pagar` de fornecedor.
9. Verifique que criar agenda não altera saldo inicial de conta.
10. Em `agenda.html`, clique em `Realizar` em uma agenda pendente.
    - Confirme que a agenda muda para `recebido` ou `pago` e que há uma movimentação real correspondente.

## 8. O que ainda falta
- Não foi alterado o backend SQL de procedures existentes, pois a lógica de `realizar_agenda` é assumida presente no banco.
- Caso a base de dados não tenha as colunas `perfil_detalhado` e `nivel_interface`, use `backend/sql/migracao_compatibilidade_frontend.sql` para aplicar a migração sem apagar dados.
