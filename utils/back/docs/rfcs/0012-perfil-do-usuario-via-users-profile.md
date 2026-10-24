# RFC 0012: Perfil do próprio usuário via `/users/profile` (leitura e edição)

| Campo | Valor |
|---|---|
| **Status** | Proposto |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-10-01 |
| **Módulo(s) afetado(s)** | `accounts` (`User`): novo `PATCH /users/profile`, `GET /users/profile` passa a ser a rota oficial da tela de conta |
| **Categoria de impacto** | ( ) Interno, sem impacto externo &nbsp;&nbsp; (x) Afeta consumo do front &nbsp;&nbsp; ( ) Quebra contrato existente com o front &nbsp;&nbsp; ( ) Requer infraestrutura nova |
| **Janela de aviso aplicada** | Sugerida: 48–72h úteis com confirmação ativa do front. Rota nova e migração do front para uma rota que já existe; nada que o front usa hoje é removido por esta RFC. Não decidido por mim, precisa de confirmação de quem revisar |
| **Confirmação ativa recebida de** | Time do front (informado da migração para `/users/profile` e de acordo em fazê-la) |
| **Pessoas marcadas no PR** | *(em branco: quem abrir o PR decide)* |

---

## 1. Problema

A tela "Minha conta" do front (`/account`) lê e edita o próprio usuário pelas rotas administrativas de CRUD, passando o id que está na sessão:

- leitura: `GET /users/:id` (`glpi-frontend/src/app/(privates)/(routes)/account/page.tsx:16` e `account/components/UpdateUser.tsx:58`);
- edição: `PATCH /users/:id` (`glpi-frontend/src/services/user.ts:82`, chamado em `UpdateUser.tsx:86`).

Isso causa três problemas concretos:

1. **A edição de perfil não funciona para quem não é ADMIN.** `PATCH /users/:id` usa `@Subject(User)`, o `PoliciesGuard` deduz `UPDATE` e, na `CaslAbilityFactory` (`src/modules/casl/factories/casl-ability-factory.ts:60-69`), só o ADMIN tem `UPDATE` em `User` (via `MANAGE all`). Qualquer outro usuário recebe `403` ao salvar o próprio perfil.
2. **Não dá para corrigir o item 1 liberando o `PATCH /users/:id` para o dono.** O `UpdateUserRequestDto` (`src/modules/accounts/application/user/dtos/update-user-request.dto.ts`) aceita `roles`, e o `UpdateUserUseCase` aplica esse campo (`update-user.usecase.ts:36-57`). Uma regra como `can(UPDATE, User, { id: sub })` permitiria que qualquer usuário enviasse `{ "roles": ["ADMIN"] }` para o próprio id e se tornasse administrador.
3. **A garantia de "só o meu usuário" está no cliente, não no servidor.** O front manda o próprio id, mas o backend aceita qualquer id em `GET /users/:id`. Isso impede restringir as rotas `/:id` a ADMIN (RFC 0013) sem quebrar a tela de conta.

## 2. Contexto

- O backend já tem `GET /users/profile` (`src/modules/accounts/presentation/user/controllers/profile-user.controller.ts`), que tira o id do JWT (`payload.sub`) e responde `UserResponseDto`. Nenhuma tela do front usa essa rota hoje.
- O padrão de autorização do projeto é o CASL, definido na RFC 0002. A RFC 0013 depende desta: ela torna as rotas `GET /users/:id` (e as demais leituras de `/users`) exclusivas de ADMIN, o que só é possível depois que a tela de conta deixar de usar `/:id`.
- A ordem de registro dos controllers já trata a colisão entre rotas estáticas e `/:id` (`src/modules/accounts/presentation/accounts.controllers.ts:32-38`, com comentário explicando).
- A senha já tem uma rota própria com o mesmo formato, que usa o id do JWT: `PATCH /password` (`src/modules/accounts/presentation/password/controllers/update-password-user.controller.ts`).

## 3. Alternativas consideradas

