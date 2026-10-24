# Design: Rota de adicionar responsible de subgrupo por email

| Campo | Valor |
|---|---|
| **Status** | Em design |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-09-18 |
| **Issue relacionada** | Relatada na #119 (validação pós-merge dev/master); número da issue desta feature específica não informado — preencher ao abrir o PR |
| **RFC(s) relacionado(s)** | `docs/rfcs/0010-rota-adicionar-responsavel-subgrupo-por-email.md`, `docs/rfcs/0005-endpoints-dedicados-coordenador-responsavel-subgrupo.md`, `docs/rfcs/0001-endpoints-dedicados-pessoas-autorizadas-sala.md` |
| **Consumidor(es)** | frontend (glpi-frontend, tela "Funcionários" — `/responsibles`) |

---

## 1. Escopo

### 1.1 O que entra nesta versão

- 1 endpoint novo: `POST servicebook/subgroup/:id/responsibles/by-email`.
- Novo método `PersonRepository.findByEmail(email)`, consultando só a coluna `Person.email`.
- Novo usecase `AddResponsibleByEmailUseCase`, que resolve o `personId` e delega para `AddResponsiblesUseCase` já existente (mesma concessão de role, cascata para Service Orders, idempotência).

### 1.2 O que NÃO entra (fora de escopo por decisão, não por esquecimento)

- Busca por `Person.secondaryEmail` (RFC 0010 §3, Alternativa B rejeitada).
- Mesma rota para `coordinators` — confirmado que o front não tem esse problema nesse fluxo hoje.
- Criação automática de conta (`User`) quando a `Person` resolvida não tiver conta vinculada — melhoria futura (RFC 0010 §8).
- Atributo `hasAccount`/equivalente em `PersonSummaryDto`/`PersonResponseDto` — melhoria futura, candidata a RFC própria (RFC 0010 §8).
- Qualquer alteração em `POST subgroup/:id/responsibles` (rota com `personIds`) — permanece exatamente como está.

## 2. Contrato da API

### `POST servicebook/subgroup/:id/responsibles/by-email`

**Descrição:** adiciona uma pessoa como responsible do subgrupo, resolvendo a `Person` pelo email de cadastro (`Person.email`) em vez de exigir o `personId` diretamente. Operação de delta (append), mesmo comportamento de negócio de `POST .../responsibles` a partir do momento em que o `personId` é resolvido.

**Request:**
```json
{
  "email": "string — obrigatório, formato de email válido"
}
```

**Resposta (sucesso, 200):**
```json
{
  "id": "uuid do subgrupo",
  "description": "string",
  "coordinators": [
    { "id": "uuid", "name": "string" }
  ],
  "responsibles": [
    { "id": "uuid", "name": "string" }
  ]
}
```
*(Proposto: mesmo formato de `POST .../responsibles`, `ServiceSubGroupResponseDto`. O `personId` da pessoa recém-adicionada fica disponível em `responsibles[].id` — satisfaz o pedido da issue original de "retornar o personId" sem precisar de um formato de resposta diferente das rotas irmãs. Sujeito a confirmação de quem revisar — ver RFC 0010 §7.)*

**Respostas de erro relevantes:**
| Status | Quando ocorre |
|---|---|
| 404 | Subgrupo não encontrado |
| 404 | Nenhuma `Person` encontrada com esse `email` |
| 400 | `email` ausente ou em formato inválido (`class-validator`) |
| 403 | Usuário sem role `ADMIN`/`SERVICEBOOK_ADMIN` |

**Regras de negócio aplicadas nesta rota:**
- Resolve exclusivamente contra `Person.email` — `Person.secondaryEmail` não é considerado.
- Depois de resolvido o `personId`, delega para a mesma lógica de `POST .../responsibles`: concessão automática da role `SERVICEBOOK_RESPONSIBLE` (se a `Person` tiver `User` vinculado sem a role), cascata para as Service Orders abertas do subgrupo, idempotência se a pessoa já for responsible.
- Se a `Person` resolvida não tiver `User` vinculado, é adicionada normalmente, sem a role concedida — sem bloqueio (comportamento herdado de `AddResponsiblesUseCase`, não modificado por esta rota).
- Duas `Person` diferentes com o mesmo `Person.email` (sem constraint de unicidade no banco): comportamento não tratado explicitamente nesta versão — ver riscos, RFC 0010 §7.

## 3. Modelo de dados

- `PersonRepository` (`src/modules/core/domain/repositories/person.repository.ts`) ganha o método abstrato:
  ```ts
  abstract findByEmail(email: string): Promise<Person | null>;
  ```
  Implementado em `typeorm-person.repository.ts` via `this.repository.findOne({ where: { email } })`.
- Nenhuma entidade nova, nenhuma migration.


## 4. Casos de borda considerados

- **`Person` sem `User` vinculado:** adiciona sem conceder a role, sem bloquear — mesmo comportamento já existente na rota `personIds`.
- **Email não encontrado:** `404`.
- **`Person` já é responsible do subgrupo (duplicata):** idempotente, mesmo mecanismo da rota `personIds` (TypeORM resolve pela chave composta da tabela de junção).
- **Duas `Person` com o mesmo `Person.email`:** não tratado explicitamente — risco aberto, registrado na RFC 0010 §7, não bloqueante para esta entrega dado que é um cenário de dado raro e não confirmado como existente na base atual.
- **`coordinators`:** fora de escopo — confirmado que o front não reproduz esse problema nesse fluxo hoje.

## 5. Fora de escopo / trabalho futuro

- Criação automática de conta (`User`) quando a `Person` resolvida por email não tiver conta — registrado a pedido explícito durante a análise desta RFC, candidato a RFC própria depois que este fluxo estiver estável em produção.
- Atributo derivado tipo `hasAccount` em `PersonSummaryDto`/`PersonResponseDto`, permitindo ao front sinalizar em qualquer tela quais pessoas não têm conta no sistema — ideia levantada durante a análise, candidata a RFC leve própria, não amarrada a esta entrega.
- Extensão desta mesma rota para `coordinators` — não necessária hoje, mas deve seguir este mesmo padrão se o problema aparecer lá no futuro.
