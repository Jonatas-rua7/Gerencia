# Gerencia!

Sistema web de **organização e gestão financeira** para uso **Pessoal**, **Autônomo** e **Empresa**.

Não é um sistema contábil, fiscal ou bancário — foca em clareza, previsibilidade e controle do dia a dia.

## Arquitetura

```
Frontend (HTML/CSS/JS)  →  API Node.js/Express  →  PostgreSQL (gerencia_db)
```

- Dados financeiros vêm do **PostgreSQL** via API.
- `localStorage` guarda apenas **token JWT** e preferências visuais.

## Regra principal

| Movimentações reais | Agenda financeira |
|--------------------|-------------------|
| Dinheiro que entrou/saiu | Previsões, pendências, parcelas |
| Tabela `movimentacoes` | Tabela `agenda_financeira` |
| Afeta saldo real | Só afeta saldo ao **realizar** |

## Como executar

### 1. PostgreSQL

Banco existente: `gerencia_db` (não recriar).

### 2. Backend

```bash
cd backend
cp .env.example .env
# Configure DB_PASSWORD e JWT_SECRET no .env
npm install
npm run dev
```

### 3. Acessar

- API: http://localhost:3000/api/health
- Sistema: http://localhost:3000/login.html

### Usuário demo (se o dump oficial estiver restaurado)

- E-mail: `demo@gerencia.com`
- Senha: conforme documentação do seu ambiente/TCC

## Estrutura do projeto

```
Gerencia!/
├── backend/           # API REST + PostgreSQL
├── assets/img/        # Logo e recursos visuais
├── css/style.css      # Tema verde/dourado
├── js/                # Módulos do front-end
├── *.html             # Páginas do sistema
└── README.md
```

## Módulos

- Início (dashboard com views do banco)
- Registrar (entrada, saída, agenda, transferência)
- Movimentações / Caixa (extrato real)
- Agenda financeira
- Meu dinheiro (contas, caixinhas, compromissos)
- Clientes e serviços / fornecedores
- Relatórios (views SQL)
- Configurações (perfil, temas, categorias)

## Documentação da API

Ver [backend/README.md](backend/README.md).

## Tecnologias

- Front: HTML5, CSS3, JavaScript, Chart.js
- Back: Node.js, Express, pg, bcrypt, JWT
- Banco: PostgreSQL (views e funções nativas)
