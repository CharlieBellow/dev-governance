# RFC 0008: Correção de grafia "ocurrence" → "occurrence" em HumanResources

| Campo | Valor |
|---|---|
| **Status** | Proposto |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-09-14 |
| **Módulo(s) afetado(s)** | `humanresources` (`Occurrence`, `OccurrenceType`) |
| **Categoria de impacto** | (x) Quebra contrato existente com o front |
| **Janela de aviso aplicada** | Sugerida: confirmação ativa do front antes do cutover — não decidido por mim, ver seção 7. Como o pedido partiu do próprio front, a confirmação pode ser rápida (validar o design doc final, não uma espera de ~1 semana às cegas), mas ainda precisa ser confirmação explícita do escopo completo (seção 4), não só da intenção genérica de corrigir o typo |
| **Confirmação ativa recebida de** | *(em branco até a resposta chegar)* |
| **Pessoas marcadas no PR** | @ |

---

## 1. Problema

As rotas de `HumanResources` relacionadas a ocorrência estão grafadas com 1 "c" (`ocurrence`, `ocurrencetype`), quando o correto em inglês é 2 "c"s (`occurrence`, `occurrencetype`). Reportado durante validação pós-merge `dev`/`master`, com pedido direto do time de front pra correção.

A investigação (ver seção 2) mostrou que o typo não está isolado na URL — ele se repete em pelo menos 4 camadas diferentes do mesmo dado, e uma delas já produz uma inconsistência real de contrato hoje, não só uma questão estética:

