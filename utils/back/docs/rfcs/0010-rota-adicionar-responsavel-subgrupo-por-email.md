# RFC 0010: Rota dedicada para adicionar responsible de subgrupo por email

| Campo | Valor |
|---|---|
| **Status** | Proposto |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-09-18 |
| **Módulo(s) afetado(s)** | `servicebook` (`ServiceSubGroup.responsibles`), `core` (`PersonRepository` — novo método `findByEmail`) |
| **Categoria de impacto** | ( ) Interno, sem impacto externo &nbsp;&nbsp; (x) Afeta consumo do front &nbsp;&nbsp; ( ) Quebra contrato existente com o front &nbsp;&nbsp; ( ) Requer infraestrutura nova |
| **Janela de aviso aplicada** | Sugerida: 48–72h úteis com confirmação ativa do front — endpoint novo que o front vai passar a consumir para corrigir o erro relatado na #119. Não decidido por mim, precisa confirmação de quem revisar |
| **Confirmação ativa recebida de** | Time do front |
| **Pessoas marcadas no PR** | *(em branco — quem abrir o PR decide)* |

---

## 1. Problema

O front, na tela "Funcionários" (`/responsibles`), envia `{ email }` para `POST servicebook/subgroup/:id/responsibles`, que hoje só aceita `{ personIds: string[] }` (UUIDs). Resultado:

```
["each value in personIds must be a UUID","personIds must be an array"]
```

Relatado na #119 durante a validação pós-merge dev/master. É preciso uma rota nova que aceite `email` e resolva internamente para o `personId` correspondente, sem alterar a rota existente (que outros consumidores já usam).

## 2. Contexto

O contrato atual (`personIds`) foi estabelecido pela RFC 0005 + design doc 0001, e está em produção — `AddResponsiblesUseCase` (`src/modules/servicebook/application/service-subgroup/usecases/add-responsibles/add-responsibles.usecase.ts`) já resolve existência de pessoa, concede a role `SERVICEBOOK_RESPONSIBLE` quando a `Person` tem `User` vinculado (pula silenciosamente quando não tem — `person.user` nulo, linhas 85-90), e cascateia para as Service Orders abertas do subgrupo.

Investigação do fluxo do front (tela "Funcionários"): `ChooseUsersBySubgroup` seleciona grupo/subgrupo → botão "Adicionar Funcionário" → dialog (`CreateUserDialog`) com campo de texto livre para email. O `GET` que popula a tabela dessa mesma tela é `servicebook/subgroup/:id`, que devolve `ServiceSubGroupResponseDto` com `coordinators`/`responsibles` como `PersonSummaryDto[]` (`{ id, name }`) — nenhum dado de `User` aparece em nenhum ponto dessa tela.

Precedente relevante: RFC 0001 (`Room.authorizedPersons`) documenta um conflito real em que o front pediu explicitamente `personIds`, não `userIds`, para o mesmo tipo de relação ("pessoas autorizadas a X").

Confirmado nesta análise: o mesmo problema **não existe** em `add-coordinators` (`POST subgroup/:id/coordinators`, mesmo DTO `ManageSubGroupPersonsDto`) — o front não tem um fluxo equivalente de email livre para coordinators hoje. Escopo desta RFC fica restrito a `responsibles`.

## 3. Alternativas consideradas

### Alternativa A: Resolver contra `User.email`
- Descrição: buscar `UserRepository.findByEmail(email)` e usar `user.personId`.
- Prós: `User.email` é `unique` no banco (`migration CreateUser`, `isUnique: true`); `Person.email`/`secondaryEmail` são nullable e sem constraint de unicidade — `User.email` elimina ambiguidade por construção. Também entrega direto o `User` necessário para a concessão de role.
- Contras: contradiz o precedente da RFC 0001 (`Room`, front pediu `Person` explicitamente); a tela "Funcionários" inteira (listagem + contrato de resposta) já opera 100% em termos de `Person` (`PersonSummaryDto`), sem nenhuma referência a `User` — introduzir `User` só nesse ponto quebraria a consistência conceitual da tela; a issue pede que a rota devolva `personId`, não `userId`, reforçando que a identidade esperada é `Person`.

