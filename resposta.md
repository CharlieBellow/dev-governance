Fiz as mudanças. Ainda não há commit, e nenhum teste rodou, porque só arquivos markdown foram alterados. A resposta tem três partes: **o que mudou e por quê**, **o fluxo de uso como dependência** e **a issue de exemplo do início ao fim**.

---

# Parte 1 — O que mudou e por quê

## 1.1 Os caminhos dos docs
Você moveu os docs para `.agents/project/docs/`, então toda referência "a partir da raiz do projeto" mudou de `docs/…` para `.agents/project/docs/…`. Isso vale para o AGENTS.snippet, o rodapé dos RFCs, o template de PR e as skills.

Os links **internos** (`back/README.md`, `../_templates/rfc-leve.md`) não mudaram, porque são relativos e a estrutura interna da pasta continua igual. Para a IA não se confundir, deixei uma frase no topo do [docs/README.md](.agents/project/docs/README.md): "caminhos relativos a `.agents/project/docs/`".

## 1.2 O que faltava em `utils/.agents/project/`

| Problema | Por que era problema | O que fiz |
|---|---|---|
| A pasta `docs/specs/` não existia | A skill `to-spec` grava nela; no projeto novo a pasta não existiria | Criei, com `.gitkeep`, nos dois lugares |
| `PROJECT_MAP.md` era uma cópia do mapa do dev-governance | No projeto consumidor, a IA leria um mapa que descreve **outro** repositório (`utils/`, `src/domain` do exemplo) | [utils/.agents/project/PROJECT_MAP.md](utils/.agents/project/PROJECT_MAP.md) virou um modelo com uma seção **Governança** fixa e uma seção **Código-fonte** para preencher |
| `PROJECT_RULES.md` era o da "To-Do API" | Regras de um projeto fictício iriam para todos os projetos | [utils/.agents/project/PROJECT_RULES.md](utils/.agents/project/PROJECT_RULES.md) virou um modelo, com uma seção nova de **Responsáveis por área** |
| O guia manda "notificar o responsável do front", mas não dizia quem é | A IA não teria como montar a lista de notificação do RFC | A tabela de Responsáveis do PROJECT_RULES (seção 5) resolve isso, e a `rfc-workflow` passou a consultá-la |
| O AGENTS.snippet tinha só a parte de docs | O projeto novo ficaria sem o protocolo do agente (perfil didático, leitura cirúrgica, DoD) | O snippet virou o **AGENTS.md completo** do consumidor, com os caminhos `node_modules/dev-governance/.agents/global/…` |

**Por que os dois PROJECT_MAPs são diferentes de propósito:** o mapa é o "GPS" que evita a IA varrer o repositório. Se o projeto consumidor recebesse o mapa do dev-governance, a IA procuraria pastas que não existem ali. A **estrutura de `.agents/project/`** é idêntica nos dois, como você pediu. O **conteúdo** do mapa e das regras é próprio de cada repositório.

## 1.3 As skills (onde o fluxo estava quebrado)

| Skill | Antes | Agora | Por quê |
|---|---|---|---|
| `grill-plan` | Gravava decisões em `docs/adr/` (pasta inexistente) | Lê os RFCs antes de perguntar e, se surgir decisão de padrão, encaminha para a `rfc-workflow` | Os RFCs substituem os ADRs. E não faz sentido perguntar o que já foi decidido |
| `to-spec` | Spec isolada | Ganhou a seção **0. Documentos Relacionados** e a regra "a spec não redecide o que o RFC decidiu" | Cria a cadeia rastreável task → spec → design → RFC |
| `to-tickets` | `tasks/<NN>-…`, recomeçando em `01` a cada spec | Numeração **global** `NNN`, continuando do maior número; segue o `template-task.md`; adiciona o bloqueio "aprovação do RFC" | Na segunda feature haveria dois `01-…`. Agora a task também não começa antes da decisão aprovada |
| `template-task.md` | Vazio (`<!-- definir template -->`) | Template completo, com spec/RFC/design/bloqueio | As tasks passam a ter formato previsível |
| `execute-task` | Lia `project-tasks/[nome]-task.md` (pasta e nome errados) | Lê `tasks/NNN-slug.md` e tem um **portão de governança**: para se o RFC não estiver `Aceito` ou se precisar desviar do design | É aqui que o escopo é protegido no momento de codar |
| `create-pr` / `smart-commit` | `project-tasks/`, `docs/` | Caminhos corrigidos, mais o rodapé `Task:` | — |
| `rfc-workflow` | Caminhos `docs/` | Caminhos corrigidos; consulta os Responsáveis; indica o próximo passo (`to-spec`) | — |

