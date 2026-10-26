# Dev Governance & Engineering Standards

Este repositório centraliza a governança, os padrões arquiteturais e as skills dos agentes de IA para todos os projetos ( futuros sistemas em NestJS, Next.js, Prisma e MySQL).

## Princípios de Engenharia
- **Clean Architecture & DDD:** Separação rígida entre Domínio (puro), Aplicação (casos de uso) e Infraestrutura (Prisma/NestJS).
- **TDD Rigoroso:** Ciclo Red -> Green -> Refactor utilizando **Vitest** para cobrir regras de negócio do Domínio.
- **Tipagem Estrita:** TypeScript em strict mode, imutabilidade e tratamento centralizado de exceções de domínio.
- **Documentação antes do código:** decisões de padrão e contratos viram RFC/design **antes** da implementação. Divergir de uma decisão registrada nunca é silencioso.

## Como o repositório se divide

| Pasta | O que é | No projeto consumidor |
|---|---|---|
| `.agents/global/` | Regras globais (`GLOBAL_RULES.md`), skills e templates de spec/task | Fica em `node_modules/dev-governance/.agents/global/` — **lido, nunca copiado**. Atualiza com `pnpm update dev-governance` |
| `utils/.agents/project/` | **Modelo** da pasta de trabalho de um projeto: PROJECT_MAP, PROJECT_RULES, tasks e docs | **Copiado** para `.agents/project/` e preenchido pelo time. A partir daí pertence ao projeto |
| `.agents/project/` | A instância usada pelo próprio dev-governance (com exemplos) | Não vai para o projeto |

> **Regra de manutenção:** toda mudança de estrutura em `.agents/project/` deve ser replicada em `utils/.agents/project/` (exceto tasks e logs de exemplo).

## Estrutura de `.agents/project/` (no projeto consumidor)

```
.agents/project/
  PROJECT_MAP.md                 → GPS do projeto (preencher a seção "Código-fonte")
  PROJECT_RULES.md               → stack, comandos, restrições e RESPONSÁVEIS por área
  tasks/                         → tasks NNN-slug-ISS<issue>.md (to-tickets)
  docs/
    README.md                    → porta de entrada + regras para IA
    guia-fluxo-documentacao.md   → quando abrir RFC/design e quem aprova
    convencoes-git.md            → branches, Conventional Commits, PRs
    _templates/                  → rfc-completo, rfc-leve, design-api, design-ui
    geral/rfcs/                  → RFCs transversais (GER-)
    back/  README.md · rfcs/ (BE-) · designs/ (BE-D-)
    front/ README.md · design-system.md · rfcs/ (FE-) · designs/ (FE-D-)
    specs/                       → specs de feature (to-spec)
    progress/                    → diário de bordo por task (update-progress)
```

Na **raiz** do projeto, além de `.agents/project/`, ficam `AGENTS.md` e `.github/pull_request_template.md`, porque a IA e o GitHub só os leem ali. Por isso `utils/` espelha a raiz do projeto:

```
utils/                           → copiado para a RAIZ do projeto consumidor
  AGENTS.md                      → protocolo do agente
  .github/pull_request_template.md
  pnpm-workspace.yaml
  .agents/project/               → estrutura acima
```

## Pipeline de Trabalho (Issue → PR)

| # | Etapa | Skill | Artefato |
|---|---|---|---|
| 1 | Questionar a issue | `grill-plan` | conversa |
| 2 | Registrar decisão de padrão/contrato (condicional) | `rfc-workflow` | `docs/<area>/rfcs/` e `docs/<area>/designs/` |
| 3 | Aprovação do RFC (se a categoria exige) | — | RFC `Aceito` |
| 4 | Especificar | `to-spec` | `docs/specs/<feature>-spec.md` |
| 5 | Fatiar | `to-tickets` | `tasks/<NNN>-<slug>-ISS<issue>.md` |
| 6 | Implementar com TDD | `execute-task` + `tdd-workflow` + skill do domínio | código + testes |
| 7 | Registrar progresso | `update-progress` | `docs/progress/<NNN>-<slug>-ISS<issue>-log.md` |
| 8 | Commit e PR | `smart-commit` / `create-pr` | commits + PR |
| 9 | Fechar o ciclo | — | RFC `Implementado`, design `Pronto`, índices atualizados |

Exemplo completo, passando por todas as skills: [`.agents/global/FLUXO_DE_TRABALHO.md`](.agents/global/FLUXO_DE_TRABALHO.md). Detalhes: [`.agents/global/GLOBAL_RULES.md`](.agents/global/GLOBAL_RULES.md) (seção 2.1) e [`utils/.agents/project/docs/README.md`](utils/.agents/project/docs/README.md).

---

## Instalação em um projeto


### 1. Configure o pnpm (`pnpm-workspace.yaml` do projeto)

```yaml
onlyBuiltDependencies:
  - "dev-governance"
```

### 2. Adicione a dependência (`package.json` do projeto)

```json
"devDependencies": {
  "dev-governance": "git+https://github.com/CharlieBellow/dev-governance.git"
}
```

### 3. Instale

```bash
pnpm install
```

As regras e skills globais ficam disponíveis em `node_modules/dev-governance/.agents/global/`, sem poluir o projeto.

### 4. Copie o conteúdo de `utils/` para a raiz do projeto

```bash
cp -rn node_modules/dev-governance/utils/. ./
```

O `-n` (*no-clobber*) **não sobrescreve** arquivos que já existem. Isso cria `.agents/project/`, `.github/pull_request_template.md` e `AGENTS.md`, mas preserva o que o projeto já tem.

### 5. Confira o AGENTS.md

Se o projeto **já tinha** `AGENTS.md` (ou `CLAUDE.md`), o passo 4 não o substituiu: mescle manualmente o conteúdo de `node_modules/dev-governance/utils/AGENTS.md` nele.

### 6. Preencha o modelo (uma vez, pelo time)

1. `PROJECT_MAP.md` → seção "Código-fonte" com as pastas reais do projeto.
2. `PROJECT_RULES.md` → stack, comandos e **Responsáveis** por área (usados nas notificações de RFC).
3. `docs/back/README.md` e `docs/front/README.md` → "Padrões vigentes".
4. `docs/front/design-system.md` → tokens e componentes base existentes. A partir daí, qualquer componente fora do catálogo exige RFC.
5. Remova a área que o projeto não tem (ex.: `docs/front/` em uma API pura).
6. Commit: `docs(geral): adota governança do dev-governance`.

### Atualizações futuras

- **Skills e regras globais:** `pnpm update dev-governance` — chegam automaticamente.
- **Modelo de `.agents/project/`:** não é sobrescrito (o projeto já o preencheu). Ao atualizar o dev-governance, compare `node_modules/dev-governance/utils/.agents/project/` com o seu e traga manualmente o que for estrutural (ex.: um template novo em `_templates/`).
