# RFC 0011: Pessoas da sala passam a ser aprovadores de agendamento (renomeia `authorizedPersons` → `approvers`)

| Campo | Valor |
|---|---|
| **Status** | Proposto |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-09-21 |
| **Módulo(s) afetado(s)** | `core/room`, `scheduling`, `casl` |
| **Categoria de impacto** | ( ) Interno, sem impacto externo &nbsp;&nbsp; ( ) Afeta consumo do front &nbsp;&nbsp; (x) Quebra contrato existente com o front &nbsp;&nbsp; ( ) Requer infraestrutura nova — *classificação sugerida, a confirmar por quem revisar* |
| **Janela de aviso aplicada** | ~1 semana com confirmação ativa do consumidor — *sugestão, a confirmar por quem revisar* |
| **Confirmação ativa recebida de** | Front, confirmado na issue #177 |
| **Pessoas marcadas no PR** | |

---

## 1. Problema

`Room.authorizedPersons` foi construído e nomeado como "lista de pessoas autorizadas **a reservar** a sala". A regra de negócio real é outra: essa lista é de pessoas que **aprovam** agendamentos daquela sala. O nome descreve o oposto do uso pretendido, e o código atual implementa a semântica errada:

- `CreateScheduleUseCase` só deixa criar agendamento se o `personId` estiver na lista (`src/modules/scheduling/application/schedule/use-cases/create-schedule/create-schedule.usecase.ts`).
- `scheduleAbilities()` em `src/modules/casl/factories/casl-ability-factory.ts` expressa isso como `can(Action.CREATE, Schedule, { 'room.authorizedPersons': { $elemMatch: { id: personId } } })`.
- Aprovar e cancelar (`MANAGE`) são exclusivos de `ADMIN`/`SCHEDULE_ADMIN`; quem está na lista não tem nenhum poder de aprovação.

Ou seja, hoje a lista **dá permissão de solicitar** e **não dá permissão de aprovar**, o inverso do que o negócio quer.

## 2. Contexto

- Este RFC é a primeira de duas decisões sobre o módulo de agendamento. A segunda (RFC futuro, "ciclo de vida do agendamento") trata de aprovação automática por sala, aprovação manual de recorrência, concorrência de conflito e modelo pai/filho. **Este RFC não decide nada disso**; ele só fixa quem são os aprovadores e como isso é expresso.
- Regras de negócio confirmadas pelo autor:
  1. A lista da sala é de **aprovadores**, não de solicitantes.
  2. Qualquer pessoa autenticada pode **solicitar** agendamento (desde que a sala permita reservas, `allowsReservation`).
  3. Quem está na lista da sala aprova agendamentos **daquela sala**, inclusive os recorrentes. `ADMIN` e `SCHEDULE_ADMIN` continuam aprovando em qualquer sala.
  4. O cancelamento continua com motivo obrigatório, com status `CANCELED`; não haverá status `REJECTED`.
- O RFC 0001 definiu os endpoints dedicados dessa relação com o nome `authorized-persons`. Este RFC altera a nomenclatura definida lá.
- O RFC 0002 definiu que autorização granular deve ser expressa via CASL; as regras novas seguem essa convenção.
- A tabela de junção `room_authorized_persons` foi criada em `src/shared/infra/typeorm/migrations/1784722551413-CreateRoomAuthorizedUsers.ts`.

## 3. Alternativas consideradas

### Alternativa A: Renomear tudo (campo, tabela, rotas, DTOs) para `approvers`
- Descrição: `Room.authorizedPersons` → `Room.approvers`; tabela `room_authorized_persons` → `room_approvers` (migration de rename, sem perda de dados); rotas `/core/room/:id/authorized-persons` e `/remove-authorized-persons` → `/approvers` e `/remove-approvers`; DTOs e use cases renomeados; campo `authorizedPersons`/`authorizedPersonsIds` em `RoomResponseDto`/`CreateRoomDto` → `approvers`/`approversIds`.
- Prós: o nome passa a descrever a regra; elimina de vez o risco de a próxima pessoa ler "authorized" e assumir "autorizado a reservar"; uma única mudança de contrato, com um só custo de migração para o front.
- Contras: quebra contrato com o front nas 3 rotas e nos campos da sala; toca ~25 arquivos (lista na seção 5).

