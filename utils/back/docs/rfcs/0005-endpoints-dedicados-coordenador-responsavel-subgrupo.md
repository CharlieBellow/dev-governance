# RFC 0005: Endpoints dedicados para gerenciar coordenadores/responsáveis de subgrupo

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-08-28 |
| **Módulo(s) afetado(s)** | `servicebook` (`ServiceSubGroup`), `core` (`Person.findById` — relation `user`/`user.roles`), `accounts` (atribuição de role) |
| **Categoria de impacto** | (x) Quebra contrato existente com o front — o `PATCH subgroup/:id` atual, que o front já consome, deixa de aceitar `coordinatorsIds`/`responsiblesIds` |
| **Janela de aviso aplicada** | Sugerida: confirmação ativa do time de front antes do cutover (mudança de contrato consumido) — não decidido por mim, precisa de confirmação de quem revisar |
| **Confirmação ativa recebida de** | *(em branco até a resposta chegar)* |
| **Pessoas marcadas no PR** | *(em branco — quem abrir o PR decide)* |

---

## 1. Problema

`PATCH servicebook/subgroup/:id` aceita `coordinatorsIds`/`responsiblesIds` como **substituição total** da lista de coordenadores/responsáveis do subgrupo (`UpdateServiceSubGroupUseCase` resolve os ids recebidos e sobrescreve o array inteiro via `Object.assign` no repositório). Isso é exatamente o padrão que a RFC 0001 já rejeitou para `Room.authorizedPersons` — e a própria RFC 0001, seção 7, já nomeia este mesmo PATCH de subgrupo como um dos três pontos do sistema que divergem do padrão de endpoint dedicado, registrado como dívida, não corrigido ali.

Além do problema estrutural, falta comportamento de negócio que a `master` já tinha (commits `dbf8604`/`1d0fb20`, nunca portados pra `dev`): quando alguém é adicionado como coordenador/responsável de um subgrupo, checar se a pessoa já tem a role `SERVICEBOOK_COORDINATOR`/`SERVICEBOOK_RESPONSIBLE` e, se não tiver, concedê-la automaticamente. Hoje a `dev` não faz isso — um coordenador pode ser adicionado ao subgrupo sem nunca ganhar a role que dá a ele poder de gerência sobre as Service Orders desse subgrupo (`CaslAbilityFactory.serviceBookAbilities()`).

## 2. Contexto

Surgiu durante a sub-issue 1 da RFC 0004 (triagem `master`↔`dev`, fix de exposição de `socialName`). Ao avaliar como portar `dbf8604`/`1d0fb20`, ficou claro que a forma correta de portar não é adicionar mais lógica ao `UpdateServiceSubGroupUseCase` genérico — seria empilhar comportamento em cima de um padrão já sinalizado como errado (RFC 0001 §7).

Verificado nesta análise:
- **Quem pode chamar isso hoje:** só `ADMIN`/`SERVICEBOOK_ADMIN` (`can(Action.MANAGE, ServiceSubGroup)` restrito a essas duas roles em `CaslAbilityFactory.serviceBookCatalogAbilities()`) — não é superfície aberta a qualquer usuário autenticado.
- **O que a role concede de fato**, hoje, em `CaslAbilityFactory.serviceBookAbilities()`: `SERVICEBOOK_COORDINATOR` → `can(Action.MANAGE, ServiceOrder, isInServiceOrderSubGroupCoordinators)`; `SERVICEBOOK_RESPONSIBLE` → update de status + follow-up, mesmo condicionamento. Em ambos os casos a permissão é escopada por ABAC (checa vínculo real com o subgrupo no momento da ação), não é um cheque em branco global.
- **Cronologia da `master`:** `1d0fb20` (09:50) bloqueava com `UnauthorizedException` quem não tinha a role antes de virar coordenador/responsável; `dbf8604` (14:12, mesmo dia) reverteu isso pra auto-concessão. A reversão em poucas horas é sinal forte de fricção operacional real — bloquear obrigava o admin a editar a role da pessoa numa tela separada antes de conseguir adicioná-la.
- **`Person.findById` (`src/modules/core/infra/repositories/typeorm/typeorm-person.repository.ts`) não carrega a relation `user`/`user.roles` hoje.** Sem isso, a checagem "essa pessoa já tem a role?" não tem como funcionar — dependência direta desta RFC, mesmo gap do commit `71fd648` (mapeado separadamente na sub-issue 6 da RFC 0004; resolver aqui também cobre aquele item, evitar retrabalho).
- **`ServiceSubGroup.coordinators`/`responsibles` são `Person[]`** (`src/modules/servicebook/domain/entities/service-subgroup.entity.ts`). O `PATCH` atual retorna a entidade `ServiceSubGroup` crua — se os endpoints novos fizerem o mesmo, a resposta serializaria `Person[]` inteiro, reintroduzindo a exposição de `socialName` que acabou de ser corrigida na sub-issue 1 da RFC 0004. Precisa de um DTO de resposta que use `PersonSummaryDto` (já existente, já seguro) pros arrays de coordenadores/responsáveis, não a entidade.

