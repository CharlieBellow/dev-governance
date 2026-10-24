# Design: Avisos por email e grupos de email

| Campo | Valor |
|---|---|
| **Status** | Em design |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-10-08 |
| **Issue relacionada** | *(preencher ao abrir o PR)* |
| **RFC(s) relacionado(s)** | `docs/rfcs/0014-provider-de-email-smtp-e-fila-de-envio.md`, `docs/rfcs/0013-leitura-de-usuarios-restrita-a-admin.md`, `docs/rfcs/0005-endpoints-dedicados-coordenador-responsavel-subgrupo.md`, `docs/rfcs/0010-rota-adicionar-responsavel-subgrupo-por-email.md`, `docs/rfcs/0002-unificacao-autorizacao-casl.md` |
| **Consumidor(es)** | frontend (glpi-frontend), novas telas de avisos e de grupos de email para ADMIN |

---

## 1. Escopo

### 1.1 O que entra nesta versão

- **Grupos de email** (`/mailing-groups`), 10 endpoints:
  - CRUD: `POST`, `GET` (lista), `GET /:id`, `PATCH /:id`, `DELETE /:id`.
  - `POST /mailing-groups/preview`: prévia de critérios dinâmicos sem salvar.
  - `GET /mailing-groups/:id/members`: membros atuais (resolvidos na hora, em grupo dinâmico).
  - `POST` e `DELETE /mailing-groups/:id/members`, `POST /mailing-groups/:id/members/by-email`: só em grupo estático.
- **Avisos** (`/announcements`), 5 endpoints:
  - `GET /announcements/audience-count`: prévia de quantos destinatários um conjunto de grupos teria.
  - `POST /announcements`: cria o aviso e enfileira os emails.
  - `GET /announcements`: lista paginada.
  - `GET /announcements/:id`: detalhe com progresso de envio.
  - `POST /announcements/:id/cancel`: cancela os envios ainda pendentes.
- Público do aviso: um ou mais grupos de email.
- Membros de grupo são `Person` (com ou sem conta na plataforma).
- Corpo do aviso em texto puro (quebras de linha preservadas).

Todas as rotas exigem Bearer token e role ADMIN (`@Subject(MailingGroup)` / `@Subject(Announcement)`; não-ADMIN recebe `403`, como nas rotas de `User` da RFC 0013).

### 1.2 O que NÃO entra (fora de escopo por decisão, não por esquecimento)

- Grupo híbrido (dinâmico com inclusões/exclusões manuais). RFC 0014 §3.4.
- Critérios com AND/OR aninhados. Só o formato fixo da RFC 0014 §4.9.
- Uso do `secondaryEmail`. RFC 0014 §7.
- Converter grupo estático em dinâmico ou vice-versa.
- Editor rico (HTML/Markdown) no corpo do aviso. RFC 0014 §7.
- Anexos e agendamento de aviso.
- Link de descadastro no email.
- Lista de destinatários individuais de um aviso com status por pessoa. Só contagens nesta versão.
- Edição de aviso já criado. Para corrigir, cancela e cria outro.

## 2. Contrato da API: grupos de email

### Objetos comuns

**`criteria`** (só em grupo `DYNAMIC`):
```json
{
  "linkTypes": ["Técnico Administrativo"],
  "unities": ["Arapiraca"],
  "departmentIds": ["uuid"],
  "courseIds": ["uuid"],
  "employeeRoleIds": ["uuid"],
  "functionalLevelIds": ["uuid"],
  "userRoles": ["SERVICEBOOK_RESPONSIBLE"],
  "personStatuses": ["Ativo", "Férias"]
}
```

- Todos os campos são opcionais, mas pelo menos um campo além de `personStatuses` é obrigatório.
- Valores de `linkTypes`, `unities`, `userRoles` e `personStatuses` são os valores dos enums `LinkType`, `EducationalUnity`, `UserRole` e `PersonStatus`.
- Lista dentro do campo = OR; campos diferentes = AND.
- Critérios de vínculo casam no mesmo vínculo, e só vínculos vigentes contam.
- `personStatuses` omitido usa o padrão da RFC 0014 §4.9 (`Ativo`, `Férias`, afastamentos, licenças e cessão).

**Membro** (na listagem de membros e na prévia):
```json
{
  "personId": "uuid",
  "name": "string (nome social, se houver)",
  "email": "string | null",
  "reachable": true,
  "unreachableReason": "NO_EMAIL | MAIL_DISABLED | null"
}
```