### Alternativa A: Liberar `PATCH /users/:id` e `GET /users/:id` para o dono via condição no CASL
- Descrição: adicionar `can(READ, User, { id: sub })` e `can(UPDATE, User, { id: sub })` na `CaslAbilityFactory` para quem não é ADMIN.
- Prós: o front não muda nada; segue a forma de ABAC já usada em `Schedule` e `ServiceOrder`.
- Contras: exige restringir por campo o que o dono pode editar (`can(UPDATE, User, ['name', 'email', 'username'], { id: sub })`). Isso só funciona se o guard checar campo por campo do body, e hoje o `PoliciesGuard` só checa `field` quando o handler declara um `@CheckPolicies` com `field` explícito (`policies.guard.ts:152-153`), um campo só. Sem isso, a regra libera `roles` junto (problema 2 da seção 1). Também mantém uma única rota com duas regras diferentes (admin x dono), que é a mistura que esta RFC quer desfazer.

### Alternativa B: Rotas de perfil dedicadas, com id vindo do JWT (escolhida)
- Descrição: a tela de conta passa a usar `GET /users/profile` (já existe) e um novo `PATCH /users/profile`. Nas duas, o usuário é identificado por `payload.sub`, sem id na URL, e o `PATCH` usa um DTO próprio que só tem os campos editáveis pelo próprio usuário.
- Prós: o cliente não escolhe de quem são os dados, então não há como editar outra pessoa. `roles` nem existe no contrato da rota de perfil, então a escalada de privilégio é impossível por construção, sem depender de checagem por campo no guard. As rotas `/:id` ficam só com o uso administrativo e podem ser restringidas (RFC 0013).
- Contras: uma rota nova e uma migração no front. Um use case a mais no módulo `accounts`.

### Alternativa C: `PATCH /users/:id` com checagem manual "é o dono ou é ADMIN" no use case
- Descrição: manter a rota e decidir dentro do `UpdateUserUseCase`, ignorando `roles` quando quem chama não é ADMIN.
- Prós: nenhuma rota nova.
- Contras: volta a pôr regra de autorização dentro do use case, que é exatamente o que a RFC 0002 decidiu eliminar (seção 6.1 daquela RFC, caso do `CreateScheduleUseCase`). Divergiria de um padrão registrado. Não considerada seriamente.

## 4. Decisão

Alternativa B. O argumento decisivo é que ela torna a escalada de privilégio impossível pelo formato do contrato, não por uma regra que alguém precisa lembrar de manter: a rota de perfil não aceita `roles`, e o `ValidationPipe` global com `whitelist: true` (`src/main.ts:20-26`) descarta qualquer campo fora do DTO antes de chegar ao use case.

Como fica:

- **`GET /users/profile`**: sem mudança de contrato. Passa a ser a rota usada pela tela de conta.
- **`PATCH /users/profile`** (novo):
  - autenticação obrigatória (`AuthGuard` global). Sem `@Subject(User)`: a rota só alcança o próprio registro, então não há checagem de ability a fazer, no mesmo formato do `PATCH /password`;
  - usuário identificado por `@CurrentUser()` → `payload.sub`;
  - body: DTO próprio (ex.: `UpdateProfileRequestDto`) com `name` e `email`, ambos opcionais. Ficam de fora `roles`, `permissions`, `password` (tem rota própria) e `avatar_file` (fora de escopo, ver seção 8). `username` também fica de fora nesta primeira versão (ver seção 7);
  - validação: `email` único. Se o novo email já pertencer a outro usuário, responde `409`, igual ao `UpdateUserUseCase` (`update-user.usecase.ts:29-34`);
  - lógica em um use case próprio de perfil (ex.: `UpdateProfileUseCase`) que só conhece esses campos. Não reaproveita o `UpdateUserUseCase` para evitar que uma mudança futura no use case administrativo volte a expor `roles` pela rota de perfil;
  - resposta: `200` com `UserResponseDto` atualizado, para o front não precisar fazer um `GET` em seguida.
- **Ordem de registro:** o novo controller entra junto do `ProfileUserController`, antes de `UpdateUserController` (`PATCH /:id`) em `accounts.controllers.ts`, para `/profile` não ser capturado por `/:id`.

As rotas `GET /users/:id` e `PATCH /users/:id` continuam existindo com o comportamento atual. A restrição delas a ADMIN é tratada na RFC 0013.

## 5. Precedente no projeto

Rota de operação sobre o próprio usuário, com id vindo do JWT e sem `@Subject`:

```
src/modules/accounts/presentation/password/controllers/update-password-user.controller.ts   (PATCH /password)
src/modules/accounts/presentation/user/controllers/profile-user.controller.ts              (GET /users/profile)
```

Ordem de registro de rotas estáticas antes de `/:id`:

```
src/modules/accounts/presentation/accounts.controllers.ts:32-38
```

Não há precedente de DTO de edição restrito ao próprio usuário. O `UpdateUserRequestDto` é compartilhado com o fluxo administrativo, e é justamente isso que esta RFC separa.

## 6. Consequências

### 6.1 Positivas

- A edição de perfil passa a funcionar para todas as roles, não só para ADMIN.
- Escalada de privilégio pela edição de perfil fica impossível pelo contrato da rota.
- O front deixa de enviar o próprio id para ler e editar o perfil. O servidor decide de quem são os dados.
- Abre caminho para a RFC 0013 restringir as rotas `/:id` a ADMIN sem quebrar a tela de conta.
- Nenhuma migration nem entidade nova.

### 6.2 Negativas / trade-offs aceitos

- Uma rota, um DTO e um use case novos no módulo `accounts`, parcialmente sobrepostos ao `UpdateUserUseCase` (a checagem de email único fica nos dois).
- Mudança no front: `account/page.tsx` e `UpdateUser.tsx` passam a usar `/users/profile`, e `updateUserProfile` (`services/user.ts:81-83`) deixa de mandar o id.

## 7. Riscos e perguntas em aberto

- **`username` editável ou não.** O `username` é validado como CPF (`@IsCpf()`, `src/modules/accounts/application/user/dtos/user-base.ts:22`), e a tela de conta hoje mostra o campo para edição. Esta RFC propõe deixá-lo de fora do perfil, porque não está claro se faz sentido o próprio usuário trocar o CPF de cadastro. Se o time decidir que deve ser editável, entra no DTO com a mesma checagem de unicidade do email. **Precisa de confirmação de quem revisar e do front**, porque muda o formulário.
- **Troca de email sem confirmação.** O email é usado no login (`ValidateUserUseCase` → `findByEmail`). Esta RFC não exige senha atual nem confirmação por email para trocá-lo. Se alguém usar uma sessão aberta de outra pessoa, consegue trocar o email dela. Fica registrado como risco aceito nesta versão.
- **Sessão do front desatualizada.** O NextAuth guarda `name` e `email` no token só no login (callback `jwt` em `glpi-frontend/src/Utils/auth.ts:76-98`). Depois de editar o perfil, o cabeçalho continua mostrando os dados antigos até um novo login, a menos que o front atualize a sessão. É ajuste do lado do front, mas afeta a percepção de que "salvou".
- **Cache do front.** O hook `ListUserById` usa a chave `[QUERY_KEY]` sem o id (`glpi-frontend/src/hooks/query/useUser.ts:36`), a mesma do `FindAllRoles`. Ao migrar para `/profile`, vale o front usar uma chave própria. Não é escopo do backend, registrado para a integração.

## 8. Escopo de aplicação futura

Convenção proposta para o projeto: **operações do usuário sobre os próprios dados usam rotas dedicadas sem id na URL, com o usuário identificado pelo JWT** (como `/password` e `/users/profile`), em vez de condições de dono nas rotas administrativas `/:id`. Rotas `/:id` de `User` ficam para uso administrativo.

Fora de escopo, candidatos a trabalho futuro:

- **Avatar:** o `PATCH /users/:id` zera `avatar_file` antes de chamar o use case (`update-user.controller.ts:31`), e o `UpdateUserAvatarUseCase` não está ligado a nenhuma rota. O upload de avatar do próprio usuário, se for mantido, deve seguir a convenção acima (ex.: `PATCH /users/profile/avatar`), em RFC própria.
- **Semântica do `POST /users/acl/:user_id`:** a rota altera as roles de um usuário existente, mas o guard deduz `CREATE` por ser POST. Hoje dá no mesmo (só ADMIN tem as duas ações). Passa a importar se algum dia houver `UPDATE` em `User` para quem não é ADMIN.

---

*Este RFC segue o modelo de "lazy consensus": a decisão entra em vigor ao final da janela de aviso indicada acima, salvo objeção registrada no Pull Request antes desse prazo.*