## 3. Alternativas consideradas

### Alternativa A: Manter `PATCH` genérico, adicionar campos delta (`addCoordinatorIds`/`removeCoordinatorIds`)
- Descrição: em vez de substituição total, a mesma rota aceitaria ids a adicionar/remover.
- Prós: resolve o problema de *lost update* concorrente sem criar rota nova.
- Contras: mesmo problema estrutural já rejeitado pela RFC 0001 (Alternativa B de lá) — mistura validação de domínio de pessoa com validação de domínio de subgrupo na mesma rota/usecase, ainda impede aplicar guard/policy diferenciado por operação no futuro.

### Alternativa B: Endpoints dedicados, sem portar o comportamento de role
- Descrição: só resolve o problema estrutural (endpoints delta), deixa a auto-concessão de role de fora, como trabalho futuro.
- Prós: escopo menor, revisão mais rápida.
- Contras: deixa a lacuna de comportamento da `master` aberta de novo — precisaria reabrir esta mesma área de código depois, com o mesmo esforço de RFC + design doc, pra terminar o que já estava mapeado.

### Alternativa C: Endpoints dedicados com auto-concessão de role, e revogação automática ao remover o último vínculo (escolhida)
- Descrição: clona o padrão de `Room.authorizedPersons` (RFC 0001) pra `coordinators`/`responsibles`; ao adicionar, concede a role se faltar; ao remover, verifica se a pessoa não coordena/não é responsável de nenhum outro subgrupo e, se for o caso, revoga a role correspondente.
- Prós: fecha o ciclo completo — a role deixa de ser uma credencial que só cresce e nunca expira.
- Contras: exige consultar todos os subgrupos da pessoa a cada remoção (custo e complexidade adicionais).

### Alternativa D: Endpoints dedicados com auto-concessão de role, sem revogação automática
- Descrição: mesma estrutura da Alternativa C, mas remover alguém do subgrupo não revoga a role automaticamente — revogação continua sendo ação manual, via edição de roles do usuário (fluxo já existente).
- Prós: fecha o comportamento que a `master` já tinha (`dbf8604`), sem o custo de consulta cruzada da Alternativa C.
- Contras: **o risco aqui não é sobre o ato de adicionar alguém a um subgrupo (essa ação já é gated a `ADMIN`/`SERVICEBOOK_ADMIN`, e o `MANAGE` resultante é exatamente o que se pretende ao tornar alguém coordenador — não é um bug, é a role funcionando como desenhada).** O risco é a role virar uma credencial que nunca expira sozinha: pessoa sai do Subgrupo A porque o contexto que justificava aquele acesso deixou de existir (mudou de função, saiu da instituição, teve a confiança revogada por algum motivo que não passa pelo sistema) — mas a role continua. Anos depois, um admin sem esse histórico a adiciona ao Subgrupo B por um motivo administrativo qualquer, e ela reativa instantaneamente `MANAGE` completo sobre as Service Orders de B (ler, editar — inclusive reatribuir `responsiblesIds` — e excluir), sem que ninguém tenha reavaliado se ela ainda deveria ter esse nível de acesso. É um risco de higiene/auditoria que se acumula (o conjunto de pessoas com a role só cresce, nunca reflete quem coordena algo *hoje*), não de autorização indevida num evento isolado.

