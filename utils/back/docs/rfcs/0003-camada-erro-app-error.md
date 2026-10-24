# RFC Leve 0003: Camada de erro de domínio (`AppError`) desacoplada do HTTP

> RFC leve — decisão interna, sem impacto externo nem infraestrutura nova (padronização interna de erros, ver `guia-fluxo-documentacao-backend.md`, tabela do Passo 3, primeira linha).

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-08-13 |
| **Atualizado em** | 2026-10-22 (números da seção 1 e riscos revisados contra o código atual; ainda não implementado) |
| **Módulo(s) afetado(s)** | Camada de aplicação (usecases) de todos os módulos que usam `TypeORM`; `src/modules/exceptions` |

---

## 1. Problema

O tratamento de erro hoje tem duas lacunas:

**Erro de banco tratado de forma hardcoded e duplicada.** Quatro usecases capturam código de erro do Postgres, em 5 pontos: `delete-room.usecase.ts:22` (`'23503'`), `delete-block.usecase.ts:26-30` (`'22P02'`, `'23503'`), `update-block.usecase.ts:34` (`'22P02'`) e `find-block-by-id.usecase.ts:23` (`'22P02'`), todos em `src/modules/core/application/`. Os códigos são magic strings repetidas em cada usecase, sem constante compartilhada, sem tipo (`error` é `any` implícito). Os outros usecases que usam `TypeORM` (dezenas, em `core`, `accounts`, `academic`, `scheduling`, `servicebook`) não tratam erro de banco — um `QueryFailedError` sobe cru.

**Camada de aplicação lança `HttpException` diretamente.** Usecases como `create-person.usecase.ts`, `create-role.usecase.ts` etc. fazem `throw new BadRequestException(...)` / `ConflictException` / `NotFoundException` por regra de negócio — a camada de aplicação decide o status HTTP, sem uma camada de erro de domínio intermediária. Medição em 2026-10-22: 188 `throw new *Exception` em 98 arquivos não-spec (servicebook 30 arquivos, core 18, accounts 16, humanresources 14, scheduling 6, auth 3, academic 3), e 79 specs referenciam `Exception`. Além dos usecases, 13 arquivos também lançam `HttpException`: validators, guards (`auth.guard.ts`, `policies.guard.ts`), `local.strategy.ts`, `authorize-service-order.util.ts`, `shared/object.util.ts`, repositórios in-memory, `typeorm-schedule.repository.ts` e o provider GLPI.

**Filtro global só cobre o que já é `HttpException`.** `src/modules/exceptions/http-exception.filter.ts` (`@Catch(HttpException)`) monta o envelope padrão da API (`statusCode`, `message`, `timestamp`, `path`). Erros que não são `HttpException` (ex.: `QueryFailedError` cru dos usecases sem tratamento) não passam por esse filtro — caem no handler default do Nest, com shape diferente do padrão da API.

## 2. Decisão

Introduzir uma hierarquia de erro de domínio (`AppError`) desacoplada de HTTP, lançada pelos usecases/repositórios no lugar de `HttpException` direto. O mapeamento `AppError` → `HttpException` (status + mensagem) acontece num único ponto na borda (extensão do filtro atual ou um mapper dedicado antes dele), preservando os mesmos status codes e mensagens já em uso hoje — ou seja, sem mudar o contrato de resposta que o front já consome (confirmado como escopo desta decisão: nenhuma rota muda o `statusCode` ou o formato de erro que já retorna hoje).

Isso também dá um lugar único para normalizar os códigos do Postgres (`23503`, `22P02`, etc.) em vez de repetir `error.code === '...'` em cada usecase — a tradução de erro de banco vira parte da hierarquia `AppError` (ex.: um caso que mapeia código Postgres → erro de domínio específico), não lógica ad-hoc por usecase.

## 3. Alternativas descartadas (breve)

- **Só extrair os códigos Postgres para uma constante compartilhada, sem `AppError`**: resolve a duplicação de magic strings, mas não resolve o acoplamento usecase → HTTP nem estende o tratamento para os usecases que hoje não tratam erro de banco.
- **Catch genérico de `Error` só no filtro global, sem hierarquia `AppError`**: normaliza o shape de resposta para qualquer erro não tratado, mas perde o contexto de negócio que hoje existe nos dois usecases que já tratam erro (ex.: mensagem específica "não é possível deletar a sala porque está sendo utilizada em algum agendamento" vs. mensagem genérica de erro de banco).

## 4. Precedente no projeto

Não há precedente de camada de erro de domínio neste projeto — o único precedente existente é o tratamento ad-hoc e duplicado em usecases de `room` e `block` citados na seção 1, que é exatamente o padrão que esta RFC busca substituir. O `HttpExceptionFilter` (`src/modules/exceptions/http-exception.filter.ts`) é o único ponto centralizado de erro hoje, mas cobre só `HttpException`.

## 5. Riscos em aberto

- **Escopo de aplicação retroativa não decidido**: esta RFC não define se a migração cobre só o mapeamento de erro de banco (escopo mínimo, resolve a duplicação citada na seção 1) ou também os usecases que já lançam `HttpException` direto por regra de negócio (escopo maior: 188 throws em 98 arquivos e ~79 specs a ajustar). Fica como decisão de implementação, não bloqueia a aceitação do padrão. Sugestão a confirmar na revisão: entregar primeiro hierarquia + mapper + os 4 usecases com código Postgres, e migrar o restante por módulo, em PRs separados, conforme cada módulo for tocado.
- **Fora dos usecases, não decidido**: validators, guards, strategies, repositórios (inclusive in-memory e TypeORM) e o provider GLPI também lançam `HttpException`. Guards e strategies rodam antes/fora do fluxo de usecase e podem precisar continuar com `HttpException` (ou ter mapeamento próprio); o provider GLPI é coberto pela RFC 0007. Definir o limite na implementação.
- **Filtro atual não captura `AppError`**: `HttpExceptionFilter` é `@Catch(HttpException)` e registrado em `main.ts`. Se o mapper for um filtro novo ou o filtro for ampliado para `@Catch()`, é preciso garantir que erros não mapeados continuem com o comportamento atual.
- **Normalização de erros hoje não tratados muda o shape observado nesses casos específicos**: os usecases que hoje deixam `QueryFailedError` vazar cru recebem resposta no shape default do Nest, não no envelope padrão da API. Ao passar a cobrir esses casos, a resposta desses erros específicos passa a ter o envelope padrão pela primeira vez — é uma correção de inconsistência, não uma mudança de contrato em uso, mas fica registrado como comportamento observável que muda.
- **Design interno do `AppError` não decidido nesta RFC**: se será uma classe única com campo `code`/`type` discriminando o caso, ou uma hierarquia de subclasses (`NotFoundError`, `ConflictError`, `ForeignKeyViolationError` etc.) — fica como detalhe de implementação a refinar, não afeta a decisão de padrão em si.

---

*RFC leve segue lazy consensus: entra em vigor em 24h ou "documentando e seguindo", salvo objeção registrada no PR antes desse prazo. Ver `guia-fluxo-documentacao-backend.md`.*
