# Diretrizes Globais de Engenharia de Software e Padrões de Código

## 1. Stack Tecnológica Primária (Obrigatório)
- **Linguagem Principal:** TypeScript em modo estrito (`strict: true`). Proibido o uso de `any` ou type assertions não seguras.
- **Ecossistema Back-end:** NestJS (modularidade, injeção de dependência nativa, DTOs validados com Zod).
- **Ecossistema Front-end:** Next.js (App Router, Server/Client Components bem delimitados, tipagem rigorosa de props/estados).
- **Persistência & Banco:** Prisma ORM com PostgreSQL ou MySQL.

## 2. Matriz de Roteamento Dinâmico de Skills
Sempre que for iniciar uma tarefa, o agente DEVE ler as diretrizes contidas na skill do domínio correspondente antes de gerar o código.

> **Onde ficam os caminhos:** no repositório dev-governance, `.agents/global/` está na raiz. Em um **projeto consumidor**, `.agents/global/` = `node_modules/dev-governance/.agents/global/` (instalado como dependência, somente leitura) e `.agents/project/` é a pasta local do projeto (copiada de `node_modules/dev-governance/utils/.agents/project/`).

| Domínio da Task | Tipo de Alteração / Contexto | Skill Obrigatória para Consulta |
| :--- | :--- | :--- |
| **Back-end** | Serviços, Módulos, Controllers, DTOs NestJS | `.agents/global/skills/backend-skill/nestjs-patterns/SKILL.md` |
| **Back-end** | Mapeamento ORM, Queries, Migrações, Transações Prisma | `.agents/global/skills/backend-skill/prisma-patterns/SKILL.md` |
| **Back-end** | Padrões de Arquitetura de API REST, Repositórios, Services | `.agents/global/skills/backend-skill/backend-patterns/SKILL.md` |
| **Back-end** | Contrato de API REST, Padrões de URL, Status HTTP, Paginação | `.agents/global/skills/api-design/SKILL.md` |
| **Front-end** | Componentes React, Hooks, Client/Server Components | `.agents/global/skills/frontend-skills/react-patterns/SKILL.md` |
| **Front-end** | Estrutura Next.js, App Router, Turbopack, Performance de UI | `.agents/global/skills/frontend-skills/nextjs-turbopack/SKILL.md` |
| **Front-end** | Otimização de Performance React, Re-renders, Bundle Size | `.agents/global/skills/frontend-skills/react-performance/SKILL.md` |
| **Front-end / A11y**| Acessibilidade, Semântica HTML, ARIA, Navegação por Teclado | `.agents/global/skills/frontend-skills/frontend-a11y/SKILL.md` |
| **Testes** | Fluxo TDD (Red-Green-Refactor), Testes de Unidade e Integração | `.agents/global/skills/tdd-workflow/SKILL.md` |
| **Testes** | Testes de Componentes React, Custom Hooks (RTL + Vitest) | `.agents/global/skills/frontend-skills/react-testing/SKILL.md` |
| **Testes** | Testes End-to-End (E2E) com Playwright | `.agents/global/skills/e2e-testing/SKILL.md` |
| **DevOps / Infra** | Dockerfiles, Docker Compose, Multi-stage builds | `.agents/global/skills/docker-patterns/SKILL.md` |
| **Segurança** | Autenticação, Autorização, Sanitização Zod, JWT, Cookies | `.agents/global/skills/dg-security-review/SKILL.md` |
| **Resiliência** | Exceções customizadas, Retries, Tratamento de erros | `.agents/global/skills/error-handling/SKILL.md` |
| **Governança** | Nova convenção, endpoint consumido por outra área, novo componente/variante/token visual, infra nova, divergência de RFC | `.agents/global/skills/rfc-workflow/SKILL.md` |
| **Planejamento** | Entrevista de requisitos antes de codar | `.agents/global/skills/grill-plan/SKILL.md` |
| **Planejamento** | Spec técnica da feature / fatiamento em tasks | `.agents/global/skills/to-spec/SKILL.md` · `.agents/global/skills/to-tickets/SKILL.md` |
| **Execução** | Implementar uma task / registrar progresso | `.agents/global/skills/execute-task/SKILL.md` · `.agents/global/skills/update-progress/SKILL.md` |
| **Git** | Mensagens de commit, branches, texto de Pull Request | `.agents/project/docs/convencoes-git.md` + `.agents/global/skills/smart-commit/SKILL.md` · `.agents/global/skills/create-pr/SKILL.md` |