## 4. Decisão

Alternativa C. Clonar o padrão de endpoint dedicado já decidido na RFC 0001 pra `coordinators`/`responsibles` de `ServiceSubGroup`, incluindo a auto-concessão de role (comportamento final da `master`, `dbf8604`) **e revogação automática** ao remover: no `remove-coordinators`/`remove-responsibles`, depois de tirar a pessoa da lista do subgrupo, verificar se ela ainda coordena/é responsável de algum outro subgrupo; se não, revogar `SERVICEBOOK_COORDINATOR`/`SERVICEBOOK_RESPONSIBLE` do `User` vinculado. As duas roles são checadas/revogadas independentemente (uma pessoa pode ser coordenadora de um subgrupo e responsável de outro ao mesmo tempo).

`PATCH subgroup/:id` deixa de aceitar `coordinatorsIds`/`responsiblesIds`/`coordinators`/`responsibles` — passa a cuidar só de campos escalares do subgrupo, igual `Room` fez para `PATCH /core/room/:id`.

**Divergência deliberada da RFC 0001, sinalizada explicitamente:** `Room.addAuthorizedPersons`/`removeAuthorizedPersons` usam `POST` pras duas operações (`/authorized-persons` e `/remove-authorized-persons`), e a RFC 0001 já reconhecia isso como inconsistência com convenção REST (seção 7 de lá), sem corrigir. Esta RFC **corrige** o verbo nas rotas novas: `POST` continua pra adicionar, mas remover usa `DELETE` no mesmo caminho (`DELETE subgroup/:id/coordinators`, não uma rota `/remove-coordinators` separada) — ver seção 2 do design doc. A inconsistência de `Room` **não é alterada por esta RFC** e passa a ser débito técnico explícito, candidato a correção em implementação futura (seção 8).

## 5. Precedente no projeto

Segue o padrão já decidido na RFC 0001 para `Room.authorizedPersons` — endpoint dedicado por operação, validação de existência de pessoa isolada da validação da entidade principal, delta em vez de substituição total:

```
src/modules/core/presentation/room/controllers/add-authorized-persons.controller.ts
src/modules/core/presentation/room/controllers/remove-authorized-persons.controller.ts
src/modules/core/application/room/usecases/add-authorized-persons/add-authorized-persons.usecase.ts
src/modules/core/infra/repositories/typeorm/typeorm-room.repository.ts (addAuthorizedPersons/removeAuthorizedPersons)
```

Diverge do precedente só no verbo HTTP de remoção (`DELETE`, não `POST /remove-*`) — ver seção 4.

A atribuição de role reaproveita o padrão já usado em `UpdateUserUseCase` (`src/modules/accounts/application/user/use-cases/update-user/update-user.usecase.ts`): resolver `Role[]` via `RolesRepository.findManyByNames`, atribuir a `user.roles`, `UserRepository.save(user)`.

## 6. Consequências

### 6.1 Positivas