### Alternativa B: Resolver contra `Person.email` **e** `Person.secondaryEmail`
- Descrição: tentar `email` primeiro, cair para `secondaryEmail` se não achar.
- Prós: reduz falso-negativo se o cadastro da pessoa tiver o email "certo" no campo secundário.
- Contras: `secondaryEmail` não tem nenhum uso funcional em nenhum outro ponto do sistema hoje (campo somente-escrita, gravado em `CreatePersonDto`/`PersonContactDto`, nunca lido/consultado em nenhuma regra de negócio) — não há precedente que justifique tratá-lo como campo de busca. Nenhum dos dois campos tem unicidade garantida no banco; checar os dois aumenta a chance (ainda que pequena) de colisão entre `Person` diferentes sem adicionar valor comprovado.

### Alternativa C: Resolver apenas contra `Person.email` (escolhida)
- Descrição: `PersonRepository` ganha `findByEmail(email)`, consultando só a coluna `email` de `Person`.
- Prós: `Person.email` é o único campo de email de `Person` com propósito funcional já documentado no sistema (`isActiveMail` — "recebe notificações no email"); consistente com o precedente da RFC 0001 e com o contrato 100% `Person`-based já usado pela tela; elimina a ambiguidade de dois campos candidatos (Alternativa B) sem precisar de lógica de prioridade/fallback.
- Contras: se o cadastro de uma pessoa tiver `email` vazio/desatualizado mas `secondaryEmail` correto, a busca não a encontra mesmo ela existindo no sistema — risco de qualidade de dado, não de arquitetura (ver seção 7).

## 4. Decisão

Alternativa C. O argumento decisivo não é só o precedente do front (RFC 0001) — é que o comportamento de "responsible sem `User` vinculado" já está resolvido no sistema hoje, e não exige que a resolução passe por `User`: `AddResponsiblesUseCase.grantResponsibleRole` já pula a concessão de role silenciosamente quando `person.user` é nulo (comportamento herdado da `master`, formalizado na RFC 0005 §4 após reversão histórica de um bloqueio equivalente — ver seção 7 daquela RFC, commits `1d0fb20`/`dbf8604`). Ou seja: resolver contra `User.email` não pouparia essa checagem — ela continuaria necessária de qualquer forma antes de conceder a role —, e traria o custo de contradizer o padrão já estabelecido pela tela e pelo precedente do `Room`.

A nova rota **reaproveita** `AddResponsiblesUseCase` por composição, em vez de duplicar a lógica de concessão de role/cascata: resolve `email` → `personId` via `PersonRepository.findByEmail`, e delega para `AddResponsiblesUseCase.execute(subGroupId, { personIds: [person.id] })`. Isso garante que as duas rotas (`personIds` e `by-email`) tenham exatamente o mesmo comportamento de negócio, sem risco de divergirem no futuro.

A rota existente (`personIds`) permanece intacta — esta é uma rota nova, adicional, não uma substituição.

## 5. Precedente no projeto

Segue a decisão da RFC 0001 quanto a modelar a relação em termos de `Person`, não `User`:

```
src/modules/core/presentation/room/dtos/add-authorized-persons.dto.ts (personIds)
src/modules/servicebook/application/service-subgroup/usecases/add-responsibles/add-responsibles.usecase.ts
```

**Não há precedente direto no projeto para resolução de entidade por email** — nenhum DTO usa `@IsEmail()` como chave de busca hoje (`CreatePersonDto.email` é campo de cadastro, não de lookup), nenhum repositório de `Person` expõe `findByEmail`. Esta RFC introduz esse padrão pela primeira vez no módulo `core`/`servicebook`; o precedente de método `findByEmail` em si existe em `UserRepository` (`src/modules/accounts/domain/user.repository.ts:15`), mas resolvendo contra `User`, não `Person` — citado aqui só como referência de assinatura de método, não como precedente de decisão (ver Alternativa A, rejeitada).

## 6. Consequências

### 6.1 Positivas

