# Design: Endpoints dedicados de coordenador/responsável de subgrupo

| Campo | Valor |
|---|---|
| **Status** | Pronto |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-08-28 |
| **Issue relacionada** | RFC 0004 (reconciliação `master`↔`dev`) — sub-issue 7 |
| **RFC(s) relacionado(s)** | `docs/rfcs/0005-endpoints-dedicados-coordenador-responsavel-subgrupo.md`, `docs/rfcs/0001-endpoints-dedicados-pessoas-autorizadas-sala.md` |
| **Consumidor(es)** | frontend (glpi-frontend, tela de gestão de subgrupo do Service Book) |

---

## 1. Escopo

### 1.1 O que entra nesta versão

- 4 endpoints novos (2 caminhos, 2 verbos cada): `POST`/`DELETE` em `subgroup/:id/coordinators` e em `subgroup/:id/responsibles` — adicionar/remover coordenador e responsável de `ServiceSubGroup`.
- Auto-concessão de role (`SERVICEBOOK_COORDINATOR`/`SERVICEBOOK_RESPONSIBLE`) ao adicionar, quando a pessoa ainda não tem.
- Revogação automática da role ao remover, quando a pessoa deixa de coordenar/ser responsável por qualquer subgrupo (não só o subgrupo da chamada atual).
- `PATCH subgroup/:id` deixa de aceitar `coordinatorsIds`/`responsiblesIds`/`coordinators`/`responsibles` — passa a validar só campos escalares (`description`, `serviceGroupId`, `itilCategoryId`).
- Nova relation `user`/`user.roles` em `Person.findById`.
- Novo DTO de resposta (`ServiceSubGroupResponseDto` ou equivalente) que serializa `coordinators`/`responsibles` via `PersonSummaryDto`, não a entidade `Person` crua.

### 1.2 O que NÃO entra (fora de escopo por decisão, não por esquecimento)

- Unificação dos dois enums `UserRole` duplicados (`accounts`/`casl`).
- `@CheckPolicies` específico por rota (usa o guard CASL padrão via `@Subject`, mesma limitação que `Room` já tem).
- Migração do `PATCH` de `service-order` (`responsiblesIds`) — outro dos três casos citados na RFC 0001 §7, não este.
- Alinhar `Room.addAuthorizedPersons`/`removeAuthorizedPersons` (RFC 0001) ao verbo `DELETE` — fica como débito técnico registrado (RFC 0005, seção 8), não corrigido por este design.

## 2. Contrato da API

### `POST servicebook/subgroup/:id/coordinators`

**Descrição:** adiciona uma ou mais pessoas à lista de coordenadores do subgrupo. Operação de delta (append), não substituição.

**Request:**
```json
{
  "personIds": ["uuid — obrigatório, um ou mais ids de Person"]
}
```

**Resposta (sucesso, 200):**
```json
{
  "id": "uuid do subgrupo",
  "description": "string",
  "coordinators": [
    { "id": "uuid", "name": "string (nome social, se houver)" }
  ],
  "responsibles": [
    { "id": "uuid", "name": "string (nome social, se houver)" }
  ]
}
```

**Respostas de erro relevantes:**
| Status | Quando ocorre |
|---|---|
| 404 | Subgrupo não encontrado |
| 404 | Algum `personId` não existe (`PersonRepository.checkPersonsExist`) |
| 403 | Usuário sem role `ADMIN`/`SERVICEBOOK_ADMIN` |

**Regras de negócio aplicadas nesta rota:**
- Ids duplicados ou já presentes na lista: idempotente, sem erro nem duplicação — confirmado empiricamente contra o banco (mesmo mecanismo de `Room.addAuthorizedPersons`, TypeORM resolve pela chave composta da tabela de junção).
- Para cada pessoa adicionada: se o `User` vinculado não tem a role `SERVICEBOOK_COORDINATOR`, concede automaticamente.

---

### `DELETE servicebook/subgroup/:id/coordinators`

**Descrição:** remove uma ou mais pessoas da lista de coordenadores do subgrupo. Mesmo caminho de `POST .../coordinators` — o verbo é que diferencia add de remove (não uma rota `/remove-coordinators` separada; ver RFC 0005, seção 4, sobre a divergência deliberada do verbo usado em `Room`, RFC 0001).

**Request:**
```json
{
  "personIds": ["uuid — obrigatório, um ou mais ids de Person"]
}
```
*(corpo em requisição `DELETE` — suportado pelo Nest/Express via `@Body()`; frontend precisa garantir que o client HTTP usado envia corpo em `DELETE`, nem todo client faz isso por padrão.)*