- Fecha uma das três dívidas nomeadas explicitamente na RFC 0001 §7.
- Duas edições concorrentes na lista de coordenadores/responsáveis (dois admins mexendo ao mesmo tempo) convergem sem se apagar.
- Validação de existência de pessoa (`PersonRepository.checkPersonsExist`, hoje não usada pelo fluxo de subgrupo) isolada da validação de atributos do subgrupo.
- Porta o comportamento de auto-concessão de role que a `master` já tinha e a `dev` nunca ganhou.
- Resolve, como efeito colateral necessário, o gap do commit `71fd648` (relation `user`/`user.roles` faltando em `Person.findById`), evitando retrabalho na sub-issue 6 da RFC 0004.
- Revogação automática evita que a role vire uma credencial permanente, desconectada do fato que a justificava — a role passa a refletir "quem coordena/é responsável por algo agora", não "quem já coordenou algo alguma vez".
- Corrige o verbo HTTP de remoção (`DELETE` em vez de `POST /remove-*`), que a RFC 0001 já reconhecia como inconsistência mas manteve para `Room` — esta RFC não repete o erro conhecido. Como efeito colateral, o guard CASL padrão (`@Subject`, sem `@CheckPolicies`) passa a mapear a remoção pra `Action.DELETE` corretamente, em vez de cair em `Action.CREATE` como acontece hoje em `Room` (onde as duas operações usam `POST`).

### 6.2 Negativas / trade-offs aceitos

- Quebra o contrato atual do `PATCH subgroup/:id` — exige coordenação com o front antes do merge, não é troca silenciosa.
- `remove-coordinators`/`remove-responsibles` precisam consultar todos os outros subgrupos da pessoa antes de decidir revogar a role — custo e complexidade adicionais.
- Cria um segundo caminho, implícito, de concessão/revogação da mesma role que também é editável via edição explícita de roles do usuário — documentado aqui, não escondido. Se um admin revogar a role manualmente enquanto a pessoa ainda coordena algum subgrupo, o próximo `remove-coordinators`/`add-coordinators` dessa pessoa pode reconceder a role automaticamente (comportamento esperado do auto-grant, mas vale quem revisar estar ciente).
- `Person.findById` ganha relations novas (`user`, `user.roles`) que outros consumidores desse método não precisam — leve custo de over-fetching fora do escopo direto desta mudança.

## 7. Riscos e perguntas em aberto

- Janela de aviso e forma de coordenação com o front (seção acima) não decidida por mim — depende de quem revisar confirmar prazo e formato.
- Nenhuma das rotas novas terá `@CheckPolicies` específico, só o guard CASL padrão via `@Subject` — mesma limitação que `Room` já tem hoje (nenhuma política por rota, só o mapeamento genérico de verbo→ação), não é regressão introduzida por esta RFC, mas também não é resolvida por ela.
- O enum `UserRole` está duplicado (`accounts` e `casl`, valores idênticos) — esta RFC usa o de `casl` por ser o mais recente, sem tentar unificar os dois; se isso gerar inconsistência prática, é uma RFC própria.
- A checagem "a pessoa ainda coordena/é responsável de outro subgrupo?" (seção 4) não foi testada sob concorrência — duas remoções simultâneas em subgrupos diferentes da mesma pessoa poderiam, em teoria, ambas verificarem "ainda tem outro vínculo" antes de a outra terminar, e nenhuma revogar quando deveriam. Risco de baixo impacto (pior caso é a role não revogada, não uma revogação indevida), mas não verificado nesta análise.

## 8. Escopo de aplicação futura

Esta decisão reforça a convenção já estabelecida na RFC 0001 (seção 8): qualquer relação N:N gerenciada entre uma entidade principal e outra deve ter endpoint dedicado de add/remove, separado do update genérico da entidade principal. Dos três casos citados na RFC 0001 §7 (`user.roles`, `service-subgroup.coordinators/responsibles`, `service-order.responsiblesIds`), esta RFC resolve o segundo; os outros dois continuam em aberto, candidatos a RFC futura.

Além disso, esta RFC estabelece que remoção de item de relação N:N usa `DELETE`, não `POST /remove-*`, como convenção daqui pra frente — `Room.authorizedPersons` (RFC 0001) fica como a única exceção conhecida a essa convenção, registrada aqui como débito técnico explícito. Alinhar `Room` ao novo padrão é candidato a correção futura, fora do escopo desta RFC.

---

*Aprovado com uma mudança em relação ao rascunho original: as rotas de remoção usam `DELETE`, não `POST /remove-*` (seção 4/5/8) — a inconsistência de verbo da RFC 0001 fica registrada como débito técnico de `Room`, não repetida aqui.*
