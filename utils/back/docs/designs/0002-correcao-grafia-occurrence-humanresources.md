# Design: Correção de grafia "ocurrence" → "occurrence" em HumanResources

| Campo | Valor |
|---|---|
| **Status** | Em design |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-09-14 |
| **Issue relacionada** | Issue de validação pós-merge dev/master (número a confirmar), pedido direto do time de front |
| **RFC(s) relacionado(s)** | `docs/rfcs/0008-correcao-grafia-occurrence-humanresources.md` |
| **Consumidor(es)** | frontend |

---

## 1. Escopo

### 1.1 O que entra nesta versão

- Path das 10 rotas de `Occurrence`/`OccurrenceType` (`ocurrence`→`occurrence`, `ocurrencetype`→`occurrencetype`).
- Campo `ocurrenceTypeId`→`occurrenceTypeId` no corpo de `POST`/`PATCH` de `Occurrence` (`CreateOccurrenceDto`, `UpdateOccurrenceDto`).
- Renomes internos sem efeito de contrato: `ocurrence.usecases.ts`, `ocurrence.decorators.ts`, `update-ocurrence-type.dto.ts` + classe `UpdateOcurrenceTypeDto`→`UpdateOccurrenceTypeDto` (visível no schema Swagger, ver seção 2), pasta `delete-ocurrence/`.
- Rename de schema físico: tabelas `ocurrence`→`occurrence`, `ocurrence_type`→`occurrence_type`; colunas `ocurrence_type_id`→`occurrence_type_id`, `ocurrence_code`→`occurrence_code`.
- Atualização de `test/modules/humanresources/humanresources.integration.spec.ts`, `test/factory/ocurrence-factory.ts`, `ocurrence-type-factory.ts`, `test/test-helpers.ts`.
- Atualização de `README.md:213-214`.

### 1.2 O que NÃO entra (fora de escopo por decisão, não por esquecimento)

- Qualquer mudança de regra de negócio, validação ou shape de campo além da grafia (nenhum campo novo, nenhum campo removido, nenhuma mudança de tipo).
- Rename das constraints `FKOcurrenceType`/`FKOcurrencePersonLink` — cosmético, sem efeito funcional; fica marcado como opcional na migration (seção 3), decisão final na implementação.
- Edição das migrations originais (`CreateOcurrence`, `CreateOcurrenceType`, `UpdateOcurrenceStartDatefield`) — permanecem com o nome antigo, são histórico já aplicado.
- Período de compatibilidade com a rota/campo antigos (sem alias, sem deprecation warning) — o corte é direto. Se isso for um problema pro front (ex.: deploy do front não pode ser sincronizado com o do backend), é decisão a levantar antes da implementação, não assumida aqui.

## 2. Contrato da API

Todas as 10 rotas abaixo trocam **só o path** de `ocurrence`/`ocurrencetype` para `occurrence`/`occurrencetype`. Método, parâmetros de rota, e formato de resposta **não mudam**, exceto onde indicado.

### `Occurrence` — `/humanresources/occurrence` (antes: `/humanresources/ocurrence`)

| Método | Path novo | Path antigo |
|---|---|---|
| `POST` | `/humanresources/occurrence` | `/humanresources/ocurrence` |
| `GET` | `/humanresources/occurrence` | `/humanresources/ocurrence` |
| `GET` | `/humanresources/occurrence/:id` | `/humanresources/ocurrence/:id` |
| `PATCH` | `/humanresources/occurrence/:id` | `/humanresources/ocurrence/:id` |
| `DELETE` | `/humanresources/occurrence/:id` | `/humanresources/ocurrence/:id` |

**Request (`POST`/`PATCH`) — campo alterado:**
```json
{
  "startDate": "date",
  "endDate": "date",
  "personLinkId": "uuid",
  "occurrenceTypeId": "uuid — ANTES: ocurrenceTypeId (1 c)"
}
```

**Resposta (sucesso) — não muda.** Hoje já retorna `occurrenceTypeId` com grafia correta (entidade `Occurrence`, campo já era `occurrenceTypeId`) — ou seja, depois desta mudança, request e response usam o **mesmo** nome de campo pela primeira vez (ver RFC 0008, seção 1, sobre a inconsistência atual).
```json
{
  "id": "uuid",
  "startDate": "date",
  "endDate": "date",
  "created_at": "date",
  "occurrenceTypeId": "uuid",
  "personLinkId": "uuid"
}
```

**Respostas de erro relevantes:** sem mudança (404 recurso não encontrado, 400 payload inválido, 401 não autenticado).

---

### `OccurrenceType` — `/humanresources/occurrencetype` (antes: `/humanresources/ocurrencetype`)

| Método | Path novo | Path antigo |
|---|---|---|
| `POST` | `/humanresources/occurrencetype` | `/humanresources/ocurrencetype` |
| `GET` | `/humanresources/occurrencetype` | `/humanresources/ocurrencetype` |
| `GET` | `/humanresources/occurrencetype/:id` | `/humanresources/ocurrencetype/:id` |
| `PATCH` | `/humanresources/occurrencetype/:id` | `/humanresources/ocurrencetype/:id` |
| `DELETE` | `/humanresources/occurrencetype/:id` | `/humanresources/ocurrencetype/:id` |

