# 🗺️ Project Map & Architecture Guidelines (dev-governance)

## 📁 Arquitetura de Pastas Oficial

- `dev-governance-test/`
  - `.agent/`
    - `AGENTS.md` # Diretrizes globais de atuação e regras de ouro
    - `project/`
      - `PROJECT_MAP.md` # Este mapa de arquitetura (GPS do agente)
      - `PROJECT_RULES.md` # Regras específicas do projeto atual
      - `project-skills/` # Skills customizadas e específicas do projeto
      - `project-tasks/` # Repositório central de Tasks (onde spec e execução vivem juntas)
      - `docs/progress/` # Diário de bordo, relatórios de tasks concluídas e histórico de auditoria
    - `global/`
      - `GLOBAL_RULES.md` # Regras universais de engenharia e segurança
      - `specs/` # Templates base de especificações
      - `task/` # Templates base de task
      - `skills/` # Skills globais reutilizáveis (criação de task, execução, smart-commit, progresso)
  - `src/`
    - `domain/` # Entidades de negócio puras (sem frameworks)
    - `application/` # Casos de uso e DTOs de validação (Zod)
    - `infrastructure/` # Repositórios, banco de dados, controllers NestJS
  - `scripts/` # Utilitários de automação

## 🛠️ Regras de Ouro para o Agente
1. **Eficiência de Tokens:** Leia prioritariamente este mapa e o arquivo da Task ativa na pasta `project-tasks/` antes de tocar em qualquer código.
2. **Segurança e Zod:** Nenhuma rota ou caso de uso processa dados crus; validação estrita com Zod é obrigatória.
3. **Testes Obrigatórios:** Todo caso de uso ou regra de domínio exige teste unitário com Vitest.