## 1.4 GLOBAL_RULES, AGENTS e README
- Em [GLOBAL_RULES.md](.agents/global/GLOBAL_RULES.md), troquei `.agent/` por `.agents/` em toda a matriz e acrescentei uma nota explicando onde fica `.agents/global/` no consumidor. A matriz ganhou as linhas de Planejamento, Execução e Git. A seção nova **2.1 Pipeline de Trabalho** define a ordem das skills.
- [AGENTS.md](AGENTS.md) usa os caminhos corretos e tem a regra 6, que obriga a replicar mudanças de estrutura em `utils/`.
- [README.md](README.md) foi reescrito: divisão global × utils, pipeline, instalação passo a passo e como atualizar.

---

# Parte 2 — Como funciona como dependência

```
SEU PROJETO
├── AGENTS.md                         ← copiado do snippet (a IA lê primeiro)
├── .github/pull_request_template.md  ← copiado (o GitHub lê daqui)
├── node_modules/dev-governance/
│   └── .agents/global/               ← SOMENTE LEITURA: regras + skills
│       ├── GLOBAL_RULES.md              (atualiza com pnpm update)
│       ├── task/template-task.md
│       └── skills/grill-plan, rfc-workflow, to-spec, to-tickets, ...
└── .agents/project/                  ← DO PROJETO: copiado uma vez e preenchido
    ├── PROJECT_MAP.md / PROJECT_RULES.md
    ├── tasks/
    └── docs/ (rfcs, designs, design-system, specs, progress...)
```

A divisão vem de uma regra simples: **o que é igual para todos os projetos fica no pacote, e o que é decisão do projeto fica no projeto.** As skills dizem *como* trabalhar; `.agents/project/` guarda *o que* este projeto decidiu. Por isso `pnpm update` atualiza as skills sem apagar seus RFCs.

**Invocando as skills:** como as skills ficam em `node_modules`, a sua ferramenta de IA não necessariamente as reconhece como comando `/grill-plan`. Há dois caminhos:
- Citar a skill no prompt (`use a skill grill-plan em node_modules/dev-governance/.agents/global/skills/grill-plan/SKILL.md`).
- Criar um symlink para a pasta de skills que a ferramenta lê (por exemplo, `.claude/skills/` no Claude Code).

Nos exemplos abaixo escrevo `/grill-plan` para simplificar.

---

# Parte 3 — A issue de exemplo do início ao fim

> **Issue #42:** "a rota POST /users e POST /users/remove-users deveria ser POST /users e DELETE /users"

Projeto fictício: API NestJS consumida por um front Next.js. O `PROJECT_RULES.md` tem `@ana` como responsável pelo back e `@bruno` pelo front. Nenhum RFC existe ainda.

## Etapa 1 — `grill-plan`: questionar antes de codar

**Você digita:**
```
/grill-plan Issue #42: a rota POST /users e POST /users/remove-users deveria ser
POST /users e DELETE /users. Área: back.
```

**O que a IA faz antes de perguntar** (regra 4 nova da skill): lê o `PROJECT_MAP.md`, o `docs/README.md`, o `docs/back/README.md` e procura RFCs sobre rotas e remoção. Não encontra nenhum. Depois vem a primeira rodada, com resposta recomendada (➡️):

