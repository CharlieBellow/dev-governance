# Fluxo de Trabalho — Exemplo Completo (Issue → PR)

> Exemplo fictício, passo a passo, de como uma issue atravessa o pipeline do dev-governance usando **todas** as skills.
> Regras formais: [`GLOBAL_RULES.md`](GLOBAL_RULES.md) (seção 2.1). Em um projeto consumidor, este arquivo fica em `node_modules/dev-governance/.agents/global/FLUXO_DE_TRABALHO.md`.

## Cenário

- **Projeto:** repositório do **back** (API NestJS). O front (Next.js) fica em **outro repositório**, com suas próprias issues e tasks.
- **Responsáveis** (`.agents/project/PROJECT_RULES.md`, seção 5): `@ana` (back), `@bruno` (front).
- **Estado inicial:** nenhum RFC, nenhuma task.
- **Issue no GitHub do back:**

> **#42** — "a rota POST /users e POST /users/remove-users deveria ser POST /users e DELETE /users"

## Regras que o exemplo segue

1. **Uma issue é de uma área só** (back **ou** front). Quando a entrega precisa de mudança na outra área, o fluxo **sugere abrir uma issue lá** — não cria task da outra área aqui.
2. **Uma issue = uma branch = um PR**, aberto quando **todas** as tasks da issue estão concluídas.
3. **Algo fora do escopo vira uma nova issue**, nunca uma correção "de carona".

## Convenção de nomes que liga tudo à issue

| Artefato | Formato | Exemplo |
|---|---|---|
| Task | `tasks/<NNN>-<slug>-ISS<issue>.md` | `001-rota-delete-users-ISS42.md` |
| Log | `docs/progress/<NNN>-<slug>-ISS<issue>-log.md` | `001-rota-delete-users-ISS42-log.md` |
| Branch | `<tipo>/<issue>-<slug>` | `feat/42-remocao-via-delete` |
| Commit | rodapé `Refs #<issue>` · `Task: <NNN>` | `Refs #42` · `Task: 001` |

- `NNN` é **global** no repositório (nunca reinicia): cada task nova recebe o próximo número livre, de qualquer issue.
- O sufixo `-ISS42` diz **qual issue gerou a task**. É por ele que a skill `create-pr` encontra todas as tasks da issue.
- No nome do arquivo usamos `-ISS42`, e não `#42`, porque `#` quebra globs no zsh (`extendedglob`) e links em markdown. Em commit, PR e texto, o `#42` continua — é a sintaxe que o GitHub usa para linkar e fechar a issue.

## Mapa rápido

| # | Etapa | Skill | O que você digita | Artefato (em `.agents/project/`) |
|---|---|---|---|---|
| 1 | Questionar | `grill-plan` | `/grill-plan issue #42 ...` | conversa |
| 2 | Registrar decisão | `rfc-workflow` | `/rfc-workflow` | `docs/back/rfcs/BE-0001-*` + `docs/back/designs/BE-D-0001-*` |
| 3 | Aprovação | — | (PR do RFC) | RFC `Aceito` |
| 4 | Especificar | `to-spec` | `/to-spec issue #42` | `docs/specs/remocao-via-delete-spec.md` |
| 5 | Fatiar | `to-tickets` | `/to-tickets issue #42` | `tasks/001…002-*-ISS42.md` |
| 6 | Implementar | `execute-task` + `tdd-workflow` + skills do domínio | `/execute-task 001` | código + testes |
| 7 | Registrar | `update-progress` + `smart-commit` | `/update-progress` · `/smart-commit` | log + commit |
| 8 | PR da issue | `create-pr` | `/create-pr issue #42` | texto do PR |
| 9 | Fechar | — | — | status do RFC/design atualizado |

---

## Etapa 1 — `grill-plan`: questionar antes de codar

```bash
git switch dev && git switch -c feat/42-remocao-via-delete
```

```
/grill-plan issue #42: a rota POST /users e POST /users/remove-users deveria ser POST /users e DELETE /users
```

**Antes de perguntar**, a skill lê `docs/README.md`, `docs/back/README.md` e procura RFCs sobre rotas e remoção (regra 4: não pergunta o que já está decidido). Não há nenhum. Depois vêm as rodadas, cada pergunta com resposta recomendada (➡️):

