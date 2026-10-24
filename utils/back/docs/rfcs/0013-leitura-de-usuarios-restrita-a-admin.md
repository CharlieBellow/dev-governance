# RFC 0013: Leitura de usuários (`GET /users*`) restrita a ADMIN

| Campo | Valor |
|---|---|
| **Status** | Proposto |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-10-01 |
| **Módulo(s) afetado(s)** | `casl` (`CaslAbilityFactory`), `accounts` (controllers de leitura de `User`) |
| **Categoria de impacto** | ( ) Interno, sem impacto externo &nbsp;&nbsp; ( ) Afeta consumo do front &nbsp;&nbsp; (x) Quebra contrato existente com o front &nbsp;&nbsp; ( ) Requer infraestrutura nova |
| **Janela de aviso aplicada** | Sugerida: ~1 semana com confirmação ativa do front. Usuários que hoje leem `/users` e `/users/:id` passam a receber `403`. Não decidido por mim, precisa de confirmação de quem revisar |
| **Confirmação ativa recebida de** | Time do front (de acordo com a restrição a ADMIN) |
| **Pessoas marcadas no PR** | *(em branco: quem abrir o PR decide)* |

---

## 1. Problema

Qualquer usuário autenticado, de qualquer role, consegue ler os dados de qualquer outro usuário. Na `CaslAbilityFactory` (`src/modules/casl/factories/casl-ability-factory.ts:60-69`), todo usuário que não é ADMIN recebe `can(Action.READ, User)` sem condição nenhuma. Com isso, estas rotas ficam abertas a todos:

| Rota | Controller | O que expõe |
|---|---|---|
| `GET /users` | `list-users.controller.ts` | lista paginada e pesquisável de todos os usuários |
| `GET /users/:id` | `find-user-by-id.controller.ts` | qualquer usuário pelo id |
| `GET /users/find?email=` | `find-user-by-email.controller.ts` | qualquer usuário pelo email |
| `GET /users/responsibles` | `find-users-responsibles.controller.ts` | lista de usuários com role `SERVICEBOOK_RESPONSIBLE` |

As respostas incluem nome, email, `username` (CPF), roles e permissions. Até a correção do vazamento de senha (branch de fix que acompanha estas RFCs), `GET /users/responsibles` também devolvia o hash da senha de cada usuário da lista.

## 2. Contexto

Levantamento do uso dessas rotas no front (`glpi-frontend`):

- **`GET /users`**: usado só pela tela `/users` (`src/app/(privates)/(routes)/users/page.tsx:30`), que o front libera para `ADMIN` e `SERVICEBOOK_ADMIN` (`src/Utils/routes.ts:144-149`). O card da home do coordenador também tem um botão "Administrar Usuários" que leva para essa tela (`src/components/Cards/CardHome/CardHomeCoordinator.tsx:118`). No backend, `SERVICEBOOK_ADMIN` já não pode criar, editar nem excluir usuários, então hoje ele entra numa tela de administração em que só consegue ler.
- **`GET /users/:id`**: usado pela tela de conta (`/account`) de todos os usuários, com o próprio id. A RFC 0012 migra esse uso para `GET /users/profile`.
- **`GET /users/find`**: nenhuma tela usa. Existe um `getUserByEmail` em `src/Utils/server/getInfo.tsx:176` que ninguém chama (e que manda o email no body de um GET, então não funcionaria).
- **`GET /users/responsibles`**: nenhuma tela usa. O hook `FindAllUsersResponsibles` (`src/hooks/query/useUser.ts:25`) não é chamado. A tela `/responsibles` usa as rotas de subgrupo e de pessoa.

O time do front confirmou que essas leituras devem ser exclusivas de ADMIN e que vai fazer a migração da RFC 0012.

O padrão de autorização é o da RFC 0002: as regras ficam centralizadas na `CaslAbilityFactory`, e os controllers declaram `@Subject(User)` para o `PoliciesGuard` deduzir a ação pelo método HTTP.

## 3. Alternativas consideradas

### Alternativa A: Remover `can(READ, User)` de quem não é ADMIN na `CaslAbilityFactory` (escolhida)
- Descrição: tirar a linha `can(Action.READ, User)` de `accountsAndAcademicAbilities`. Os controllers continuam com `@Subject(User)` e o guard passa a negar `READ` para quem não tem `MANAGE all`.
- Prós: uma mudança em um lugar só, que é o lugar onde a RFC 0002 decidiu concentrar as regras. Nenhum controller de leitura muda. Rotas novas de leitura de `User` com `@Subject(User)` já nascem restritas.
- Contras: afeta todas as rotas que usam `@Subject(User)` com GET, inclusive `GET /users/profile`, que precisa continuar aberto (ver seção 4).

### Alternativa B: `@CheckPolicies` com checagem de role em cada controller de leitura
- Descrição: manter `READ User` para todos e adicionar, em cada controller, um handler que exige ADMIN.
- Prós: a restrição fica visível no controller.
- Contras: a regra fica espalhada em 4 controllers, e a factory continua dizendo que qualquer um pode ler `User`, o que é falso. Diverge da RFC 0002, que usa justamente os controllers de `User` com só `@Subject(User)` como precedente. Uma rota nova esquecida sem o decorator nasceria aberta.

### Alternativa C: Condição de dono (`can(READ, User, { id: sub })`)
- Descrição: trocar o `READ` irrestrito por um `READ` só do próprio registro.
- Prós: permitiria manter `GET /users/:id` para o próprio usuário.
- Contras: não fecha as rotas sem id. No CASL, `ability.can(READ, User)` checado contra a **classe** retorna `true` quando existe qualquer regra de `READ` para ela, mesmo com condição. `GET /users`, `/find` e `/responsibles` não pré-carregam entidade (não têm `:id`), então o guard checa a classe e continuaria liberando. Além disso, com a RFC 0012 o próprio usuário passa a usar `/users/profile`, então essa condição não teria uso.