- Front consegue completar o fluxo de "Adicionar Funcionário" sem precisar resolver `personId` do lado dele.
- Rota existente (`personIds`) continua funcionando sem mudança para quem já a consome.
- Reuso de `AddResponsiblesUseCase` garante paridade de comportamento (concessão de role, cascata para Service Orders, idempotência de duplicata) entre as duas rotas, sem duplicar lógica.
- Nenhuma migration nova, nenhuma entidade nova.

### 6.2 Negativas / trade-offs aceitos

- `PersonRepository` ganha um método (`findByEmail`) usado, por enquanto, só por este fluxo.
- `Person.email` continua sem constraint de unicidade no banco — resolver só por ele reduz mas não elimina o risco teórico de colisão entre duas `Person` diferentes (ver seção 7).
- Pessoa resolvida sem `User` vinculado continua sem poder agir de fato como responsible até criar conta — comportamento herdado, não resolvido por esta RFC (ver seção 8 sobre melhoria futura).

## 7. Riscos e perguntas em aberto

- **Confirmação do front ainda pendente.** A decisão de usar `Person.email` (em vez de `User.email`) se apoia em evidência forte mas circunstancial (precedente da RFC 0001, contrato 100% `Person`-based da tela, formato do campo de texto livre) — não em confirmação direta de quem mantém o front sobre a intenção exata do campo. Se a confirmação vier diferente, esta RFC precisa ser revisada antes da implementação avançar.
- **Ambiguidade entre duas `Person` com o mesmo `Person.email`** não é tratada explicitamente nesta decisão — sem constraint de unicidade no banco, o comportamento nesse caso (teoricamente raro) fica arbitrário (o que o TypeORM devolver primeiro). Fica para a implementação decidir se isso merece um erro explícito de ambiguidade ou se o risco é aceitável como está.
- **Formato exato da resposta de sucesso** (devolver o `ServiceSubGroupResponseDto` completo, como as rotas de `personIds`, ou um payload menor focado só em `personId`, como a issue original sugere) não foi fechado nesta discussão — proposta no design doc 0004, sujeita a confirmação de quem revisar.
- `Person.email` vazio/desatualizado gerando falso-negativo (pessoa existe mas não é encontrada) é um risco de qualidade de dado aceito conscientemente (Alternativa C, seção 3) — não medido nesta análise quão frequente isso é na base atual.

## 8. Escopo de aplicação futura

Esta decisão é específica ao contexto de `ServiceSubGroup.responsibles` — motivada pelo precedente concreto da RFC 0001 e pelo formato já 100% `Person`-based desta tela em particular. Não deve ser lida como regra geral de que "toda resolução de identidade por email no sistema usa `Person.email`" — se um caso semelhante aparecer em outro módulo, deve ser avaliado à parte, com sua própria evidência de contexto (o desfecho pode ser diferente, ex. um fluxo que exista precisamente para gerenciar contas teria motivo real para usar `User.email`).

Fora de escopo desta RFC, registrado a pedido explícito durante a análise, candidatos a RFC futura:

- **Criação automática de conta (`User`)** quando a `Person` resolvida por email não tiver conta vinculada — hoje a pessoa é adicionada sem a role, sem bloqueio (seção 4). Um fluxo de auto-criação/convite de conta nesse ponto é melhoria futura, não faz parte desta entrega.
- **Atributo derivado (`hasAccount` ou equivalente) em `PersonSummaryDto`/`PersonResponseDto`**, sinalizando se a `Person` tem `User` vinculado (`!!person.user`) — permitiria ao front indicar, em qualquer tela que liste `Person`, quais pessoas ainda não têm conta no sistema. Custo técnico baixo (a relation `user` já precisa estar carregada para a concessão de role funcionar), mas é aditivo a um contrato já consumido pelo front — candidato a RFC leve própria, não amarrado a esta entrega.
- Mesma rota para `coordinators` — não necessária hoje (confirmado que o front não tem esse problema nesse fluxo), mas se surgir, deve seguir o mesmo padrão decidido aqui.

---

*Este RFC segue o modelo de "lazy consensus": a decisão entra em vigor ao final da janela de aviso indicada acima, salvo objeção registrada no Pull Request antes desse prazo.*