```
Rodada 1
1. POST /users já está correto (criação). O escopo é só a remoção?
   ➡️ Sim. POST /users não muda.
2. "DELETE /users" (coleção) remove vários de uma vez? Em HTTP, o corpo de um DELETE
   não tem semântica definida; proxies e clients podem descartá-lo.
   ➡️ DELETE /users/:id. Lote, se for requisito real, via DELETE /users?ids=a,b — sem corpo.
3. Quem consome POST /users/remove-users hoje?
   ➡️ O front (outro repositório). É QUEBRA DE CONTRATO EXISTENTE.
4. Remoção física ou lógica?
   ➡️ Manter o comportamento atual do use case (não mudar regra de negócio nesta issue).

Rodada 2
5. Remover a rota antiga nesta issue?
   ➡️ Não. Ela só pode sair depois que o front migrar e fizer deploy. Esta issue cria
      DELETE e deprecia a antiga; a remoção vira outra issue do back, bloqueada pela
      issue do front (expand-contract).
6. DELETE de id inexistente?
   ➡️ 404 com UserNotFoundError (padrão de erro do projeto).
7. Sucesso: 200 com corpo ou 204?
   ➡️ 204 No Content.
8. "Remoção sempre via DELETE" vira convenção para todos os módulos?
   ➡️ Sim — por isso exige RFC, não só uma task.
```

Termina com: *"Há decisão de padrão (pergunta 8) e quebra de contrato (pergunta 3). Próximo passo: `rfc-workflow`."*

> **Por quê:** a issue parecia uma troca de verbo, mas a entrevista revelou o problema do corpo no DELETE, uma quebra de contrato com o front, duas decisões de status code e uma convenção para o projeto inteiro. Sem esta etapa, alguém trocaria `@Post` por `@Delete` e o front quebraria em produção.

---

## Etapa 2 — `rfc-workflow`: registrar a decisão antes do código

```
/rfc-workflow com base no que decidimos no grill-plan
```

Classificação (tabela de `docs/README.md`): área back · decisão de padrão + quebra de contrato → **RFC completo** · rota consumida pelo front → **design de API**.

**Arquivos criados:**
- `docs/back/rfcs/BE-0001-remocao-via-delete.md` (de `docs/_templates/rfc-completo.md`)
- `docs/back/designs/BE-D-0001-contrato-remocao-usuarios.md` (de `docs/_templates/design-api.md`)
- Linhas novas nos índices de `docs/back/README.md`

Trecho do RFC:

```markdown
# RFC BE-0001: Remoção de recursos via método DELETE

| **Status** | Proposto |
| **Área** | (x) Back |
| **Issue relacionada** | #42 |
| **Categoria de impacto** | (x) Quebra contrato existente |
| **Janela de aviso aplicada** | Sugerida: ~1 semana com confirmação ativa do front — a confirmar por quem revisar |
| **Confirmação ativa recebida de** | *(em branco até @bruno responder)* |

## 3. Alternativas consideradas
### A: DELETE /users com body { ids: [] }  → descartada: body em DELETE sem semântica definida
### B: POST /users/bulk-delete (ação)       → descartada: mantém verbo de ação na URL
### C: DELETE /users/:id (+ ?ids= para lote) → escolhida

## 7. Riscos e perguntas em aberto
- Não sabemos se outro consumidor além do front chama POST /users/remove-users
  (não há log de acesso por rota). A depreciação com log existe para descobrir isso.

## 8. Escopo de aplicação futura
Convenção para TODOS os módulos: remoção é sempre DELETE /<recurso>/:id.
```

Trecho do design (contrato + checklist do consumidor):

```markdown
### `DELETE /users/:id`
**Autorização:** ADMIN
**Resposta (sucesso):** 204
| Status | Código de erro | Quando ocorre |
| 404 | USER_NOT_FOUND | id inexistente |
| 403 | FORBIDDEN | usuário não-admin |

## 4. Pendências do lado do consumidor (front)
- [ ] Trocar a chamada de remoção para DELETE /users/:id
- [ ] Tratar 404 (usuário já removido) com toast de aviso, não de erro
```

A IA termina com: *"Notificar @bruno (front, seção 5 do PROJECT_RULES). Ficar sem resposta NÃO conta como aprovação nesta categoria. Não vou implementar até o RFC estar `Aceito`."*