```
Rodada 1
1. POST /users já está correto (criação). O escopo é só a remoção?
   ➡️ Sim. POST /users não muda.
2. "DELETE /users" (coleção) remove vários usuários de uma vez? Em HTTP, o corpo de
   um DELETE não tem semântica definida e alguns proxies/clients o descartam.
   ➡️ DELETE /users/:id para remoção individual. Se a remoção em lote for requisito
      real, DELETE /users?ids=a,b (query) — sem corpo.
3. Quem consome POST /users/remove-users hoje?
   ➡️ O front (tela de gestão de usuários). Então é QUEBRA DE CONTRATO EXISTENTE.
4. Remoção física ou lógica (soft delete)?
   ➡️ Manter o comportamento atual do use case (não mudar regra de negócio nesta issue).

Rodada 2
5. Remover a rota antiga de uma vez ou fazer expand-contract?
   ➡️ Expand-contract: cria DELETE, marca a antiga como depreciada,
      o front migra, só então remove a antiga.
6. DELETE de um id inexistente: 404 ou 204?
   ➡️ 404 com exceção de domínio UserNotFoundError (padrão de erro do projeto).
7. Sucesso: 200 com corpo ou 204?
   ➡️ 204 No Content.
8. Isso vira convenção para todos os módulos ("remoção sempre via DELETE")?
   ➡️ Sim — por isso exige RFC, não só uma task.
```

Termina com: *"Há decisão de padrão (pergunta 8) e quebra de contrato (pergunta 3). Próximo passo: `rfc-workflow`."*

**Por que essa etapa existe:** a issue parecia uma troca de verbo, mas a entrevista revelou quatro coisas que ela não dizia:
- o problema do corpo no DELETE;
- a quebra de contrato com o front;
- a decisão de status code;
- uma convenção que vale para o projeto inteiro.

Sem essa etapa, alguém trocaria `@Post` por `@Delete` e o front quebraria em produção.

## Etapa 2 — `rfc-workflow`: registrar a decisão antes do código

**Você digita:** `/rfc-workflow com base no que decidimos no grill-plan`

A IA classifica a tarefa pela tabela do `docs/README.md`:
- **Área:** back.
- **Decisão de padrão + quebra de contrato** → `_templates/rfc-completo.md`.
- **Rota consumida pelo front** → também `_templates/design-api.md`.

**Arquivos criados:**
- `.agents/project/docs/back/rfcs/BE-0001-remocao-via-delete.md`
- `.agents/project/docs/back/designs/BE-D-0001-contrato-remocao-usuarios.md`
- Linha nova nos índices de [back/README.md](utils/.agents/project/docs/back/README.md).

Trecho do RFC:
```markdown
# RFC BE-0001: Remoção de recursos via método DELETE

| **Status** | Proposto |
| **Área** | (x) Back |
| **Issue relacionada** | #42 |
| **Categoria de impacto** | (x) Quebra contrato existente |
| **Janela de aviso aplicada** | Sugerida: ~1 semana com confirmação ativa do front — a confirmar por quem revisar |
| **Confirmação ativa recebida de** | *(em branco até @bruno responder)* |

## 1. Problema
A remoção de usuários usa `POST /users/remove-users` (src/modules/users/.../remove-users.controller.ts),
um verbo de ação na URL. Clientes HTTP, cache e documentação Swagger tratam a rota como criação...

## 3. Alternativas consideradas
### A: DELETE /users com body { ids: [] }   → descartada: body em DELETE sem semântica definida
### B: POST /users/bulk-delete (ação)        → descartada: mantém o problema de verbo na URL
### C: DELETE /users/:id (+ DELETE /users?ids= se houver lote) → escolhida

## 6.2 Negativas / trade-offs aceitos
- O front precisa migrar; existe uma janela de convivência das duas rotas.

## 7. Riscos e perguntas em aberto
- Não sabemos se outro consumidor além do front chama POST /users/remove-users
  (não há log de acesso por rota). A fase de depreciação (com log) existe para descobrir isso.

## 8. Escopo de aplicação futura
Convenção para TODOS os módulos: remoção é sempre DELETE /<recurso>/:id.
```

Repare que o item 7 registra uma **incerteza real** ("não sabemos se há outro consumidor"), não uma objeção já respondida. A mitigação dessa incerteza vira a task 002 mais adiante.

