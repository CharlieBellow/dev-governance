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