## 2.1 Pipeline de Trabalho (Issue → PR)
Toda issue percorre as etapas abaixo, nesta ordem. Etapas marcadas como condicionais só acontecem quando o critério se aplica.

| # | Etapa | Skill | Artefato gerado |
|---|---|---|---|
| 1 | Entender e questionar a issue | `grill-plan` | (conversa) |
| 2 | **Condicional:** registrar decisão de padrão/contrato | `rfc-workflow` | RFC e/ou design em `.agents/project/docs/<area>/` |
| 3 | Aguardar aprovação do RFC (se a categoria exige confirmação ativa) | — | Status `Aceito` no RFC |
| 4 | Especificar a feature | `to-spec` | `.agents/project/docs/specs/<feature>-spec.md` |
| 5 | Fatiar em tasks verticais | `to-tickets` | `.agents/project/tasks/<NNN>-<slug>#<issue>.md` (ex.: `001-rota-delete-users#42.md`) |
| 6 | Implementar cada task com TDD | `execute-task` + `tdd-workflow` (+ skill do domínio da matriz) | Código + testes |
| 7 | Registrar o progresso | `update-progress` | `.agents/project/docs/progress/<NNN>-<slug>#<issue>-log.md` |
| 8 | Commit e PR (PR quando **todas** as tasks `#<issue>` estiverem concluídas) | `smart-commit` / `create-pr` | Commits + texto de PR da issue |
| 9 | Fechar o ciclo | — | Status do RFC → `Implementado`, design → `Pronto`, índices atualizados |

## 2.2 Documentação Antes do Código (Governança de Decisões)
- Todo projeto que usa o dev-governance mantém `.agents/project/docs/` como **fonte da verdade** das decisões técnicas: RFCs e designs separados por área (`back/`, `front/`, `geral/`), com processo e convenções de git compartilhados.
- **Decisões registradas em `.agents/project/docs/` têm precedência** sobre "boas práticas" genéricas e sobre as regras genéricas deste arquivo quando houver conflito. Divergir de um RFC exige um novo RFC — nunca implementação silenciosa.
- **Front-end:** nenhum componente, variante ou valor visual fora de `.agents/project/docs/front/design-system.md` sem RFC aprovado.

## 3. Arquitetura e Padrões de Projeto (Core)
- **Domain-Driven Design (DDD) & Clean Architecture:**
  - **Domínio (`src/domain/`):** Contém regras de negócio puras, entidades e Value Objects. É 100% agnóstico de frameworks (sem NestJS, sem Prisma, sem Express).
  - **Aplicação (`src/application/`):** Contém Casos de Uso, interfaces de repositórios e DTOs.
  - **Infraestrutura (`src/infrastructure/`):** Contém implementações concretas (Prisma, controllers NestJS, serviços externos).
- **Princípios SOLID, DRY e KISS:**
  - **Single Responsibility:** Métodos e funções devem fazer apenas uma coisa bem feita.
  - **Inversão de Dependência:** O domínio e a aplicação dependem apenas de abstrações/interfaces.
  - **DRY:** Extraia funções puras e evite duplicação de lógica de negócio.

## 4. Clean Code, Validação e Segurança Crítica
- **Validação com Zod:** É obrigatório o uso de schemas Zod em todas as fronteiras de entrada de dados (payloads, query params e DTOs) para garantir tipagem runtime e segurança.
- **Proteção contra Vazamento de Dados:** NUNCA retorne entidades de banco ou dados sensíveis diretamente nas respostas de API. Utilize DTOs de resposta/Presenters.
- **Tratamento de Exceções:** Utilize exceções customizadas de domínio herdando de uma classe base (ex: `DomainException`) e tratamento centralizado (Filters no NestJS / Error Boundaries no Next.js). Proibido usar blocos `try/catch` genéricos na regra de negócio.

## 5. Qualidade e Cobertura de Testes (Definition of Done)
- **Regra de Ouro (TDD):** Nenhuma feature ou caso de uso é considerado pronto sem a respectiva cobertura de testes unitários desenvolvidos com **Vitest** ou **Testing Library**.
- **Isolamento de Testes:** Utilize mocks limpos para isolar dependências externas durante os testes de Casos de Uso e Domínio.