O design de API (BE-D-0001) traz o contrato exato e, na seção 4, o checklist do front:
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

A IA termina dizendo: *"Notificar @bruno (front, seção 5 do PROJECT_RULES). Ficar sem resposta NÃO conta como aprovação. Não vou implementar até o RFC estar `Aceito`."*

## Etapa 3 — PR do RFC e aprovação

Siga a [convencoes-git.md](utils/.agents/project/docs/convencoes-git.md):
```bash
git switch dev && git switch -c docs/rfc-be-0001-remocao-via-delete
git add .agents/project/docs/back
git commit -m "docs(rfc): propõe BE-0001 remoção de recursos via DELETE

Refs #42"
```
1. Abra o PR, marque `@bruno` e espere.
2. Quando o Bruno responder "ok, migro na sprint", preencha no RFC: **Confirmação ativa recebida de: @bruno (2026-10-28)**, mude o Status para `Aceito` e faça o merge.

**Por que essa etapa é um PR separado:** a decisão é revisada **antes** de existir código. Se o Bruno disser "o front precisa de remoção em lote", o ajuste custa uma edição no markdown, e não uma reescrita do controller.

## Etapa 4 — `to-spec`: especificar a feature

**Você digita:** `/to-spec`

A IA sintetiza a conversa (sem entrevistar de novo) e cria `.agents/project/docs/specs/remocao-usuarios-delete-spec.md`:
```markdown
### 0. Documentos Relacionados
- Issue: #42
- RFC: back/rfcs/BE-0001-remocao-via-delete.md — Aceito
- Design: back/designs/BE-D-0001-contrato-remocao-usuarios.md

### 3. Histórias de Usuário
1. Como admin, quero remover um usuário via DELETE /users/:id, para que a API siga a semântica REST.
2. Como dev do front, quero um período de convivência das rotas, para migrar sem quebrar produção.
...
### 5. Estratégia de Testes
- Unit (Vitest): RemoveUserUseCase — sucesso, UserNotFoundError.
- Integração: DELETE /users/:id → 204 / 404 / 403.
```
Repare que a spec **não repete** o contrato (status, payload). Ela aponta para o design. Se alguém mudar o contrato, muda em um lugar só.

## Etapa 5 — `to-tickets`: fatiar em tasks verticais

**Você digita:** `/to-tickets a partir da spec remocao-usuarios-delete-spec.md`

A IA vê que `tasks/` está vazia, começa em `001` e aplica **expand-contract** (regra 4 da skill):
```
001-rota-delete-users              → Nenhum bloqueio                        (expand)
002-deprecar-post-remove-users     → Bloqueado por: 001
003-front-migra-para-delete        → Bloqueado por: 001                     (área: front)
004-remover-post-remove-users      → Bloqueado por: 002, 003                (contract)
```

Arquivo `.agents/project/tasks/001-rota-delete-users.md`, no formato do [template-task.md](.agents/global/task/template-task.md):
```markdown
# 001: Rota DELETE /users/:id

| **Status** | pronto-para-agente |
| **Área** | back |
| **Spec de origem** | .agents/project/docs/specs/remocao-usuarios-delete-spec.md |
| **RFC(s)** | .agents/project/docs/back/rfcs/BE-0001-remocao-via-delete.md |
| **Design(s)** | .agents/project/docs/back/designs/BE-D-0001-contrato-remocao-usuarios.md |
| **Bloqueado por** | Nenhum (pode iniciar imediatamente) |

## O que construir
Admin remove um usuário via DELETE /users/:id; a rota antiga continua funcionando.

## Critérios de aceitação
- [ ] 204 ao remover usuário existente
- [ ] 404 USER_NOT_FOUND para id inexistente
- [ ] 403 para não-admin
- [ ] POST /users/remove-users continua respondendo igual (sem regressão)
```

Se o RFC ainda estivesse `Proposto`, as tasks teriam saído com **Bloqueado por: aprovação do RFC BE-0001** (regra 6 da skill).

## Etapa 6 — `execute-task` + TDD: implementar