**Resposta (sucesso, 200):** igual à de `POST .../coordinators`.

**Respostas de erro relevantes:**
| Status | Quando ocorre |
|---|---|
| 404 | Subgrupo não encontrado |
| 403 | Usuário sem role `ADMIN`/`SERVICEBOOK_ADMIN` |

**Regras de negócio aplicadas nesta rota:**
- Remover um id que não está na lista: idempotente, não gera erro.
- Para cada pessoa removida: verifica se ela ainda coordena algum **outro** subgrupo (`ServiceSubgroupRepository`, consulta por `personId` nos `coordinators` de qualquer subgrupo diferente deste). Se não coordenar nenhum, revoga `SERVICEBOOK_COORDINATOR` do `User` vinculado. Checagem independente da role `SERVICEBOOK_RESPONSIBLE` (uma pessoa pode ser responsável em outro subgrupo e manter essa role normalmente).

---

### `POST servicebook/subgroup/:id/responsibles`

Mesmo contrato de `POST .../coordinators`, aplicado a `responsibles`/role `SERVICEBOOK_RESPONSIBLE`.

---

### `DELETE servicebook/subgroup/:id/responsibles`

Mesmo contrato de `DELETE .../coordinators`, aplicado a `responsibles`/role `SERVICEBOOK_RESPONSIBLE`.

---

### `PATCH servicebook/subgroup/:id` (alterado — breaking change)

**Descrição:** passa a aceitar só campos escalares do subgrupo. `coordinatorsIds`/`responsiblesIds`/`coordinators`/`responsibles` **removidos do DTO** — enviar esses campos passa a ser ignorado ou rejeitado pelo `ValidationPipe` (`forbidNonWhitelisted`, a confirmar comportamento atual do pipe global antes de decidir se rejeita ou ignora).

**Request:**
```json
{
  "description": "string — opcional",
  "serviceGroupId": "uuid — opcional",
  "itilCategoryId": "number — opcional"
}
```

## 3. Modelo de dados

- Nenhuma entidade nova, nenhuma migration de schema — `coordinators`/`responsibles` já existem como `ManyToMany` em `ServiceSubGroup`.
- `Person.findById` (`typeorm-person.repository.ts`) ganha as relations `user`, `user.roles` no array de `relations` já existente.
- Novo DTO `ServiceSubGroupResponseDto` (nome a confirmar na implementação), construído a partir da entidade, mapeando `coordinators`/`responsibles` via `new PersonSummaryDto(person)` — nunca a entidade `Person` crua (ver RFC 0005, seção 2, sobre o risco de reexpor `socialName`).
- `ServiceSubgroupRepository` ganha um método de consulta pra revogação — algo como `existsByCoordinatorId(personId, excludingSubGroupId)`/`existsByResponsibleId(personId, excludingSubGroupId)` — usado só pelos usecases de `remove`, pra checar se a pessoa ainda coordena/é responsável de outro subgrupo antes de revogar a role.

## 4. Casos de borda considerados

- **Corpo em requisição `DELETE`:** HTTP não proíbe corpo em `DELETE`, e Nest/Express aceitam via `@Body()`, mas alguns proxies/gateways/clients HTTP descartam o corpo por padrão nesse verbo. Se isso for um problema real na integração com o front, a alternativa é `personIds` via query string (`?personIds=uuid1,uuid2`) em vez de corpo — decisão a confirmar durante a implementação, testando o client HTTP real do front.
- **Pessoa sem `User` vinculado:** se `person.user` for `null` (Person existe mas nunca teve conta criada), a auto-concessão de role não tem o que fazer — decisão: pular a concessão silenciosamente, ou bloquear a adição como coordenador com erro explícito? **Não decidido neste design, fica para a implementação levantar com quem revisar.**
- **Remover o único responsável/coordenador restante:** lista fica vazia — permitido, sem validação de "subgrupo precisa ter pelo menos um coordenador". Se isso for um requisito de negócio real, é decisão fora do escopo deste design (não foi levantado como requisito até agora).

## 5. Fora de escopo / trabalho futuro

- Cascata pra Service Orders abertas (atribuir/remover responsável nas SOs quando o vínculo de subgrupo muda) — isso é a sub-issue 2 da RFC 0004 (cascata Service Book), tema relacionado mas não coberto por este design.
