# Convenções de Git — Branches, Commits e Pull Requests

> Vale para todo o projeto (back, front e geral). Decisões que alterem estas convenções exigem RFC em `geral/rfcs/`.

## 1. Branches

| Branch | Uso |
|---|---|
| `main` | Produção. Só recebe merge via PR revisado. |
| `dev` | Integração. Base para as branches de trabalho. |
| `<tipo>/<issue>-<descricao-curta>` | Trabalho do dia a dia, criada a partir de `dev` |

O `<tipo>` segue os tipos de commit abaixo. Exemplos:

```
feat/119-responsavel-por-email
fix/134-paginacao-ordens-servico
docs/rfc-be-0004-camada-de-erro
```

Nunca commite direto em `main` ou `dev`.

## 2. Commits — Conventional Commits

Formato:

```
<tipo>(<escopo>): <descrição no imperativo, minúscula, sem ponto final>

[corpo opcional: o porquê da mudança, não o como]

[rodapé opcional: Refs #119 · RFC: BE-0010 · Task: 003 · BREAKING CHANGE: ...]
```

### Tipos

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade para o usuário/consumidor |
| `fix` | Correção de bug |
| `refactor` | Mudança de código sem alterar comportamento |
| `test` | Adição/ajuste de testes |
| `docs` | Documentação (inclui RFCs e designs) |
| `style` | Formatação, sem mudança de lógica (**não** é CSS — mudança visual no front é `feat`/`fix`) |
| `chore` | Build, dependências, configuração |
| `ci` | Pipeline de CI/CD |
| `perf` | Melhoria de performance |

### Escopo

Use a área e, quando fizer sentido, o módulo: `back`, `front`, `back/servicebook`, `front/design-system`, `rfc`, `design`.

### Exemplos

```
feat(back/servicebook): adiciona rota de responsável por email
fix(front/agenda): corrige estado vazio da listagem de salas
docs(rfc): propõe FE-0003 variante outline do Button
feat(front/design-system): adiciona variante outline ao Button

RFC: FE-0003
```

### Regras

- **Um commit = uma intenção.** Não misture refactor com feature no mesmo commit.
- **Documentação antes do código:** quando houver RFC/design, o commit `docs(rfc): ...` vem **antes** dos commits de implementação (idealmente em PR próprio, já aprovado).
- **Mudança que quebra contrato** leva `!` após o escopo e `BREAKING CHANGE:` no rodapé, sempre referenciando o RFC que a aprovou:
  ```
  feat(back/users)!: restringe GET /users a ADMIN

  BREAKING CHANGE: consumidores não-admin passam a receber 403.
  RFC: BE-0013
  ```

## 3. Pull Requests

- **Título:** mesmo formato do commit principal (`feat(back/users): ...`).
- **Descrição:** template em `.github/pull_request_template.md` na **raiz** do projeto (preenchido automaticamente pelo GitHub). O modelo vem de `node_modules/dev-governance/utils/.github/` e é copiado na instalação.
- **Tamanho:** prefira PRs pequenos e verticais. PR de RFC é separado do PR de implementação.
- **Vínculo obrigatório:** todo PR que implementa decisão de padrão ou contrato referencia o RFC/design correspondente. PR sem referência que introduz padrão novo é devolvido com pedido de RFC.
- **Merge:** squash merge em `dev`, mantendo a mensagem no padrão Conventional Commits.

### PR de RFC/design (documentação)

- Título: `docs(rfc): propõe BE-0010 <título>` ou `docs(design): ...`
- Marca as pessoas definidas pela categoria de impacto (ver `guia-fluxo-documentacao.md`, Passo 3).
- Só é mergeado após a janela de aviso **e**, quando exigido, a confirmação ativa registrada no campo "Confirmação ativa recebida de" do RFC.

### Checklist do revisor

- [ ] Commits e título seguem Conventional Commits
- [ ] RFC/design referenciado (quando aplicável) e implementação condizente com ele
- [ ] Testes automatizados cobrindo a mudança
- [ ] **Back:** contrato implementado bate com `back/designs/`; Swagger atualizado
- [ ] **Front:** só componentes do catálogo de `front/design-system.md`; nenhum valor visual literal no lugar de token; estados de loading/vazio/erro tratados
- [ ] Índice de documentação atualizado, se houve RFC/design novo