`reachable` é `false` quando a pessoa não tem email (`NO_EMAIL`) ou tem `isActiveMail = false` (`MAIL_DISABLED`). Pessoas não alcançáveis aparecem na lista, mas não recebem avisos.

**Contagem** (em detalhe, listagem e prévia):
```json
{ "members": 120, "recipients": 112 }
```

`members` conta todos; `recipients` só os alcançáveis.

### `POST /mailing-groups`

**Descrição:** cria um grupo.

**Request:**
```json
{
  "name": "string — obrigatório, 1 a 100 caracteres, único",
  "description": "string — opcional, até 500 caracteres",
  "type": "STATIC | DYNAMIC — obrigatório",
  "criteria": "objeto criteria — obrigatório quando type=DYNAMIC, proibido quando type=STATIC",
  "personIds": ["uuid — opcional, só quando type=STATIC; membros iniciais"]
}
```

**Resposta (sucesso, 201):** o mesmo corpo de `GET /mailing-groups/:id`.

**Respostas de erro relevantes:**
| Status | Quando ocorre |
|---|---|
| 400 | validação; `criteria` ausente em `DYNAMIC` ou presente em `STATIC`; `criteria` só com `personStatuses`; valor de enum inválido |
| 404 | algum id de `departmentIds`/`courseIds`/`employeeRoleIds`/`functionalLevelIds`/`personIds` não existe |
| 409 | já existe grupo com o mesmo `name` |

### `GET /mailing-groups`

**Request (query):** `ListPaginatedRequestDTO` (`filter` sobre `name`, `skip`, `take` até 20), mais `type=STATIC|DYNAMIC` opcional.

