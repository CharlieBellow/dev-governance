# Regras Específicas do Projeto: [NOME DO PROJETO]

> Regras **deste projeto** que complementam ou especializam o `GLOBAL_RULES.md`. Em conflito, este arquivo prevalece.
> Padrões técnicos que nasceram de decisão registrada ficam em `.agents/project/docs/back/README.md` e `.agents/project/docs/front/README.md` (com o RFC de origem) — aqui fica só o resumo operacional.

## 1. Escopo Tecnológico
- **Back-end:** (ex.: NestJS + TypeScript estrito, arquitetura modular)
- **Front-end:** (ex.: Next.js App Router + Tailwind + shadcn/ui)
- **Banco / ORM:** (ex.: Prisma + MySQL)
- **Validação:** (ex.: Zod nas bordas)

## 2. Comandos do Projeto
| Ação | Comando |
|---|---|
| Instalar | `pnpm install` |
| Rodar em dev | |
| Testes | `pnpm vitest run` |
| Lint / typecheck | |

## 3. Camadas e Responsabilidades
- **Domínio:** (onde fica, o que pode/não pode importar)
- **Aplicação:**
- **Infraestrutura:**

## 4. Restrições Específicas
- (ex.: Proibido expor entidades de banco diretamente nos controllers; utilize DTOs de resposta.)
- (ex.: Toda rota exige guard de autenticação, exceto as listadas em BE-000X.)

## 5. Responsáveis (usado nas notificações de RFC)
| Área | Responsável | Aprova |
|---|---|---|
| Back-end | @ | RFCs BE- e designs de API |
| Front-end | @ | RFCs FE- e designs de UI |
| Design system | @ | Categoria "Altera design system" |
| Infraestrutura | @ | Categoria "Requer infraestrutura nova" |