**Request/Resposta:** nenhum campo muda — `CreateOccurrenceTypeDto` já usa `description`/`occurrenceCode`, sem typo. Só o path da rota muda.

**Regras de negócio aplicadas (sem mudança):** filtro por `occurrenceCode` já é acento-insensível (coberto pelo teste de integração, linha 577 do spec atual).

## 3. Modelo de dados

> Os comandos SQL desta seção são executados pela migration TypeORM nova (`npm run migration:run`, mesmo mecanismo usado em qualquer outra migration do projeto), não são passos manuais. Ninguém — nem backend, nem front — roda `ALTER TABLE` à mão em produção; o SQL abaixo só documenta o que o `up()` da migration faz, pra deixar explícito o efeito em produção antes da implementação. Front não interage com este passo de forma nenhuma: a única coisa relevante pro front é que a API já vai estar respondendo no schema novo depois do deploy (seção 4).

Migration nova (não editar as originais), aplicando, nesta ordem, pra respeitar a FK de `occurrence` → `occurrence_type`:

1. `ALTER TABLE ocurrence_type RENAME TO occurrence_type;`
2. `ALTER TABLE occurrence_type RENAME COLUMN ocurrence_code TO occurrence_code;` *(nome de coluna, independente do rename de tabela)*
3. `ALTER TABLE ocurrence RENAME TO occurrence;`
4. `ALTER TABLE occurrence RENAME COLUMN ocurrence_type_id TO occurrence_type_id;`

`RENAME TABLE`/`RENAME COLUMN` em Postgres altera só metadado (não reescreve linhas) — FK e índices continuam funcionando independente do nome da tabela/coluna, então a ordem acima é por clareza, não por necessidade estrita de evitar erro de FK.

`down()` simétrico: reverte na ordem inversa, `RENAME` de volta pros nomes antigos.

**Opcional, a decidir na implementação:** `ALTER TABLE occurrence RENAME CONSTRAINT "FKOcurrenceType" TO "FKOccurrenceType";` e idem pra `FKOcurrencePersonLink` — cosmético, sem efeito funcional (ver seção 1.2).

Entidades TypeORM afetadas: `@Entity('ocurrence')`→`@Entity('occurrence')` (`occurrence.entity.ts:14`), `@Entity('ocurrence_type')`→`@Entity('occurrence_type')` (`occurrence-type.entity.ts:4`), e os `@Column({ name: '...' })`/`@JoinColumn({ name: '...' })` correspondentes às duas colunas renomeadas.

## 4. Pendências do lado do consumidor (frontend)

- [ ] Atualizar toda chamada a `/humanresources/ocurrence*` → `/humanresources/occurrence*` (10 rotas, seção 2).
- [ ] Atualizar o campo `ocurrenceTypeId` → `occurrenceTypeId` em todo `POST`/`PATCH` de ocorrência — **atenção**: se o front hoje mapeia a resposta do `GET` (`occurrenceTypeId`, já correto) manualmente pro campo do request (`ocurrenceTypeId`, hoje errado) pra contornar a inconsistência atual, esse mapeamento manual deixa de ser necessário e deve ser removido, não só renomeado.
- [ ] Validar em ambiente de staging antes do deploy em produção, já que não há período de compatibilidade (sem alias pra rota antiga, ver seção 1.2).

## 5. Casos de borda considerados

- **Rename de tabela com a aplicação no ar:** como `RENAME TABLE`/`RENAME COLUMN` em Postgres é só metadado, o lock é breve, mas ainda existe uma janela onde o app antigo (com `@Entity('ocurrence')`) e o schema novo (`occurrence`) ficam fora de sincronia se a migration rodar antes do deploy da nova versão do backend — ou o inverso, se o deploy do backend rodar antes da migration. **Ordem exigida:** migration primeiro, deploy do backend logo em seguida, sem gap — não avaliado nesta versão se o pipeline de deploy atual (RFC 0006, CI/CD) já garante essa ordem automaticamente ou se é passo manual.
- **Filtro acento-insensível de `occurrenceCode`:** já coberto por teste existente (integration spec, linha 577) — comportamento não muda, só o nome da coluna por trás.
- **Migrations antigas fazendo referência à tabela pelo nome antigo dentro do próprio histórico** (`1673880623260-UpdateOcurrenceStartDatefield.ts` faz `ALTER TABLE "ocurrence" ...`): não é um problema — migrations já aplicadas não rodam de novo; só importa que a migration nova desta versão rode depois de todas as anteriores, o que o TypeORM já garante pela ordem de timestamp.

## 6. Fora de escopo / trabalho futuro

- Alias/período de compatibilidade para a rota antiga (RFC 0008, seção 1.2, decisão consciente de não ter) — se durante a implementação isso se mostrar necessário (ex.: deploy do front não pode ser simultâneo), é decisão a reabrir antes do merge, não durante.
- Rename das constraints `FKOcurrenceType`/`FKOcurrencePersonLink` — ver seção 3, opcional.
- Qualquer alteração de regra de negócio do módulo `humanresources` além da grafia.
