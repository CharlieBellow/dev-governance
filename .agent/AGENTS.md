# AGENTS.md - Governança e Regras do Projeto

## 🗺️ Mapeamento de Diretórios (Busque apenas aqui)

# Diretrizes do Projeto
Este projeto utiliza o framework ECC (Engineering Control Center) para governança de código.
- Siga estritamente as regras de Clean Code, arquitetura limpa e testes em Vitest.
- Consulte as skills globais disponíveis em `./node_modules/ecc-core/skills/`.
## Core Governance (Powered by ECC)
We integrate the Engineering Control Center (ECC) methodology to ensure:
1. **TDD First:** RED -> GREEN -> REFACTOR cycle enforced via Vitest.
2. **Clean Architecture / DDD:** Strict separation between Domain, Application, and Infrastructure layers.
3. **Immutability & Safety:** Zero raw error throwing, centralized exception filters, and strict TypeScript typing.

- **Domínio (Regras puras):** `src/domain/` (Agnóstico de frameworks: sem Prisma, sem NestJS).
- **Casos de Uso (Aplicação):** `src/application/`
- **Infraestrutura (Bordas):** `src/infrastructure/` (Repositórios, Controllers, ORM).
- **Tarefas e Especificações:** `.agent/project/project-tasks/` (Onde ficam os arquivos unificados de Task + Spec).
- **Testes:** `src/**/*.spec.ts`
- **Regras Gerais (Global Rules):** `.agent/global/GLOBAL_RULES.md`
- **Regras Específicas do Projeto:** `.agent/project/PROJECT_RULES.md`
- **Documentação de Progresso (Histórico):** `.agent/project/docs/progresso/` (Diário de bordo das entregas e decisões).

## ⚙️ Regras de Ouro, Segurança e Boas Práticas
1. **Busca Cirúrgica (Economia de Tokens):** Nunca leia o projeto inteiro. Leia apenas o mapa do projeto e o arquivo da Task correspondente.
2. **Stack Obrigatória:** TypeScript estrito (`strict mode`), NestJS (Back-end) e NextJS (Front-end).
3. **Segurança Crítica:** 
   - Proibido expor dados sensíveis em logs ou retornos de API.
   - Toda entrada de dados (payloads, query params) **deve** ser validada estritamente utilizando **Zod** através de DTOs tipados.
   - Sanitização obrigatória de inputs para evitar vulnerabilidades (ex: XSS, Injection).
4. **Padrões Arquiteturais:** Clean Architecture, Domain-Driven Design (DDD), SOLID, DRY e KISS.
5. **Clean Code:** Funções pequenas com responsabilidade única. Proibido uso de `any`. Tratamento centralizado de exceções (sem `try/catch` genéricos espalhados).
6. **Definition of Done (Testes):** Nenhuma feature é considerada pronta sem cobertura de testes unitários (**Vitest**) para o Domínio e Casos de Uso.


# Dev Governance - AI Agent Standards & ECC Integration

This repository establishes the architectural guidelines, task templates, and engineering standards enforced across all our projects using AI agents (Cline, Antigravity, Claude Code).