**Você digita:** `/execute-task 001-rota-delete-users.md`

1. **Leitura cirúrgica:** a IA lê só o `PROJECT_MAP.md`, a task 001 e o BE-D-0001 referenciado. Não lê o repositório inteiro.
2. **Portão de governança** (regra nova 1.1): o RFC está `Aceito` e não há bloqueio, então segue em frente.
3. **Roteamento pela matriz do GLOBAL_RULES:**

   | Skill | Para quê |
   |---|---|
   | `nestjs-patterns` | O controller |
   | `api-design` | O 204 e o recurso no plural |
   | `error-handling` | `UserNotFoundError` |
   | `dg-security-review` | Guard de ADMIN |
   | `tdd-workflow` + `create-test-from-task` | Os testes |

4. **TDD:** primeiro o teste vermelho, com as "4 perguntas + 1" da `create-test-from-task`:
   ```ts
   describe("RemoveUserUseCase", () => {
     it("remove usuário existente", async () => { /* caminho feliz */ })
     it("lança UserNotFoundError para id inexistente", async () => { /* fronteira */ })
     it("rejeita id que não é UUID", async () => { /* malformado */ })
   })
   ```
   Roda, vê falhar (RED), implementa o mínimo (GREEN) e refatora.
5. **Relatório de entrega:** arquivos alterados e a confirmação de que o Vitest passou.

**Onde o escopo é protegido aqui:** suponha que durante a implementação a IA ache "melhor devolver 200 com o usuário removido". O design diz 204, então ela **para e propõe alterar o BE-D-0001**, em vez de implementar diferente. Isso é a regra "divergência nunca é silenciosa" aplicada.

**`learn-and-adapt`:** se você corrigir a IA nessa etapa ("neste projeto, exceções de domínio terminam em `Error`, não `Exception`"), ela replica a correção nas tasks seguintes da sessão.

## Etapa 7 — `update-progress`: registrar o progresso

**Você digita:** `/update-progress task 001`

Ela cria `.agents/project/docs/progress/001-rota-delete-users-log.md` com o que foi feito, os testes que passaram e o próximo passo ("task 002 ou 003, ambas desbloqueadas"). Muda o status da task para `concluído`.

**Por que existe:** amanhã, numa sessão nova e sem histórico, você diz "leia o log 001 e continue". A IA retoma de onde parou sem reler o código.

## Etapa 8 — `smart-commit` / `create-pr`: commit e PR

**`/smart-commit`** gera:
```
feat(back/users): adiciona DELETE /users/:id

Expand da migração definida no BE-0001; rota antiga mantida.

Refs #42
RFC: BE-0001
Task: 001
```

**`/create-pr task 001`** lê a task e o log e preenche o [template de PR](utils/.agents/project/docs/.github/pull_request_template.md):
- Área: back.
- Quebra contrato: **Não** (nesta fase, ainda não).
- RFC e Design linkados.
- Checklist: "contrato bate com o design; Swagger atualizado".

O revisor (`@ana`) compara o PR com o BE-D-0001. Se bater, aprova.

`agent-self-evaluation` pode rodar aqui, depois de uma task de 3 ou mais arquivos: a IA dá nota à própria entrega (precisão, completude etc.) e aponta o que pode ter deixado passar.

## Etapas 6–8 de novo, para as outras tasks

**Task 002 — depreciar a rota antiga**
- O que faz: adiciona o header `Deprecation` e um log a cada chamada de `POST /users/remove-users`.
- Commit: `feat(back/users): marca POST /users/remove-users como depreciada`.
- Por que existe: é a resposta ao **risco em aberto** do RFC. Se o log mostrar outro consumidor, você descobre **antes** de remover a rota.

**Task 003 — o front migra (área front)**
- A IA do repositório do front lê o design BE-D-0001 e a seção 4 dele vira o checklist.
- Não precisa de design de UI (`FE-D-`): nenhuma tela nova, nenhum componente novo.
- Se o dev quisesse aproveitar para criar um "ConfirmDeleteModal" próprio, o `design-system.md` manda usar o `Dialog` com `Button variant="destructive"`. Componente novo exigiria RFC `FE-`.
- Commit: `refactor(front/users): migra remoção de usuários para DELETE /users/:id`.

