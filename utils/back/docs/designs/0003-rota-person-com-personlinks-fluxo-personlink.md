# Design: Rota `Person` com `personLinks` para o fluxo de CRUD de PersonLink

| Campo | Valor |
|---|---|
| **Status** | Em design |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-09-14 |
| **Issue relacionada** | #119 |
| **RFC(s) relacionado(s)** | `docs/rfcs/0009-rota-person-com-personlinks-fluxo-personlink.md`, `docs/rfcs/0001-endpoints-dedicados-pessoas-autorizadas-sala.md` |
| **Consumidor(es)** | frontend — fluxo de CRUD de PersonLink |

---

## 1. Escopo

### 1.1 O que entra nesta versão

- 1 endpoint novo: `GET /core/person/:id/with-person-links`, devolvendo o `Person` no formato enxuto de sempre acrescido de `personLinks`.
- 1 DTO de resposta novo (`PersonWithPersonLinksResponseDto` ou nome equivalente a confirmar na implementação), no mesmo padrão manual de mapeamento já usado por `PersonResponseDto`/`PersonSummaryDto`.
- Reaproveitamento do usecase existente `FindPersonByIdUseCase` (`src/modules/core/application/person/usecases/find-person/find-person.usecase.ts`) como fonte do `Person` já com `personLinks` carregado — sem duplicar a lógica de "buscar ou lançar `NotFoundException`" em um segundo usecase.

### 1.2 O que NÃO entra (fora de escopo por decisão, não por esquecimento)

- Qualquer alteração em `GET /core/person/:id`, `PersonResponseDto` ou `PersonSummaryDto` — continuam enxutos, exatamente como hoje.
- Qualquer alteração nos controllers/DTOs de `person-link` (`create/find/update/delete-person-link.controller.ts`) — este design não mexe no módulo `person-link`.
- Controle de acesso restringindo esta rota ao fluxo de `personLink` (guard/policy dedicado) — a restrição de uso é convencional, registrada na RFC 0009 §7, não técnica.
- Paginação/filtro dos `personLinks` retornados — devolve a lista completa da pessoa, sem paginação (mesmo comportamento que `Person.findById` já tem hoje internamente).

## 2. Contrato da API

### `GET core/person/:id/with-person-links`

**Descrição:** retorna o `Person` identificado por `:id` no mesmo formato enxuto de `GET /core/person/:id`, acrescido do campo `personLinks` com os vínculos da pessoa (e suas sub-relations já carregadas hoje pelo repositório: `course`, `department`, `employeeRole`, `functionalLevel`). Uso restrito, por convenção, ao fluxo de CRUD de `PersonLink` no front — não deve ser adotado como rota geral de leitura de `Person` (ver RFC 0009, regra combinada na issue original).

**Request:** sem corpo. `:id` — uuid, obrigatório, na URL.

**Resposta (sucesso, 200):**
```json
{
  "id": "uuid",
  "name": "string (nome social, se houver — mesmo critério de PersonResponseDto)",
  "cpf": "string",
  "email": "string | null",
  "contact": "string | null",
  "gender": "enum Gender",
  "status": "enum PersonStatus",
  "personLinks": [
    {
      "id": "uuid",
      "startDate": "date",
      "endDate": "date | null",
      "possessionDate": "date | null",
      "enrollment": "string | null",
      "specialtyDegree": "string | null",
      "unity": "string | null",
      "titulation": "string | null",
      "linkType": "string",
      "created_at": "date",
      "functionalLevel": "objeto FunctionalLevel | null",
      "employeeRole": "objeto EmployeeRole | null",
      "department": "objeto Department | null",
      "course": "objeto Course | null"
    }
  ]
}
```
*(Formato de cada item de `personLinks` replica o que os controllers de `person-link` já devolvem hoje — entidade `PersonLink` crua com as mesmas sub-relations que `find-person-link-by-id.controller.ts` carrega. Nenhum DTO novo para o item de `personLinks` nesta versão; confirmar na implementação se isso é aceitável ou se o front prefere um formato mais enxuto por vínculo — não é decisão de posicionamento de rota, é ajuste de payload, fora do escopo da RFC 0009.)*

**Respostas de erro relevantes:**
| Status | Quando ocorre |
|---|---|
| 404 | `Person` não encontrado para o `id` informado (mesmo comportamento de `GET /core/person/:id`, via `FindPersonByIdUseCase`) |

**Regras de negócio aplicadas nesta rota:**
- Nenhuma regra de negócio além da busca — não há mutação, é leitura pura.
- `personLinks` reflete o estado atual salvo no banco; não há cache nem projeção intermediária.

## 3. Modelo de dados

- Nenhuma migration, nenhuma entidade nova. `Person.personLinks` (`@OneToMany`) e a query de `TypeOrmPersonRepository.findById` já existem e já carregam tudo que esta rota precisa.
- Novo DTO de aplicação (`application/person/dtos/`), no mesmo padrão de `PersonResponseDto`: classe com `@ApiProperty` por campo e construtor que recebe a entidade `Person` e copia os campos enxutos de sempre + `personLinks` (array da entidade `PersonLink`, sem remapeamento).
- Novo controller em `presentation/person/controllers/`, sob o mesmo `@Controller('/core/person')` dos demais controllers de `person`, delegando a busca ao `FindPersonByIdUseCase` já existente e só trocando o DTO de saída.

## 4. Casos de borda considerados

- **`Person` sem nenhum `personLink`:** `personLinks` retorna `[]`, não `null` — mesmo comportamento que o TypeORM já dá para uma relation `OneToMany` vazia.
- **Uso fora do fluxo de `personLink`:** tecnicamente possível (rota pública dentro da API autenticada, sem trava específica) — não tratado neste design, registrado como risco aceito na RFC 0009 §7.
- **`id` inexistente:** mesmo tratamento de `GET /core/person/:id` — `404` via `FindPersonByIdUseCase`, sem lógica nova.

## 5. Fora de escopo / trabalho futuro

- Qualquer mecanismo técnico (guard, policy, ou rota versionada/marcada) para impedir uso desta rota fora do fluxo de `personLink` — se a convenção documentada não se sustentar na prática, é RFC futuro.
- DTO dedicado para cada item de `personLinks` (hoje reaproveita o formato cru da entidade, igual aos demais controllers de `person-link`) — ajuste de payload a avaliar separadamente, não bloqueia esta decisão de posicionamento de rota.