---

## Etapa 3 — Aprovação do RFC (decisão humana)

O RFC vai num PR **próprio e curto**, separado do PR de implementação (`docs/convencoes-git.md`, seção 3):

```bash
git switch dev && git switch -c docs/rfc-be-0001-remocao-via-delete
git add .agents/project/docs/back
git commit -m "docs(rfc): propõe BE-0001 remoção de recursos via DELETE

Refs #42"
# abrir PR marcando @bruno
```

Quando `@bruno` responde "ok, migro na próxima sprint":

1. No RFC: **Confirmação ativa recebida de:** `@bruno (2026-10-28)` · **Status:** `Aceito`.
2. Merge do PR do RFC em `dev`.
3. Volte para a branch da issue e traga a decisão: `git switch feat/42-remocao-via-delete && git rebase dev`.

> **Por quê:** a decisão é revisada **antes** de existir código. Se o Bruno pedisse remoção em lote, o ajuste custaria uma edição em markdown, não a reescrita de um controller.
> **Se for rejeitado:** RFC → `Rejeitado` (mergeado como registro) e volta-se à Etapa 1.

---

## Etapa 4 — `to-spec`: especificar a issue

```
/to-spec issue #42
```

Sintetiza a conversa (sem entrevistar de novo) em `docs/specs/remocao-via-delete-spec.md`:

```markdown
### 0. Documentos Relacionados
- Issue: #42
- RFC: docs/back/rfcs/BE-0001-remocao-via-delete.md — Aceito
- Design: docs/back/designs/BE-D-0001-contrato-remocao-usuarios.md

### 3. Histórias de Usuário
1. Como admin, quero remover um usuário via DELETE /users/:id, para que a API siga a semântica REST.
2. Como dev do front, quero que a rota antiga continue funcionando (depreciada) até eu migrar.

### 5. Estratégia de Testes
- Unit (Vitest): RemoveUserUseCase — sucesso, UserNotFoundError.
- Integração: DELETE /users/:id → 204 / 404 / 403; POST /users/remove-users sem regressão + header Deprecation.

### 6. Fora do Escopo
- Remoção de POST /users/remove-users → issue futura do back, após a migração do front.
```

> A spec **não repete** o contrato (status, payload): aponta para o design. Se o contrato mudar, muda em um lugar só.

---

## Etapa 5 — `to-tickets`: fatiar em tasks com o sufixo da issue

```
/to-tickets issue #42
```

A skill procura o maior número em `.agents/project/tasks/`, não encontra nenhum e começa em `001`. Se o número da issue não estivesse na conversa, ela **perguntaria** antes de criar os arquivos.

```
.agents/project/tasks/
├── 001-rota-delete-users-ISS42.md            → Bloqueada por: Nenhum
└── 002-deprecar-post-remove-users-ISS42.md   → Bloqueada por: 001
```

A migração do front **não** vira task aqui (regra 1). A skill sugere:

> *"A entrega depende de mudança no front. Sugiro abrir uma issue no repositório do front: 'migrar remoção de usuários para DELETE /users/:id', referenciando o design `BE-D-0001` (a seção 4 dele é o checklist). Depois que o front fizer deploy, abra uma issue no back para remover POST /users/remove-users."*

`tasks/001-rota-delete-users-ISS42.md` (de `task/template-task.md`):

```markdown
# 001: Rota DELETE /users/:id (#42)

| **Status** | pronto-para-agente |
| **Área** | back |
| **Spec de origem** | .agents/project/docs/specs/remocao-via-delete-spec.md |
| **RFC(s)** | .agents/project/docs/back/rfcs/BE-0001-remocao-via-delete.md |
| **Design(s)** | .agents/project/docs/back/designs/BE-D-0001-contrato-remocao-usuarios.md |
| **Bloqueado por** | Nenhum (pode iniciar imediatamente) |
| **Issue** | #42 |

## Critérios de aceitação
- [ ] 204 ao remover usuário existente
- [ ] 404 USER_NOT_FOUND para id inexistente
- [ ] 403 para não-admin
- [ ] POST /users/remove-users continua respondendo igual (sem regressão)
```

**Ver o que falta de uma issue** (só pelo nome):

