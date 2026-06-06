# Gerencia! — Backend API

API REST do sistema Gerencia!, conectada ao PostgreSQL `gerencia_db`.

## Requisitos

- Node.js 18+
- PostgreSQL com banco `gerencia_db` já criado

## Configuração

```bash
cd backend
cp .env.example .env
# Edite .env com suas credenciais do PostgreSQL
npm install
```

## Executar

```bash
npm run dev
```

Acesse:

- Health: http://localhost:3000/api/health
- Front-end: http://localhost:3000/login.html

## Usuário demo (banco existente)

Se o dump oficial foi restaurado:

- **E-mail:** `demo@gerencia.com`
- **Senha:** consulte a documentação do seu TCC ou redefina via cadastro de novo usuário

## Rotas principais

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Status da API |
| POST | `/api/auth/login` | Login → JWT |
| POST | `/api/auth/cadastro` | Novo usuário |
| GET | `/api/dashboard` | Dashboard (`vw_dashboard_usuario`) |
| GET | `/api/movimentacoes` | Extrato real |
| GET/POST | `/api/agenda` | Agenda financeira |
| POST | `/api/agenda/:id/realizar` | `realizar_agenda()` |
| POST | `/api/agenda/:id/cancelar` | `cancelar_agenda()` |
| POST | `/api/transferencias` | `registrar_transferencia()` |
| GET | `/api/relatorios/*` | Views de relatório |

Todas as rotas protegidas exigem header:

```
Authorization: Bearer <token>
```

## Arquitetura

```
Frontend → API Express → PostgreSQL (funções e views do banco)
```

Dados financeiros **não** usam localStorage — apenas o token JWT no navegador.