**Task 004 — remover a rota antiga (contract)**
- Só fica desbloqueada quando a 002 e a 003 estão concluídas.
- Commit com a marca de quebra:
  ```
  feat(back/users)!: remove POST /users/remove-users

  BREAKING CHANGE: a rota antiga deixa de existir; usar DELETE /users/:id.
  RFC: BE-0001
  Task: 004
  ```

`test-collaboration` cabe aqui: registrar um ID de teste estável (ex.: `TEST-USERS-DELETE-CONTRACT`) ligando o contrato do BE-D-0001 ao teste de integração, para que uma regressão futura apareça no CI.

## Etapa 9 — Fechar o ciclo

No PR da task 004:
- RFC BE-0001 → `Implementado`.
- Design BE-D-0001 → `Pronto`.
- [back/README.md](utils/.agents/project/docs/back/README.md), linha "Convenção de rotas" → *"Remoção sempre via `DELETE /<recurso>/:id`"*, com **RFC de origem: BE-0001**.
- Swagger atualizado e aviso ao Bruno no canal do time.
- Issue #42 fechada.

## O retorno: o escopo protegido meses depois

Três meses depois, outro dev pede à IA: *"crie POST /orders/remove-orders"*. A IA lê o `back/README.md`, encontra a convenção e responde:

> "Isso diverge do **BE-0001** (seção 8: remoção é sempre DELETE em todos os módulos). Sugiro `DELETE /orders/:id`. Se houver motivo para fugir do padrão, abrimos um RFC novo referenciando o BE-0001."

E se o dev ignorar a IA e abrir o PR mesmo assim? O checklist do revisor ("RFC/design referenciado e implementação condizente") devolve o PR. É isso que uma issue de cinco palavras deixou de herança: uma decisão que **ninguém precisa redecidir** e que ninguém consegue contornar em silêncio.

---

## Pendências que dependem de você

1. **⚠ O `package.json` está em `utils/`** desde o commit `969c89b`. Sem `package.json` na raiz, `pnpm install git+https://…dev-governance.git` falha, e nada da Parte 2 funciona. Para resolver, volte o arquivo para a raiz:

   ```bash
   git mv utils/package.json package.json
   ```

   Não fiz isso porque não sei se a mudança para `utils/` foi intencional. Se quiser, eu faço.
2. **Os logs de exemplo** `.agents/project/docs/progress/001-*.md` aparecem como apagados. Se não foi intencional: `git restore .agents/project/docs/progress/`.
3. **`utils/back/` foi removida** (pelo `git status`, foi você). O conteúdo útil já está nos templates; confirme que era isso mesmo.

Se quiser, transformo a Parte 3 em uma página para compartilhar com o time.


________________________




Tudo feito. Nenhum commit, e tudo está recuperável via git, já que eram arquivos versionados. Respondendo pergunta por pergunta:

## 1. O que o `.gitkeep` faz?

O Git **não versiona pastas vazias**. Ele só rastreia arquivos, e a pasta existe para o Git apenas como "caminho de algum arquivo". Então `docs/back/rfcs/`, vazia, simplesmente não iria para o repositório. E o `cp` do modelo criaria um projeto **sem** as pastas onde as skills gravam: a `to-spec` tentaria salvar em `docs/specs/` e a pasta não existiria.

O `.gitkeep` é um arquivo vazio que serve só para "segurar" a pasta. O nome não é especial para o Git; é uma convenção da comunidade. Quando a pasta ganhar o primeiro arquivo de verdade (o primeiro RFC, por exemplo), o `.gitkeep` pode ser apagado, mas deixá-lo não faz mal.

## 2. Por que o snippet ainda estava em `utils/`?

Faz sentido estranhar. Ele estava lá porque o `AGENTS.md` precisa ficar na **raiz** do projeto: a IA só o lê ali. O mesmo vale para o `.github/`, que o GitHub só lê na raiz. Mas, dentro de `.agents/project/docs/`, ele exigia um passo manual extra de "copie daqui para lá", e o nome "snippet" já não descrevia o conteúdo.

