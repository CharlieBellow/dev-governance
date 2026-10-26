# Documentação do Back-end

> Processo geral (quando documentar, janelas de aviso): [`../guia-fluxo-documentacao.md`](../guia-fluxo-documentacao.md). Regras para IA: [`../README.md`](../README.md#se-você-é-uma-ia-sendo-usada-para-desenvolver-ou-revisar-código-deste-projeto).

Este arquivo resume os **padrões vigentes** do back. Cada padrão aponta para o RFC que o justifica. Código que não segue estes padrões só entra com um RFC novo referenciando o anterior.

## Padrões vigentes

> Preencha conforme o projeto. Um padrão sem RFC de origem é marcado como "herdado" — candidato a RFC leve de registro.

| Tema | Padrão adotado | RFC de origem |
|---|---|---|
| Arquitetura de camadas | Clean Architecture / DDD (`domain` → `application` → `infrastructure`), conforme `GLOBAL_RULES.md` do dev-governance | herdado |
| Validação de entrada | Schemas Zod em toda fronteira (payload, query, params) | herdado |
| Tratamento de erros | Exceções de domínio herdando de classe base + filtro centralizado | herdado |
| Resposta da API | DTOs de resposta/Presenters; nunca entidade de banco | herdado |
| Convenção de rotas | *(ex.: relações N:N têm endpoints dedicados — `POST /recurso/:id/relacao`)* | |
| Autorização | *(ex.: CASL / guards por role)* | |
| Testes | Vitest para domínio e casos de uso; TDD | herdado |

## Índice de RFCs do back

| RFC | Título | Status |
|---|---|---|
| — | *(nenhum ainda — copie `../_templates/rfc-leve.md` ou `../_templates/rfc-completo.md` para `rfcs/BE-0001-nome.md`)* | — |

## Índice de designs de API

| Design | Feature | Consumidor | Status |
|---|---|---|---|
| — | *(nenhum ainda — copie `../_templates/design-api.md` para `designs/BE-D-0001-nome.md`)* | — | — |