**Resposta (sucesso, 200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Técnicos administrativos - Arapiraca",
      "description": "string | null",
      "type": "DYNAMIC",
      "count": { "members": 120, "recipients": 112 },
      "createdBy": "Nome do admin",
      "updatedAt": "2026-10-08T14:00:00.000Z"
    }
  ],
  "count": 7
}
```

### `GET /mailing-groups/:id`

**Resposta (sucesso, 200):**
```json
{
  "id": "uuid",
  "name": "Técnicos administrativos - Arapiraca",
  "description": "string | null",
  "type": "DYNAMIC",
  "criteria": { "linkTypes": ["Técnico Administrativo"], "unities": ["Arapiraca"] },
  "count": { "members": 120, "recipients": 112 },
  "createdBy": "Nome do admin",
  "createdAt": "2026-10-08T14:00:00.000Z",
  "updatedAt": "2026-10-08T14:00:00.000Z"
}
```

`criteria` é `null` em grupo `STATIC`. Em `DYNAMIC`, `personStatuses` vem preenchido com o valor efetivo (o padrão, se foi omitido na criação).

| Status | Quando ocorre |
|---|---|
| 404 | grupo não existe |

### `PATCH /mailing-groups/:id`

**Request:** `name`, `description` e, só em `DYNAMIC`, `criteria` (substitui os critérios inteiros). `type` e membros não são aceitos aqui.

**Resposta (sucesso, 200):** igual a `GET /mailing-groups/:id`.

| Status | Quando ocorre |
|---|---|
| 400 | `type` enviado; `criteria` enviado em grupo `STATIC`; mesmas validações do `POST` |
| 404 | grupo ou id referenciado não existe |
| 409 | `name` já usado por outro grupo |

### `DELETE /mailing-groups/:id`

**Resposta (sucesso, 204).** Avisos já criados com esse grupo não mudam (guardam cópia do nome e do tipo).

| Status | Quando ocorre |
|---|---|
| 404 | grupo não existe |

### `POST /mailing-groups/preview`

**Descrição:** resolve critérios dinâmicos sem salvar o grupo, para a tela mostrar o resultado enquanto o admin monta o filtro.

**Request:**
```json
{ "criteria": "objeto criteria — obrigatório" }
```

**Resposta (sucesso, 200):**
```json
{
  "count": { "members": 120, "recipients": 112 },
  "sample": ["até 10 objetos Membro"]
}
```

| Status | Quando ocorre |
|---|---|
| 400 | mesmas validações de `criteria` do `POST` |
| 404 | id referenciado não existe |

### `GET /mailing-groups/:id/members`

**Descrição:** membros atuais. Em grupo `DYNAMIC`, resolvidos na hora a partir dos vínculos.

**Request (query):** `ListPaginatedRequestDTO` (`filter` sobre nome/email, `skip`, `take` até 20), mais `reachable=true|false` opcional.

**Resposta (sucesso, 200):**
```json
{ "data": ["objetos Membro"], "count": 120 }
```

| Status | Quando ocorre |
|---|---|
| 404 | grupo não existe |

### `POST /mailing-groups/:id/members`

**Descrição:** adiciona pessoas a um grupo estático. Delta (append), mesmo padrão de `POST servicebook/subgroup/:id/coordinators` (design 0001).

**Request:**
```json
{ "personIds": ["uuid — obrigatório, um ou mais ids de Person"] }
```

**Resposta (sucesso, 200):** igual a `GET /mailing-groups/:id` (com `count` atualizado).

| Status | Quando ocorre |
|---|---|
| 404 | grupo não existe, ou algum `personId` não existe |
| 409 | grupo é `DYNAMIC` |

**Regras:** id duplicado ou já membro é ignorado, sem erro (idempotente). Pessoa sem email ou com `isActiveMail = false` pode ser adicionada; aparece como não alcançável.

### `POST /mailing-groups/:id/members/by-email`

**Descrição:** adiciona uma pessoa a um grupo estático pelo email de cadastro (`Person.email`), mesmo padrão da RFC 0010.

**Request:**
```json
{ "email": "string — obrigatório, formato de email válido" }
```

**Resposta (sucesso, 200):** igual a `POST .../members`.

| Status | Quando ocorre |
|---|---|
| 404 | grupo não existe, ou nenhuma `Person` com esse email |
| 409 | grupo é `DYNAMIC` |

### `DELETE /mailing-groups/:id/members`

**Descrição:** remove pessoas de um grupo estático. Mesmo caminho do `POST`; o verbo diferencia (RFC 0005 §4).

**Request:**
```json
{ "personIds": ["uuid — obrigatório, um ou mais ids de Person"] }
```

O corpo vai num `DELETE`; o client HTTP do front precisa enviar body nesse verbo, como já acontece nas rotas do design 0001.

**Resposta (sucesso, 200):** igual a `POST .../members`.

| Status | Quando ocorre |
|---|---|
| 404 | grupo não existe |
| 409 | grupo é `DYNAMIC` |

**Regras:** remover quem não é membro é ignorado, sem erro.

## 3. Contrato da API: avisos

### `GET /announcements/audience-count`

**Descrição:** quantos destinatários únicos a união dos grupos teria agora, e a cota de envio disponível. Serve para a tela mostrar "Este aviso será enviado para 843 pessoas" antes do admin confirmar.

**Request (query):**
```
groupIds=uuid1,uuid2   — obrigatório, um ou mais ids de grupo separados por vírgula
```

**Resposta (sucesso, 200):**
```json
{
  "recipients": 843,
  "dailyBudgetRemaining": 1650
}
```

`recipients` já está deduplicado por email entre os grupos e só conta pessoas alcançáveis. `dailyBudgetRemaining` é a cota disponível para avisos nas próximas 24h (já descontada a reserva transacional). Se `recipients > dailyBudgetRemaining`, o front deve avisar que o envio passará para o dia seguinte.

| Status | Quando ocorre |
|---|---|
| 400 | `groupIds` ausente ou vazio |
| 404 | algum grupo não existe |

### `POST /announcements`

**Descrição:** cria o aviso, resolve os destinatários de todos os grupos naquele momento e enfileira um email por destinatário. O envio acontece em segundo plano.

**Request:**
```json
{
  "subject": "string — obrigatório, 1 a 150 caracteres",
  "body": "string — obrigatório, 1 a 20000 caracteres, texto puro; quebras de linha preservadas",
  "groupIds": ["uuid — obrigatório, um ou mais ids de grupo"]
}
```

**Resposta (sucesso, 202 Accepted):**
```json
{
  "id": "uuid",
  "status": "QUEUED",
  "totalRecipients": 843,
  "createdAt": "2026-10-08T14:00:00.000Z"
}
```

| Status | Quando ocorre |
|---|---|
| 400 | validação de campos |
| 404 | algum grupo não existe |
| 422 | os grupos resolvem para 0 destinatários alcançáveis |

**Regras de negócio aplicadas nesta rota:**
- Destinatários são os membros alcançáveis dos grupos no momento da criação (snapshot). Quem entrar num grupo depois não recebe esse aviso.
- Emails são deduplicados (`lower(trim(email))`) entre todos os grupos. Quem está em dois grupos recebe uma vez.
- Aviso e emails enfileirados são gravados na mesma transação: ou tudo, ou nada.
- O `body` é escapado. HTML digitado aparece como texto no email.

### `GET /announcements`

**Request (query):** `ListPaginatedRequestDTO` padrão (`filter` sobre `subject`, `skip`, `take` até 20). Ordenado do mais recente para o mais antigo.

**Resposta (sucesso, 200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "subject": "Manutenção na rede dia 10/10",
      "status": "SENDING",
      "audience": [
        { "id": "uuid", "name": "Técnicos administrativos - Arapiraca", "type": "DYNAMIC" }
      ],
      "totalRecipients": 843,
      "createdBy": "Nome do admin",
      "createdAt": "2026-10-08T14:00:00.000Z"
    }
  ],
  "count": 12
}
```