- `POST/PATCH /humanresources/ocurrence` **exige** o campo `ocurrenceTypeId` (1 c) no corpo da requisição (`CreateOccurrenceDto`, `src/modules/humanresources/presentation/occurrence/dtos/create-occurrence.dto.ts:22`).
- A mesma rota, em `GET`, **retorna** a entidade `Occurrence` crua, cujo campo é `occurrenceTypeId` (2 c's) (`src/modules/humanresources/domain/entities/occurrence.entity.ts:29`).

Ou seja: hoje, se o front pega a resposta de um `GET` e reenvia como corpo de um `PATCH` sem mapear o campo manualmente, `occurrenceTypeId` (vindo do `GET`) não bate com o que o `PATCH` espera (`ocurrenceTypeId`) — o `ValidationPipe` rejeita ou ignora, dependendo da configuração de whitelist. Isso é uma inconsistência de contrato já existente, independente desta RFC decidir corrigir ou não.

## 2. Contexto

Rotas afetadas, todas em `src/modules/humanresources/presentation/occurrence*`:
- `/humanresources/ocurrence` (5 controllers: create, find-by-id, list, update, delete)
- `/humanresources/ocurrencetype` (5 controllers: create, find-by-id, list, update, delete)

Mapeamento completo do typo, por camada:

**Camada 1 — path da rota** (10 controllers, decorator `@Controller(...)`).

**Camada 2 — payload do corpo da requisição** — campo `ocurrenceTypeId`, declarado uma vez em `CreateOccurrenceDto` (`create-occurrence.dto.ts:22`) e herdado por `UpdateOccurrenceDto` (`update-occurrence.dto.ts`, via `PickType`) e `OccurrenceFieldsDto` (`occurrence-fields.dto.ts`, mesmo mecanismo). Ver seção 1 sobre a inconsistência já existente com a resposta do `GET`.

**Camada 3 — nomes internos de arquivo/classe** (não afetam contrato externo, mas ficam inconsistentes se só a rota for corrigida):
- `application/occurrence/usecases/ocurrence.usecases.ts` (barrel file; conteúdo interno já usa "Occurrence" certo)
- `presentation/occurrence/ocurrence.decorators.ts` (mesmo caso — conteúdo já usa "Occurrence" certo, só o nome do arquivo está errado; não apareceu no primeiro grep por conteúdo porque o arquivo em si não tem a string errada)
- `presentation/occurrence-type/dtos/update-ocurrence-type.dto.ts` + classe `UpdateOcurrenceTypeDto`, usada em 4 lugares (`update-occurrence-type.usecase.ts`, `occurrence-type.decorators.ts`, `update-occurrence-type.controller.ts`, o próprio DTO) — essa classe aparece no schema `components` do Swagger/OpenAPI gerado, então tecnicamente também é superfície visível pro front, não só nome interno
- pasta `application/occurrence/usecases/delete-ocurrence/` (arquivos dentro já corretos: `delete-occurrence.usecase.ts`/`.spec.ts`)

**Camada 4 — schema físico do banco** (`src/modules/humanresources/domain/entities/occurrence.entity.ts`, `occurrence-type.entity.ts`):
- Tabela `ocurrence` (`@Entity('ocurrence')`)
- Tabela `ocurrence_type` (`@Entity('ocurrence_type')`)
- Coluna `ocurrence_type_id` (FK em `ocurrence`, aponta pra `ocurrence_type.id`)
- Coluna `ocurrence_code` (em `ocurrence_type`)
- Constraints nomeadas explicitamente na migration original (`1652276354056-CreateOcurrence.ts:40,48`): `FKOcurrenceType`, `FKOcurrencePersonLink` — renomear é cosmético (FK funciona independente do nome da constraint), decisão de incluir ou não fica pro design doc (seção 3 de lá)

**Camada 5 — testes**: `test/modules/humanresources/humanresources.integration.spec.ts` (endpoints hardcoded `/ocurrence`/`/ocurrencetype`, ~40 ocorrências, describe/it com "Ocurrence" no nome), `test/factory/ocurrence-factory.ts` e `ocurrence-type-factory.ts` (nome de arquivo + campo `ocurrenceTypeId`, espelhando a camada 2), `test/test-helpers.ts` (variáveis `ocurrenceRepo`/`ocurrenceTypeRepo`).

**Camada 6 — documentação já publicada**: `README.md:213-214`, tabela de rotas do projeto, documenta `/humanresources/ocurrence` e `/humanresources/ocurrencetype` explicitamente com a grafia errada.

As migrations originais (`1650985258400-CreateOcurrenceType.ts`, `1652276354056-CreateOcurrence.ts`, `1673880623260-UpdateOcurrenceStartDatefield.ts`) já rodaram em produção e **não são editadas** — corrigir o schema físico exige uma migration nova (`RENAME TABLE`/`RENAME COLUMN`), não alterar o histórico.

## 3. Alternativas consideradas

### Alternativa A: Só a rota HTTP (mínimo, resolve literalmente o que a issue pediu)
- Descrição: corrige só o `@Controller(...)` dos 10 controllers.
- Prós: menor blast radius, revisão rápida, não toca em payload nem banco.
- Contras: deixa a inconsistência da seção 1 (`ocurrenceTypeId` no request vs. `occurrenceTypeId` na resposta) sem solução — o typo continua visível pro consumidor externo, só migrou de lugar. Deixa nomes internos e schema físico com a grafia errada, exigindo reabrir a mesma área de código depois.

### Alternativa B: Rota + payload do corpo, sem nomes internos nem schema físico
- Descrição: resolve as duas inconsistências visíveis externamente (camadas 1 e 2), deixa camadas 3 e 4 como débito técnico registrado.
- Prós: resolve o que de fato é contrato externo, sem acoplar risco de migration de schema físico ao mesmo deploy.
- Contras: schema físico (tabela `ocurrence`, coluna `ocurrence_code`) fica com grafia divergente da entidade/classe TypeScript que o mapeia — quem inspecionar o banco diretamente (debug, BI, backup) vê uma grafia diferente do resto do código.

### Alternativa C: Rota + payload + nomes internos + schema físico, tudo num único RFC/PR/deploy (escolhida)
- Descrição: corrige as 6 camadas mapeadas na seção 2 de uma vez.
- Prós: consistência total entre rota, payload, classe, entidade e tabela — fecha o assunto numa única vez.
- Contras: acopla um breaking change de API (evento simples, revertível com rollback de deploy) a uma migration de schema físico (evento com risco operacional diferente — depende da migration rodar com sucesso em produção, possível lock breve na tabela). Ver seção 6.2 e 7.

## 4. Decisão

Alternativa C, por decisão explícita de quem revisou este RFC comigo: o motivo dado foi evitar reabrir esta mesma área de código depois que o sistema já estiver em produção de fato — ou seja, preferir pagar o custo de uma migration de schema agora, enquanto o assunto já está mapeado e em discussão, a ter que levantar RFC/design doc de novo no futuro só pra terminar a correção do schema físico.

Registro aqui, como o próprio `docs/README.md` pede (seção "Como usar esta pasta", item 5), que minha recomendação inicial nesta conversa foi separar em dois RFCs — um cobrindo rota+payload (o que o front efetivamente pediu, resolve rápido) e outro, independente, propondo o rename de schema físico sem bloquear a entrega do que já era urgente. A divergência foi deliberada por quem revisou, registrada aqui, não implementada por fora do que ficou decidido.

## 5. Precedente no projeto

Rename de schema físico em produção já tem precedente direto e recente neste projeto — não é a primeira vez:

```
src/shared/infra/typeorm/migrations/1762538641270-DropPersonIdFromSubGroup.ts
src/shared/infra/typeorm/migrations/1762783609224-MigrateServiceOrderRequesterToRequesters.ts
src/shared/infra/typeorm/migrations/1762867745119-DropUserIsAdminColumn.ts
```

Nenhuma dessas mexe em nome de tabela (mexem em coluna/relação), então o `RENAME TABLE` desta RFC não tem precedente idêntico no projeto — só precedente de que migrations de alteração estrutural (não só criação) já são prática aceita aqui.

## 6. Consequências

### 6.1 Positivas

- Fecha a inconsistência real já existente entre o campo do request (`ocurrenceTypeId`) e o campo da resposta (`occurrenceTypeId`) — hoje um risco silencioso de bug de integração no front (seção 1).
- Consistência total entre rota, payload, classe TypeScript, entidade e tabela física — quem inspecionar qualquer camada (Swagger, código, banco) vê a mesma grafia.
- A suíte de integração (`test/modules/humanresources/humanresources.integration.spec.ts`) já cobre create/find/list/update/delete pros dois recursos, incluindo autenticado/não-autenticado e 404 — funciona como safety net pra validar a troca de rota sem escrever teste novo, desde que os testes sejam atualizados junto (ver design doc).
- Evita reabrir esta área de código depois que o sistema estiver em produção de verdade (motivo dado pela decisão, seção 4).

### 6.2 Negativas / trade-offs aceitos

- Acopla um breaking change de contrato de API (rota + payload) a uma migration de schema físico — duas categorias de risco diferentes num único deploy: a API é revertível com rollback simples; a migration depende de rodar com sucesso em produção, e reverter depois de outros dados/deploys já dependerem do nome novo é mais custoso.
- O pedido original do front foi só "corrigir a rota" — o escopo real desta RFC é maior (payload, nomes internos, schema físico). Ver seção 7 sobre a necessidade de confirmar esse escopo maior com o front antes do deploy, não presumir que o pedido original já cobre isso.
- Nenhuma visibilidade sobre consumidores diretos do banco físico fora deste repositório (BI, scripts de relatório, backup manual) — se algo consulta `ocurrence`/`ocurrence_type` fora do código do backend, quebra sem aviso desta RFC.

## 7. Riscos e perguntas em aberto

- **Escopo da confirmação do front:** o pedido original foi "corrigir a grafia da rota". Este RFC amplia isso pra payload + schema físico. Quem revisar deve decidir se vale re-confirmar explicitamente esse escopo maior com o front antes do deploy (recomendo que sim, dado que o payload do `POST`/`PATCH` muda, não só a URL), ou se o pedido original já é interpretado como aprovação implícita do pacote completo — não decido isso sozinho.
- **Janela de aviso e forma de confirmação** não decidida por mim (campo no cabeçalho) — depende de quem revisar confirmar prazo e formato, considerando que o pedido já partiu do front (pode encurtar a janela, mas não eliminar a confirmação ativa).
- **Nomes de constraint** (`FKOcurrenceType`, `FKOcurrencePersonLink`) — renomear é puramente cosmético, sem risco funcional, mas não decidido se entra no escopo desta migration ou fica de fora (design doc, seção 3).
- **Lock de tabela durante o `RENAME TABLE`/`RENAME COLUMN`:** não avaliado volume de dados/tráfego atual das tabelas `ocurrence`/`ocurrence_type` pra estimar impacto real de um lock breve em produção — `RENAME` costuma ser rápido em Postgres (só metadado, não reescreve linhas), mas não foi confirmado o SGBD/versão em uso nem testado.
- **Migrations anteriores não são alteradas** (`CreateOcurrence`, `CreateOcurrenceType`, `UpdateOcurrenceStartDatefield`) — ficam com o nome de arquivo/classe errado permanentemente, por serem histórico já aplicado. Isso é aceito como normal (não se reescreve migration já rodada), registrado aqui só pra não ser confundido com esquecimento.

## 8. Escopo de aplicação futura

Esta RFC não estabelece um padrão novo pro projeto — é correção pontual de um typo introduzido historicamente neste módulo específico (`humanresources`). Não se aplica a outros módulos nem estabelece convenção de nomenclatura além da já existente (inglês correto em identificadores).

---

*Rascunho — RFC 0007 está sendo aberto separadamente por outro dispositivo/sessão; numeração 0008 escolhida para evitar colisão.*
