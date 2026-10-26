# 🗺️ Project Map & Architecture Guidelines ([NOME DO PROJETO])

> GPS do projeto para o agente de IA. A seção **Governança** é fixa (modelo do dev-governance). A seção **Código-fonte** deve ser preenchida e mantida pelo time — é ela que evita o agente varrer o repositório inteiro.

## 📁 Governança (fixo)

- `AGENTS.md`                    # Protocolo do agente (copiado de node_modules/dev-governance/utils/AGENTS.md)
- `.github/pull_request_template.md` # Template de PR (copiado de node_modules/dev-governance/utils/.github/)
- `node_modules/dev-governance/.agents/global/` # = `.agents/global/` — regras e skills globais (somente leitura)
  - `GLOBAL_RULES.md`            # Regras universais, Matriz de Skills e Pipeline de Trabalho
  - `task/template-task.md`      # Formato padrão de task
  - `skills/`                    # grill-plan, rfc-workflow, to-spec, to-tickets, execute-task, update-progress, smart-commit, create-pr...
- `.agents/project/`
  - `PROJECT_MAP.md`             # Este mapa
  - `PROJECT_RULES.md`           # Stack e regras específicas deste projeto
  - `tasks/`                     # Tasks de fatia vertical (NNN-slug#<issue>.md — ex.: 001-rota-delete-users#42.md)
  - `docs/`
    - `README.md`                # Porta de entrada da documentação + regras para IA
    - `guia-fluxo-documentacao.md` # Quando abrir RFC/design, janelas de aviso
    - `convencoes-git.md`        # Branches, commits, PRs
    - `_templates/`              # rfc-completo, rfc-leve, design-api, design-ui
    - `geral/rfcs/`              # RFCs transversais (GER-)
    - `back/`                    # README (padrões vigentes), rfcs/ (BE-), designs/ (BE-D-)
    - `front/`                   # README, design-system.md, rfcs/ (FE-), designs/ (FE-D-)
    - `specs/`                   # Specs de feature (<feature>-spec.md)
    - `progress/`                # Diário de bordo por task (<NNN>-<slug>#<issue>-log.md)

## 📁 Código-fonte (preencher)

> Liste as pastas principais e o que cada uma contém. Exemplo para back-end NestJS com Clean Architecture:

- `src/`
  - `domain/`                    # Entidades de negócio puras (sem frameworks)
  - `application/`               # Casos de uso e DTOs de validação (Zod)
  - `infrastructure/`            # Repositórios, banco de dados, controllers NestJS
  - `modules/<modulo>/`          # (se o projeto organiza por módulo, descreva aqui)

> Exemplo para front-end Next.js:

- `src/app/`                     # Rotas (App Router)
- `src/components/ui/`           # Componentes base = design system (ver docs/front/design-system.md)
- `src/components/<feature>/`    # Componentes específicos de feature (compõem os de ui/)

## 🛠️ Regras de Ouro para o Agente
1. **Eficiência de Tokens:** Leia prioritariamente este mapa e o arquivo da Task ativa em `.agents/project/tasks/` antes de tocar em qualquer código.
2. **Pipeline:** Siga o Pipeline de Trabalho do `GLOBAL_RULES.md` (grill-plan → rfc-workflow → to-spec → to-tickets → execute-task → update-progress → smart-commit/create-pr).
3. **Decisões registradas:** Antes de mudar padrão, contrato ou componente visual, consulte `.agents/project/docs/README.md`.
4. **Testes Obrigatórios:** Todo caso de uso ou regra de domínio exige teste automatizado correspondente.