### Alternativa B: Manter os nomes e documentar a semântica
- Descrição: não renomear nada; registrar em docs/comentários que `authorizedPersons` significa "aprovadores".
- Prós: zero quebra de contrato; zero migration.
- Contras: perpetua o erro que motivou este RFC; a dívida de nomenclatura só cresce à medida que o CASL e o módulo de agendamento passam a depender dela; qualquer pessoa nova (ou IA) vai ler `authorizedPersons` e inferir a semântica antiga.

### Alternativa C: Renomear internamente (código e tabela) e manter as rotas antigas como alias deprecado por uma janela
- Descrição: como a Alternativa A no back, mas `/authorized-persons` e `/remove-authorized-persons` continuam respondendo (mesmo use case) por um período, com o campo antigo ainda serializado na resposta da sala.
- Prós: o front migra sem prazo apertado; sem quebra imediata.
- Contras: dois nomes para a mesma coisa durante a transição; risco de o alias ficar para sempre; exige decisão sobre por quanto tempo manter e quem remove.

## 4. Decisão

**Alternativa A**, sem alias deprecado: o front confirmou a quebra de contrato na issue #177, então a degradação para C não é necessária. O motivo central é que o problema é de nomenclatura, então a correção só resolve o problema se o nome mudar em todas as camadas, inclusive na API. A Alternativa B não corrige nada, e a C só adia a quebra.

### 4.1 Regras de autorização resultantes (CASL)

Em `scheduleAbilities()`:

| Ação | Quem pode |
|---|---|
| `CREATE` Schedule | qualquer pessoa autenticada, em nome da própria pessoa; a barreira passa a ser só `room.allowsReservation` (verificada no use case). Só `ADMIN` e `SCHEDULE_ADMIN` solicitam em nome de outra pessoa |
| `READ` Schedule | dono (`personId`) e aprovadores da sala do agendamento |
| `UPDATE` Schedule | dono, enquanto `status = ANALYSIS`, sem alterar o status nem o dono do pedido |
| `MANAGE` Schedule (aprovar, cancelar, editar, apagar) | `ADMIN`, `SCHEDULE_ADMIN` e quem está em `room.approvers` da sala do agendamento |

A condição de aprovador é expressa em dot-notation, como já exigido pelo projeto (`'room.approvers': { $elemMatch: { id: personId } }`, ver memória do bug de condição aninhada no CASL).

Regras complementares, verificadas nos use cases:

- **Aprovador não aprova o próprio pedido.** Vale quando o `personId` ou o `userId` do agendamento é o de quem aprova. O `userId` entra porque vem do token, enquanto o `personId` vem do payload. `ADMIN` e `SCHEDULE_ADMIN` não têm essa restrição. A regra vale só para aprovar; cancelar o próprio pedido continua permitido ao aprovador da sala.
- **Sala sem aprovadores** fica só com `ADMIN` e `SCHEDULE_ADMIN`, sem comportamento extra. O risco de fila parada fica registrado na seção 7.
- **Editar e apagar entram no `MANAGE` do aprovador de propósito.** O aprovador da sala pode editar e apagar os agendamentos dela, não só aprovar e cancelar.
- **`personId` do payload é validado contra o token** na criação. Na edição, só `ADMIN` e `SCHEDULE_ADMIN` trocam `personId` ou `userId`.
- **O status só muda por aprovar ou cancelar.** `PATCH /schedule/:id` recusa um `status` diferente do atual, inclusive para admin, porque aprovar por esse caminho não gera os agendamentos filhos.

### 4.2 Consequências técnicas obrigatórias desta decisão

Duas dependências surgem diretamente das regras acima e precisam entrar na implementação:

1. **Checagem em nível de classe deixa de servir.** `FindSchedulesByStatusUseCase` e `ListSchedulesUseCase` fazem `ability.can(Action.MANAGE, Schedule)` sem instância. Em CASL, esse tipo de checagem ignora as condições da regra. Com a regra condicional de aprovador presente para todo autenticado, ela passaria a retornar `true` para qualquer pessoa. O mesmo vale para `FindSchedulesByPersonIdUseCase` quando a pessoa consulta agendamentos de outra. As três rotas trocam a checagem de classe por um filtro na query: admin vê tudo, aprovador vê só as salas em que está na lista e os demais recebem **lista vazia** (decidido na issue #177). As salas do aprovador vêm de uma consulta na tabela de junção, e o repositório de agendamento recebe esses `roomIds`.
2. **`room.approvers` precisa estar carregada** nos pontos que checam `MANAGE` por instância. Hoje `TypeormScheduleRepository.findById` faz `findOne` sem relations, então `room` chega `undefined` em `ApproveScheduleUseCase` e `CancelScheduleUseCase`, e a condição não teria dado para avaliar. `findById` passa a carregar a sala e, dos aprovadores, só o `id`, para não expor dados pessoais na resposta de `GET /schedule/id/:id`.

### 4.3 Mudanças de contrato nas rotas de agendamento

Além do renome das rotas de sala (seção 5), o comportamento destas rotas muda:

| Rota | Antes | Depois |
|---|---|---|
| `POST /schedule` | 403 para quem não estava na lista da sala | Qualquer autenticado solicita. 403 se o `personId` não for o do token (exceto `ADMIN`/`SCHEDULE_ADMIN`) |
| `PATCH /schedule/:id` | Aceitava trocar `status`, `personId` e `userId` | 400 para `status` diferente do atual; 403 para trocar `personId`/`userId` (exceto `ADMIN`/`SCHEDULE_ADMIN`) |
| `POST /schedule/approve` | Só `ADMIN`/`SCHEDULE_ADMIN` | Também o aprovador da sala, exceto no próprio pedido |
| `POST /schedule/cancel` | Só `ADMIN`/`SCHEDULE_ADMIN` | Também o aprovador da sala |
| `GET /schedule/analysis` | 403 para quem não era admin | Filtrada pelas salas do aprovador; lista vazia para os demais |
| `GET /schedule/admin` | 403 para quem não era admin | Filtrada pelas salas do aprovador (o filtro `roomId` é intersectado com elas); lista vazia para os demais |
| `GET /schedule/personId/:personId` | 403 ao consultar outra pessoa | Filtrada pelas salas do aprovador; lista vazia para os demais |
| `GET /schedule/id/:id` | Sem `room` na resposta | Inclui `room`, com `authorizedPersons` (depois `approvers`) contendo só o `id` de cada aprovador; o aprovador da sala também pode ler |

## 5. Precedente no projeto

Segue o padrão do RFC 0001 (relação N:N com endpoints dedicados) e o do RFC 0002 (autorização em CASL). Não há precedente de renomear uma relação já exposta na API; a decisão de como fazer isso (Alternativa A) é nova.

Arquivos que hoje carregam o nome antigo (levantados com `grep -i authorized` em `src/`, excluindo specs):

```
src/modules/core/domain/entities/room.entity.ts
src/modules/core/domain/repositories/room.repository.ts
src/modules/core/infra/repositories/typeorm/typeorm-room.repository.ts
src/modules/core/application/room/room.usecases.ts
src/modules/core/application/room/usecases/{add,remove,list}-authorized-persons/*.usecase.ts
src/modules/core/presentation/core.controllers.ts
src/modules/core/presentation/room/controllers/{add,remove,list}-authorized-persons.controller.ts
src/modules/core/presentation/room/dtos/{add,remove}-authorized-persons.dto.ts
src/modules/core/presentation/room/dtos/{create-room,room-response,manage-room-authorized-persons}.dto.ts
src/modules/core/presentation/room/room.decorators.ts
src/modules/scheduling/application/schedule/use-cases/{create,update}-schedule/*.usecase.ts
src/modules/casl/factories/casl-ability-factory.ts
src/shared/infra/typeorm/migrations/1784722551413-CreateRoomAuthorizedUsers.ts
src/shared/infra/typeorm/seeds/core/{room,room-authorized-persons,core}.seeder.ts
```

Rotas afetadas (`src/modules/core/presentation/room/controllers/`):

```
POST /core/room/:id/authorized-persons         → POST /core/room/:id/approvers
POST /core/room/:id/remove-authorized-persons  → POST /core/room/:id/remove-approvers
GET  /core/room/:id/authorized-persons         → GET  /core/room/:id/approvers
```

A rota de remoção continua com a inconsistência de verbo já registrada no RFC 0001 (seção 7); este RFC não a corrige.

## 6. Consequências

### 6.1 Positivas

- O nome do campo passa a descrever a regra de negócio.
- Quem aprova passa a ser configurável por sala, sem depender de um papel global.
- A regra de criação fica mais simples: sai a checagem de lista no fluxo de solicitação, e `CreateScheduleUseCase` perde a dependência de `authorizedPersons`.
- Todas as regras novas ficam declaradas no `CaslAbilityFactory`, conforme o RFC 0002.

### 6.2 Negativas / trade-offs aceitos

- Quebra de contrato com o front nas 3 rotas e nos campos `authorizedPersons`/`authorizedPersonsIds`.
- Mudança de **semântica** dos dados existentes: as pessoas que hoje estão em `room_authorized_persons` passam a ser aprovadores sem que ninguém tenha decidido isso caso a caso. Ver riscos.
- Mudança de comportamento em rotas de agendamento, além do renome (seção 4.3).
- O papel `SCHEDULE_RESPONSIBLE` (criado em `CreateScheduleRoles1781029787751`) deixa de ser necessário e é removido (issue #121). `SCHEDULE_COORDINATOR` continua existindo, sem uso.
- Os dados de `room_authorized_persons` são descartados na migration (seção 7), e os aprovadores precisam ser recadastrados manualmente.

## 7. Riscos e perguntas em aberto

### 7.1 Decisões fechadas na issue #177

| Pergunta | Decisão |
|---|---|
| O aprovador pode aprovar o próprio agendamento? | Não. `ADMIN` e `SCHEDULE_ADMIN` podem (seção 4.1) |
| Listagens para quem não é aprovador: 403 ou lista vazia? | Lista vazia (seções 4.2 e 4.3) |
| Sala sem aprovadores: só `ADMIN` e `SCHEDULE_ADMIN` aprovam? | Sim |
| Renomear rotas e campos para `approvers` ou manter alias deprecado? | Renomear, sem alias (Alternativa A) |
| Remover só `SCHEDULE_RESPONSIBLE` ou também `SCHEDULE_COORDINATOR`? | Só `SCHEDULE_RESPONSIBLE` |
| Dados existentes em `room_authorized_persons`: limpar ou migrar como aprovadores? | Limpar na migration |
| Confirmação ativa do front | Confirmada |
| O aprovador da sala também edita e apaga agendamentos dela? | Sim, pelo `MANAGE` (seção 4.1) |

A implementação foi dividida em duas entregas: a correção do comportamento (#178) e o renome para `approvers` com a remoção da role (#179).

### 7.2 Riscos que continuam

- **Recadastro dos aprovadores.** A limpeza de `room_authorized_persons` evita que quem foi cadastrado como "pode reservar" passe a aprovar sem decisão caso a caso, mas deixa todas as salas sem aprovador até o recadastro manual. Até lá, só `ADMIN`/`SCHEDULE_ADMIN` aprovam.
- **Sala sem aprovadores.** Pode gerar fila parada em salas que ninguém cadastrou. Não há alerta nem fallback além de `ADMIN`/`SCHEDULE_ADMIN`.
- **Performance:** filtrar a fila de análise por salas do aprovador acrescenta um join na tabela de junção. Não foi medido; o volume esperado é baixo.
- **Fora do escopo, mas dependente:** aprovação automática por sala (flag configurável), aprovação manual só para recorrência, atomicidade da checagem de conflito e o modelo pai/filho ficam para o RFC do ciclo de vida. Se aquele RFC mudar quem pode aprovar o quê, este pode precisar de revisão.

## 8. Escopo de aplicação futura

Vale para o módulo de agendamento e para `Room`. Como convenção geral, reforça o que o RFC 0001 já disse: o nome de uma relação deve descrever o **papel** da pessoa na entidade (aprovador, coordenador, responsável), não uma permissão genérica ("autorizado"), que esconde a regra de negócio.

---

*Este RFC segue o modelo de "lazy consensus" apenas onde o guia permite. Por quebrar contrato com o front, exige confirmação ativa de quem consome antes de ser implementado.*