`audience` é a cópia dos grupos no momento do envio: o nome continua aparecendo mesmo se o grupo for renomeado ou apagado. `createdBy` é só o nome, seguindo o padrão de campos relacionados enxutos do projeto.

### `GET /announcements/:id`

**Descrição:** detalhe do aviso com o progresso do envio. A tela pode consultar periodicamente enquanto o status for `QUEUED` ou `SENDING`.

**Resposta (sucesso, 200):**
```json
{
  "id": "uuid",
  "subject": "Manutenção na rede dia 10/10",
  "body": "texto do aviso",
  "status": "SENDING",
  "audience": [
    { "id": "uuid", "name": "Técnicos administrativos - Arapiraca", "type": "DYNAMIC" }
  ],
  "createdBy": "Nome do admin",
  "createdAt": "2026-10-08T14:00:00.000Z",
  "canceledAt": null,
  "delivery": {
    "total": 843,
    "pending": 500,
    "sent": 340,
    "failed": 3,
    "canceled": 0
  }
}
```

| Status | Quando ocorre |
|---|---|
| 404 | aviso não existe |

**Status do aviso (derivado das linhas de envio):**
| Status | Significado |
|---|---|
| `QUEUED` | nenhum email enviado ainda |
| `SENDING` | parte enviada, parte pendente |
| `COMPLETED` | todos enviados com sucesso |
| `COMPLETED_WITH_FAILURES` | nada pendente, mas houve falhas permanentes |
| `CANCELED` | cancelado pelo admin (pode ter enviado parte antes) |

### `POST /announcements/:id/cancel`

**Descrição:** cancela os emails ainda pendentes. Os já enviados não são desfeitos.

**Request:** sem body.

**Resposta (sucesso, 200):** o mesmo corpo de `GET /announcements/:id`, já com `status: "CANCELED"`.

| Status | Quando ocorre |
|---|---|
| 404 | aviso não existe |
| 409 | aviso já está `COMPLETED`, `COMPLETED_WITH_FAILURES` ou `CANCELED` |

## 4. Modelo de dados

Tabelas novas (detalhes em RFC 0014 §4.3, §4.4 e §4.9):

- `mailing_groups`: `id`, `name` (único), `description`, `type`, `criteria` (jsonb), `created_by` (FK `users`), `created_at`, `updated_at`.
- `mailing_group_members`: `group_id`, `person_id` (FK `person`, `ON DELETE CASCADE`), `added_at`.
- `announcements`: `id`, `subject`, `body`, `audience` (jsonb, cópia dos grupos), `created_by` (FK `users`), `total_recipients`, `canceled_at`, `created_at`.
- `mail_messages`: registro de status de todos os emails do sistema (o agendamento fica numa fila BullMQ no Redis, RFC 0014 §4.3); `announcement_id` e `person_id` (FKs nullable) ligam cada email ao aviso e à pessoa.

Nenhuma entidade existente muda. A correção do `isActiveMail` em `create-person.usecase.ts` (RFC 0014 §7) não muda o contrato de `POST /core/person`, só passa a respeitar o `false` enviado.

## 5. Pendências do lado do consumidor (frontend)