```bash
ls .agents/project/tasks/*-ISS42.md
grep -l "concluído" .agents/project/tasks/*-ISS42.md   # quais já terminaram
```

---

## Etapa 6 — `execute-task` + TDD: implementar

```
/execute-task 001
```

1. **Leitura cirúrgica:** só `PROJECT_MAP.md`, `tasks/001-rota-delete-users-ISS42.md` e o design `BE-D-0001` referenciado.
2. **Portão de governança:** RFC `Aceito`, sem bloqueio → segue.
3. **Roteamento pela matriz do `GLOBAL_RULES.md`:**

   | Skill | Para quê nesta task |
   |---|---|
   | `nestjs-patterns` | Controller e módulo |
   | `api-design` | 204, recurso no plural, `:id` |
   | `error-handling` | `UserNotFoundError` → 404 |
   | `dg-security-review` | Guard de ADMIN na rota nova |
   | `tdd-workflow` + `create-test-from-task` | Testes primeiro, com as "4 perguntas + 1" |

4. **TDD — RED primeiro:**
   ```ts
   describe("RemoveUserUseCase", () => {
     it("remove usuário existente", async () => { /* caminho feliz */ })
     it("lança UserNotFoundError para id inexistente", async () => { /* fronteira */ })
     it("rejeita id que não é UUID", async () => { /* entrada malformada */ })
   })
   ```
   Roda, vê falhar → implementa o mínimo (GREEN) → refatora.
5. **Relatório de entrega:** arquivos alterados + saída do Vitest.

**Onde o escopo é protegido:** se, no meio da implementação, a IA achar "melhor devolver 200 com o usuário removido", o design diz 204 → ela **para** e propõe alterar o `BE-D-0001` (skill `rfc-workflow`), em vez de implementar diferente.

**`learn-and-adapt`:** se você corrigir a IA ("neste projeto, exceções terminam em `Error`, não `Exception`"), ela replica a correção nas próximas tasks da sessão.

**`agent-self-evaluation`:** ao fim de uma task com 3+ arquivos, peça a autoavaliação — a IA pontua a própria entrega (precisão, completude...) e aponta o que pode ter deixado passar.

---

## Etapa 7 — `update-progress` + `smart-commit`: registrar e commitar

```
/update-progress task 001
```

Cria `docs/progress/001-rota-delete-users-ISS42-log.md` — o log herda o sufixo da task — e muda a task para `concluído`.

```
/smart-commit
```

```
feat(back/users): adiciona DELETE /users/:id

Expand da migração definida no BE-0001; rota antiga mantida.

Refs #42
Task: 001
RFC: BE-0001
```

**Repete 6 → 7 para a task 002** (header `Deprecation` + log a cada chamada da rota antiga):

```
feat(back/users): marca POST /users/remove-users como depreciada

Responde ao risco em aberto do BE-0001: o log revela consumidores desconhecidos.

Refs #42
Task: 002
RFC: BE-0001
```

**`test-collaboration`:** registre um TEST-ID estável (ex.: `TEST-USERS-DELETE-CONTRACT`) ligando o contrato do `BE-D-0001` ao teste de integração, para que uma regressão futura apareça no CI.

> **Retomando em outra sessão:** "leia o log `001-rota-delete-users-ISS42-log.md` e continue" — a IA retoma sem reler o código.

---

## Desvio: algo fora do escopo aparece no meio do caminho

Durante a task 002, a IA percebe que existem **dois** repositories de usuário (`UsersRepository` e `UserRepository`) fazendo a mesma coisa. Corrigir "de carona" misturaria um refactor com a issue #42 — o PR ficaria maior, a revisão mais difícil e o motivo da mudança se perderia.

O certo (regra 3):

1. Anotar no log da task 002 (seção de descobertas) e **não corrigir agora**.
2. Abrir a issue **#43** no GitHub do back: "remover repository duplicado de usuários".
3. Na hora de trabalhar nela: `/grill-plan issue #43` → `/to-tickets issue #43`. A task recebe o **próximo número livre**:

```
.agents/project/tasks/
├── 001-rota-delete-users-ISS42.md
├── 002-deprecar-post-remove-users-ISS42.md
└── 003-remover-repository-duplicado-users-ISS43.md   ← outra issue, outra branch, outro PR
```

