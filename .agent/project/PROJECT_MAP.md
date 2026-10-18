# 🗺️ Project Map & Architecture Guidelines (dev-governance)

## 📁 Arquitetura de Pastas Oficial

- `.agent/`
  - `AGENTS.md`                  # Diretrizes globais de atuação e regras do agente
  - `global/`
    - `GLOBAL_RULES.md`          # Regras universais de engenharia e Matriz de Skills
    - `skills/`                  # Skills Globais Reutilizáveis
      - `backend-skill/`         # nestjs-patterns, prisma-patterns, backend-patterns
      - `frontend-skills/`        # react-patterns, nextjs-turbopack, react-testing, frontend-a11y, react-performance
      - `tdd-workflow/`          # Fluxo de Test-Driven Development (TDD)
      - `e2e-testing/`           # Testes automatizados E2E com Playwright
      - `security-review/`       # Checklist e auditoria de segurança
      - `docker-patterns/`       # Conteinerização e Docker Compose
      - `api-design/`            # Design de endpoints REST e padronização
      - `error-handling/`        # Tratamento defensivo de erros e exceções
      - `execute-task/`          # Execução isolada de tarefas
      - `update-progress/`       # Registro de diário de bordo/logs
      - `smart-commit/`          # Gerador de Conventional Commits e PRs
  - `project/`
    - `PROJECT_MAP.md`           # Este mapa de arquitetura (GPS do agente)
    - `PROJECT_RULES.md`         # Regras específicas do projeto atual
    - `project-tasks/`           # Repositório central de Tasks (Spec + Execução)
    - `docs/progress/`           # Diário de bordo e histórico de entregas
- `src/`
  - `domain/`                   # Entidades de negócio puras (sem frameworks)
  - `application/`              # Casos de uso e DTOs de validação (Zod)
  - `infrastructure/`           # Repositórios, banco de dados, controllers NestJS

## 🛠️ Regras de Ouro para o Agente
1. **Eficiência de Tokens:** Leia prioritariamente este mapa e o arquivo da Task ativa na pasta `project-tasks/` antes de tocar em qualquer código.
2. **Seleção de Skill por Domínio:** Consulte a Matriz de Skills no `GLOBAL_RULES.md` e aplique os padrões da skill correspondente (ex: `nestjs-patterns` para back, `react-patterns` para front).
3. **Segurança e Zod:** Nenhuma rota ou caso de uso processa dados crus; validação estrita com Zod é obrigatória.
4. **Testes Obrigatórios:** Todo caso de uso ou regra de domínio exige teste automatizado correspondente.