**Grupos:**
- [ ] Tela de listagem de grupos (`GET /mailing-groups`), com filtro por tipo.
- [ ] Formulário de grupo dinâmico: selects para tipo de vínculo, unidade, departamento, curso, cargo, nível funcional, role e status (com o padrão já marcado). Departamentos, cursos, cargos e níveis vêm das rotas de listagem que já existem em `core`, `academic` e `humanresources`.
- [ ] Prévia ao vivo (`POST /mailing-groups/preview`) enquanto o admin ajusta os critérios.
- [ ] Formulário de grupo estático: busca de pessoa para adicionar (por nome, nas rotas de pessoa existentes, ou por email via `.../members/by-email`), e remoção.
- [ ] Listagem de membros (`GET .../members`) destacando os não alcançáveis e o motivo.
- [ ] Não oferecer adicionar/remover membros em grupo dinâmico.

**Avisos:**
- [ ] Tela de listagem de avisos (`GET /announcements`).
- [ ] Formulário de novo aviso: assunto, corpo (textarea), seleção de um ou mais grupos.
- [ ] Antes de confirmar, chamar `GET /announcements/audience-count` e mostrar o número de destinatários; se passar de `dailyBudgetRemaining`, avisar que o envio continua no dia seguinte.
- [ ] Após criar, tratar `202` como "envio iniciado", não "enviado".
- [ ] Tela de detalhe com barra de progresso (`delivery`), atualizando periodicamente enquanto `QUEUED`/`SENDING`.
- [ ] Botão de cancelar com confirmação, desabilitado quando o status for final.
- [ ] Confirmar se texto puro atende ou se é necessário editor rico (RFC 0014 §7).

## 6. Casos de borda considerados

**Grupos:**
- **Pessoa muda de vínculo:** sai do grupo dinâmico antigo e entra no novo na próxima resolução, sem ação de ninguém.
- **Vínculo encerrado (`endDate` no passado):** a pessoa deixa de casar com os critérios de vínculo daquele vínculo.
- **Pessoa com dois vínculos** (ex.: técnico e discente): entra nos grupos dos dois; num aviso para os dois grupos, recebe uma vez.
- **Critério que casa em vínculos diferentes** (ex.: `linkTypes: [Docente]` e `departmentIds: [X]`, sendo a pessoa docente em Y e técnica em X): não entra, porque os critérios de vínculo precisam casar no mesmo vínculo.
- **Pessoa sem email ou com `isActiveMail = false`:** aparece como membro, não recebe.
- **Departamento/curso/cargo usado no critério é apagado:** o grupo continua válido; aquele valor só deixa de casar com alguém.
- **Pessoa apagada:** sai do grupo estático (cascade) e naturalmente do dinâmico.
- **Grupo apagado depois de usado:** avisos antigos continuam mostrando o nome do grupo.
- **Grupo renomeado:** avisos antigos mostram o nome antigo (cópia do momento do envio).

**Avisos:**
- **Grupo muda entre a prévia e a confirmação:** o aviso usa os membros no momento do `POST`; `totalRecipients` na resposta é o número real.
- **Aviso maior que a cota diária:** aceito normalmente; o worker envia até a cota e continua quando a janela de 24h libera espaço. O progresso fica visível no detalhe.
- **Reset de senha durante um aviso grande:** emails transacionais têm prioridade e cota reservada (RFC 0014 §4.3), então não ficam atrás do aviso.
- **Dois avisos ao mesmo tempo:** saem intercalados por ordem de criação, dentro da mesma cota.
- **Email inválido na base:** falha permanente só daquela linha; aparece em `delivery.failed`.
- **Conta Gmail bloqueada por limite ou credencial:** a fila pausa e os emails ficam `pending`. O aviso fica em `SENDING` sem progresso; o front não tem como distinguir isso de lentidão nesta versão (ver §7).
- **Cancelar enquanto o worker está enviando:** emails que o worker já está enviando naquele instante terminam o envio; o restante é cancelado. O número de `canceled` pode ser um pouco menor que o `pending` visto antes do clique.
- **Grupos sem nenhum destinatário alcançável:** `422`, nenhum aviso criado.

## 7. Fora de escopo / trabalho futuro

- Grupo híbrido (`includedPersonIds`/`excludedPersonIds` em grupo dinâmico).
- Indicar no detalhe do aviso que o envio está pausado por quota ou credencial (hoje só aparece nos logs).
- Status de entrega por destinatário (quem recebeu e quem falhou) e reenviar só para quem falhou.
- Agendamento, anexos, editor rico e link de descadastro, dependentes das perguntas em aberto da RFC 0014 §7.
- Gestão de grupos por roles além de ADMIN.