Pelo sufixo, fica claro que a `003` **não** entra no PR da #42.

---

## Etapa 8 — `create-pr`: o PR da issue inteira

```
/create-pr issue #42
```

1. **Portão:** lista `tasks/*-ISS42.md` (001, 002). Se alguma não estiver `concluído`, **para** e mostra o que falta. A `003-…-ISS43` é ignorada.
2. Lê os logs `docs/progress/*-ISS42-log.md` e preenche o `.github/pull_request_template.md`:
   - **Título:** `feat(back/users): remoção de usuários via DELETE /users/:id`
   - **Por quê:** `Closes #42`
   - **Quebra contrato?** Não nesta issue (a rota antiga continua, depreciada)
   - **Documentação:** RFC `BE-0001`, Design `BE-D-0001`, Spec `remocao-via-delete-spec.md`
   - **O que foi feito:** um item por task (001, 002)

O revisor (`@ana`) usa o checklist de `docs/convencoes-git.md`: contrato bate com o design? Swagger atualizado? Testes? → aprova → **squash merge** em `dev`. O `Closes #42` fecha a issue no GitHub.

---

## Etapa 9 — Fechar o ciclo da #42

- RFC `BE-0001` → `Aceito` (vira `Implementado` só quando a rota antiga for removida).
- Design `BE-D-0001` → `Em implementação`.
- `docs/back/README.md`, linha "Convenção de rotas" → *"Remoção sempre via `DELETE /<recurso>/:id`"* com **RFC de origem: BE-0001**.
- Swagger atualizado e aviso ao `@bruno` de que a rota nova está disponível.

## Depois: a remoção da rota antiga (#44)

Quando o front fizer deploy da migração, abre-se a issue **#44** no back: "remover POST /users/remove-users". Ela percorre o mesmo fluxo; a task recebe o próximo número livre:

```
.agents/project/tasks/
├── 001-rota-delete-users-ISS42.md
├── 002-deprecar-post-remove-users-ISS42.md
├── 003-remover-repository-duplicado-users-ISS43.md
└── 004-remover-post-remove-users-ISS44.md
```

Commit com a marca de quebra:

```
feat(back/users)!: remove POST /users/remove-users

BREAKING CHANGE: a rota antiga deixa de existir; usar DELETE /users/:id.
Refs #44
Task: 004
RFC: BE-0001
```

No merge da #44: RFC `BE-0001` → **`Implementado`** · design `BE-D-0001` → **`Pronto`**. As tasks e logs ficam no repositório como histórico de como cada issue foi resolvida.

---

## O retorno: o escopo protegido meses depois

Outro dev pede à IA: *"crie POST /orders/remove-orders"*. A IA lê `docs/back/README.md`, encontra a convenção e responde:

> "Isso diverge do **BE-0001** (seção 8: remoção é sempre DELETE em todos os módulos). Sugiro `DELETE /orders/:id`. Se houver motivo para fugir do padrão, abrimos um RFC novo referenciando o BE-0001."

Se o dev ignorar a IA e abrir o PR mesmo assim, o checklist do revisor ("RFC/design referenciado e implementação condizente") devolve o PR. Uma issue de uma linha deixou uma decisão que **ninguém precisa redecidir** e que **ninguém consegue contornar em silêncio**.

---

## Variações do fluxo

| Situação | O que muda |
|---|---|
| **Implementação direta** (bug simples, segue padrões existentes) | Pula as etapas 2–3. Vai de `grill-plan` (ou direto) para `to-tickets`. |
| **RFC leve** (decisão interna, sem impacto em outra área) | Etapa 2 com `rfc-leve.md`; etapa 3 por lazy consensus (24h). |
| **Issue de front com tela nova** | Etapa 2 gera `docs/front/designs/FE-D-*.md` (design de UI). Se a seção 3.2 do design não ficar vazia (componente fora do design system), gera também um RFC `FE-` com categoria "Altera design system". |
| **Monorepo** (raro) | As issues continuam sendo de uma área só. Se o trabalho começa no front e precisa do back, é sugerida uma issue para o back (e vice-versa), no mesmo repositório. |
| **Divergência encontrada no meio** | `execute-task` para; volta para `rfc-workflow` para alterar o RFC/design; a task fica bloqueada até a nova aprovação. |