**Corrigi mudando a lógica: `utils/` agora espelha a raiz do projeto consumidor.**

```
utils/                              projeto consumidor (raiz)
├── AGENTS.md                  →    AGENTS.md
├── .github/pull_request_template.md → .github/pull_request_template.md
├── pnpm-workspace.yaml        →    pnpm-workspace.yaml
└── .agents/project/           →    .agents/project/
```

Com isso a instalação virou um único comando:
```bash
cp -rn node_modules/dev-governance/utils/. ./
```
O `-n` impede que um `AGENTS.md` já existente no projeto seja sobrescrito. Nesse caso você mescla à mão, e o README explica isso no passo 5.

Também apaguei as cópias do snippet e do template de PR na instância do próprio dev-governance (`.agents/project/docs/`), porque o dev-governance já tem um `AGENTS.md` próprio. Atualizei as referências no [README.md](README.md), nos dois PROJECT_MAPs, no [AGENTS.md](AGENTS.md) e no `convencoes-git.md`.

## 3. Pasta `adr`

Ela **não existia** em lugar nenhum do repositório. A única coisa relacionada era uma menção a `.agents/project/docs/adr/` na skill `grill-plan`, que eu já tinha trocado pelo fluxo de RFC na rodada anterior. Conferi com uma busca e não sobrou nenhuma referência.

## 4. Exemplos de spec e task excluídos

| Arquivo | Onde estava |
|---|---|
| `001-criar-funcao-count-task.md` | `.agents/project/tasks/` |
| `001-criar-tarefa.md` | `.agents/project/tasks/` |
| `project-ask.md` | `.agents/project/tasks/` **e** `utils/.agents/project/tasks/` |
| `ask.md` | `.agents/global/specs/` (era um modelo de spec, duplicando o `template-spec.md`) |

As pastas `tasks/` ganharam `.gitkeep` (pelo motivo da pergunta 1). Mantive os templates: `template-spec.md`, `template-task.md` e `template-progress.md`. Também acrescentei o `package.json` (que você voltou para a raiz) ao mapa do dev-governance.

## 5. Onde ficam as conversas, para usar em casa

O Claude Code grava cada conversa como um arquivo `.jsonl` no seu usuário do **WSL**:

```
~/.claude/projects/-home-observatorio-Github-dev-governance/
├── c1c23a80-938e-41d0-8dd8-3a36f9a77d53.jsonl   ← esta conversa (~1,7 MB)
└── memory/                                       ← memória persistente do projeto
```

O nome da pasta é o caminho do projeto com `/` trocado por `-`. Pelo Explorer do Windows, ela fica em `\\wsl$\<sua-distro>\home\observatorio\.claude\projects\`.

**Para continuar em casa:**
1. Copie o `.jsonl` (e a pasta `memory/`, se quiser) para `~/.claude/projects/<pasta>/` no outro computador.
2. A `<pasta>` precisa corresponder ao caminho do projeto **lá**. Se em casa o repositório estiver em `/home/charlie/dev/dev-governance`, a pasta se chama `-home-charlie-dev-dev-governance`.
3. Abra o projeto e retome pelo histórico de conversas da extensão, ou com `claude --resume` no terminal.

**Dois cuidados:**
- O `.jsonl` guarda **tudo** o que passou pela conversa, incluindo o conteúdo dos arquivos lidos. Não o coloque no repositório git, principalmente se for público.
- O histórico mais confiável não é a conversa, é o próprio repositório. Tudo o que decidimos está nos arquivos: README, GLOBAL_RULES, templates e skills. Fazendo commit e push, em casa basta um `git pull` e uma conversa nova lendo o `AGENTS.md`. Esse é justamente o propósito do sistema que montamos: o contexto mora no repositório, não na memória da sessão.

Se quiser, preparo o commit com essas mudanças. Pela convenção que definimos, ele vai para uma branch nova, já que você está na `master`.