## 4. Decisão

Alternativa A. É a única que fecha as quatro rotas, inclusive as sem `:id`, e mantém a regra no lugar central definido pela RFC 0002.

O que muda:

1. **`CaslAbilityFactory`**: remover `can(Action.READ, User)` de `accountsAndAcademicAbilities`. `Role`, `Permission` e `Course` continuam com `READ` para todos (fora de escopo).
2. **`ProfileUserController` (`GET /users/profile`)**: remover `@Subject(User)`. A rota só devolve o próprio usuário (id do JWT), então não precisa de checagem de ability, no mesmo formato do `PATCH /password` e do `PATCH /users/profile` da RFC 0012. Sem isso, o passo 1 bloquearia o perfil de quem não é ADMIN.
3. **Rotas que passam a ser só ADMIN**: `GET /users`, `GET /users/:id`, `GET /users/find`, `GET /users/responsibles`. Quem não é ADMIN recebe `403`.
4. **Testes**: adicionar ao `test/modules/authorization/authorization.integration.spec.ts` casos verificando `403` para quem não é ADMIN nessas quatro rotas e `200` em `GET /users/profile`. Um spec unitário da `CaslAbilityFactory` verificando que nenhuma role além de ADMIN tem `READ`, `CREATE`, `UPDATE` ou `DELETE` em `User` protege contra alguém reabrir essas permissões sem querer.

**Ordem de entrega:** esta mudança só pode ir para produção **depois** de o front publicar a migração da tela de conta para `/users/profile` (RFC 0012). Antes disso, a tela de conta de quem não é ADMIN quebra (`403` em `GET /users/:id`).

## 5. Precedente no projeto

Regra centralizada na factory e controllers só com `@Subject`, como definido na RFC 0002 (seção 5), que cita os controllers de `User` como exemplo:

```
src/modules/accounts/presentation/user/controllers/create-user.controller.ts
src/modules/casl/factories/casl-ability-factory.ts
```

Rota do próprio usuário sem `@Subject`, com id vindo do JWT:

```
src/modules/accounts/presentation/password/controllers/update-password-user.controller.ts
```

## 6. Consequências

### 6.1 Positivas

- Usuários deixam de conseguir listar ou consultar dados (nome, email, CPF, roles) de outros usuários.
- As permissões de `User` passam a ser coerentes: hoje quem não é ADMIN pode ler, mas não pode criar, editar nem excluir. Depois, `User` inteiro fica com ADMIN, exceto as rotas de perfil.
- Mudança pequena no backend: uma linha na factory e um decorator a menos no `ProfileUserController`.

### 6.2 Negativas / trade-offs aceitos

- **`SERVICEBOOK_ADMIN` perde o acesso de leitura à tela `/users`.** O front precisa tirar `ROLES.servAdmin` da rota `/users` (`routes.ts:144-149`) e o botão "Administrar Usuários" do card do coordenador (`CardHomeCoordinator.tsx:118`). Se o `SERVICEBOOK_ADMIN` precisar consultar usuários para algum fluxo do servicebook, isso vai precisar de uma rota própria.
- Quebra de contrato para qualquer consumidor que não seja o front e que leia `/users` com usuário que não é ADMIN. Não conheço nenhum, mas não dá para descartar.
- Dependência de ordem de deploy com a RFC 0012 (seção 4).

## 7. Riscos e perguntas em aberto

- **Manter ou remover `GET /users/find` e `GET /users/responsibles`.** Nenhuma das duas tem uso no front. Esta RFC só as restringe a ADMIN. Removê-las reduziria superfície, mas pode haver uso fora do front que eu não conheço (scripts, outro serviço). Fica para quem revisar decidir.
- **Outros pontos do sistema que dependem de `READ User`.** Procurei por `@Subject(User)` e `subject: User` fora dos controllers de usuário e não encontrei nada. Ainda assim, abilities são checadas em runtime, e não há teste que cubra todas as rotas. O teste de integração da seção 4 reduz esse risco, mas não o elimina.
- **Middleware de rotas do front.** O `middleware.ts` do front (`glpi-frontend/src/middleware.ts:44-50`) redireciona o usuário se *qualquer* role dele não estiver na lista da rota, em vez de liberar se *alguma* estiver. Um ADMIN que também tenha outra role (ex.: `SCHEDULE_ADMIN`) seria barrado na tela `/users` pelo front, mesmo com o backend liberando. Não é escopo desta RFC, mas afeta diretamente quem consegue usar a tela depois da mudança.
- **Janela de aviso.** Sugeri a de "quebra de contrato" (~1 semana) porque usuários que hoje recebem `200` passam a receber `403`. Como o front já confirmou e os usos atuais estão mapeados, quem revisar pode julgar que a janela de "afeta consumo" (48–72h) basta.

## 8. Escopo de aplicação futura

Convenção proposta: **leitura de dados de outros usuários (`User`) é exclusiva de ADMIN.** Telas e fluxos que precisem mostrar outras pessoas (responsáveis, coordenadores, pessoas autorizadas) devem usar `Person` e seus DTOs resumidos (`PersonSummaryDto`), como as telas de subgrupo e sala já fazem, e não as rotas de `/users`.

Se surgir uma necessidade real de outra role consultar usuários, ela deve ser tratada em RFC própria, com regra explícita na `CaslAbilityFactory` para essa role, e não reabrindo o `READ User` para todos.

---

*Este RFC segue o modelo de "lazy consensus": a decisão entra em vigor ao final da janela de aviso indicada acima, salvo objeção registrada no Pull Request antes desse prazo.*
