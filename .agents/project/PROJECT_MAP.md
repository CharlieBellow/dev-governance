# 🗺️ Project Map & Architecture Guidelines (dev-governance)

> GPS do repositório **dev-governance**. O modelo de PROJECT_MAP para projetos consumidores fica em `utils/.agents/project/PROJECT_MAP.md`.

## 📁 Arquitetura de Pastas Oficial

- `AGENTS.md`                    # Protocolo do agente para ESTE repositório
- `README.md`                    # O que é o dev-governance e como instalar em um projeto
- `package.json`                 # Manifesto do pacote (precisa estar na raiz para instalar via git)
- `.agents/`
  - `global/`                    # ⬅ Distribuído aos projetos via node_modules (somente leitura lá)
    - `GLOBAL_RULES.md`          # Regras universais, Matriz de Skills e Pipeline de Trabalho
    - `specs/template-spec.md`   # Blueprint de spec
    - `task/template-task.md`    # Formato padrão de task (usado por to-tickets)
    - `skills/`
      - `grill-plan/`            # 1. Entrevista de requisitos antes de codar
      - `rfc-workflow/`          # 2. Classifica e gera RFC/design antes do código
      - `to-spec/`               # 4. Spec técnica da feature
      - `to-tickets/`            # 5. Fatiamento em tasks verticais
      - `execute-task/`          # 6. Execução isolada de uma task
      - `tdd-workflow/`          # 6. Ciclo Red → Green → Refactor
      - `create-test-from-task/` # 6. Geração de testes a partir da task
      - `update-progress/`       # 7. Diário de bordo da task
      - `smart-commit/`          # 8. Conventional Commits + PR
      - `create-pr/`             # 8. Texto de PR a partir de task + log
      - `backend-skill/`         # nestjs-patterns, prisma-patterns, backend-patterns
      - `frontend-skills/`       # react-patterns, nextjs-turbopack, react-testing, frontend-a11y, react-performance, frontend-patterns
      - `api-design/` `error-handling/` `dg-security-review/` `docker-patterns/` `e2e-testing/` `accessibility/`
      - `learn-and-adapt/` `agent-self-evaluation/` `test-collaboration/`
  - `project/`                   # Instância de .agents/project usada POR ESTE repositório
    - `PROJECT_MAP.md`           # Este mapa
    - `PROJECT_RULES.md`         # Regras do projeto de exemplo (To-Do API)
    - `tasks/`                   # Tasks deste repositório (NNN-slug.md)
    - `docs/`                    # Mesma estrutura de utils/.agents/project/docs (ver abaixo)
- `utils/`                       # ⬅ Espelho da RAIZ do projeto consumidor: tudo aqui é copiado para lá
  - `AGENTS.md`                  # → AGENTS.md na raiz do projeto (protocolo do agente)
  - `.github/pull_request_template.md` # → template de PR na raiz do projeto
  - `pnpm-workspace.yaml`        # Trecho de configuração pnpm para o consumidor
  - `.agents/project/`           # → copiar para `.agents/project/` do projeto
    - `PROJECT_MAP.md`           # Modelo de mapa (preencher com o src/ do projeto)
    - `PROJECT_RULES.md`         # Modelo de regras do projeto (preencher)
    - `tasks/`                   # Tasks do projeto (geradas por to-tickets)
    - `docs/`
      - `README.md`              # Porta de entrada da documentação + regras para IA
      - `guia-fluxo-documentacao.md` # Quando abrir RFC/design, janelas de aviso
      - `convencoes-git.md`      # Branches, commits, PRs
      - `_templates/`            # rfc-completo, rfc-leve, design-api, design-ui
      - `geral/rfcs/`            # RFCs transversais (GER-)
      - `back/`                  # README (padrões vigentes), rfcs/ (BE-), designs/ (BE-D-)
      - `front/`                 # README, design-system.md, rfcs/ (FE-), designs/ (FE-D-)
      - `specs/`                 # Specs geradas por to-spec
      - `progress/`              # Logs gerados por update-progress
- `src/`                         # Código de exemplo para validar as skills
  - `domain/`                    # Entidades de negócio puras (sem frameworks)

## 🛠️ Regras de Ouro para o Agente
1. **Eficiência de Tokens:** Leia prioritariamente este mapa e o arquivo da Task ativa em `.agents/project/tasks/` antes de tocar em qualquer código.
2. **Seleção de Skill por Domínio:** Consulte a Matriz de Skills e o Pipeline de Trabalho no `GLOBAL_RULES.md`.
3. **Sincronia:** Mudou a estrutura de `.agents/project/`? Replique em `utils/.agents/project/` (exceto tasks, specs e logs deste repositório).
4. **Testes Obrigatórios:** Todo caso de uso ou regra de domínio exige teste automatizado correspondente.
