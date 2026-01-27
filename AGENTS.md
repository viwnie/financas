# Projeto Despesa

Aplicativo de gestão financeira pessoal e compartilhada, com foco em controle de despesas, metas e indicadores. O repositório é dividido em backend (API) e frontend (web).

## Estrutura principal
- `backend/`: API e lógica de negócio (Bun + Prisma), autenticação e serviços financeiros.
- `frontend/`: Next.js (App Router) com Tailwind CSS, shadcn/ui, React Query e Zustand.
- `docker-compose.yml`: infraestrutura local (serviços auxiliares como banco de dados).

## Entradas importantes no frontend
- `frontend/src/app/auth/login/page.tsx`: tela de login.
- `frontend/src/app/auth/register/page.tsx`: tela de registro.
- `frontend/src/app/globals.css`: tokens de tema (claro/escuro), tipografia e utilitários visuais.
- `frontend/src/app/layout.tsx`: configuração de fontes e layout global.

## Comandos rápidos
- Infra: `docker-compose up -d`
- Backend: `cd backend; bun install; bunx prisma generate; bunx prisma db push; bun run start:dev`
- Frontend: `cd frontend; bun install; bun run dev`
