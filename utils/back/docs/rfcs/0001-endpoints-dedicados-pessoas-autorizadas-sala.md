# RFC 0001: Endpoints dedicados para gerenciar pessoas autorizadas de uma sala

| Campo | Valor |
|---|---|
| **Status** | Aceito (retroativo — decisão já implementada nos commits `a609ee5`..`facc898`, entre 2026-07-22 e 2026-08-06, antes de este processo de RFC existir) |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-08-12 (data de redação deste registro retroativo) |
| **Módulo(s) afetado(s)** | `core/room` |
| **Categoria de impacto** | ( ) Interno, sem impacto externo &nbsp;&nbsp; (x) Afeta consumo do front &nbsp;&nbsp; ( ) Quebra contrato existente com o front &nbsp;&nbsp; ( ) Requer infraestrutura nova |
| **Janela de aviso aplicada** | N/A — decisão implementada antes deste processo existir. Este documento é o registro retroativo, não uma proposta em janela de aviso ativa. |
| **Confirmação ativa recebida de** | N/A (retroativo) |
| **Pessoas marcadas no PR** | — |

---

## 1. Problema

A sala (`Room`) precisa manter uma lista de pessoas autorizadas a reservá-la (`authorizedPersons`). Era preciso decidir como expor, via API, as operações de adicionar e remover pessoas dessa lista: como parte de uma rota de atualização da sala com semântica de substituição total (`PUT`, proposta pelo time de frontend), ou como rotas dedicadas para gerenciar a relação.

## 2. Contexto

O sistema não tem um requisito formal (NEC/RF) específico para gestão de lista de autorizados por sala na documentação oficial do projeto — o requisito mais próximo é o de controle de acesso geral (RN05: "acesso somente com permissão, concedida conforme descrição das roles"). A entidade `Room` e a relação `authorizedPersons` foram introduzidas nos commits `a609ee5` (migração/entidades/DTOs) e `3985382`/`5c5426a` (implementação e refatoração do módulo). A decisão de rota se aplica a partir daí.

## 3. Alternativas consideradas

### Alternativa A: Campo `authorizedPersonIds: string[]` representando a lista completa, via `PUT /core/room/:id` (proposta original do time de frontend)
- Descrição: cliente envia a representação completa da sala a cada requisição, incluindo a lista final de pessoas autorizadas — uso de `PUT` tecnicamente correto para expressar substituição total do recurso (ao contrário de `PATCH`, `PUT` não tem ambiguidade de semântica de merge parcial; a proposta estava certa nesse ponto específico).
- Prós: uma única rota; menos código de controller/use case; verbo HTTP usado de forma semanticamente correta para "enviar o estado final".
- Contras: (1) mistura, no mesmo use case, validação de dois domínios diferentes — existência de pessoa (domínio Pessoa) e atributos da sala (domínio Sala, ex. `blockId`, `capacity`) — sem sobreposição real entre as duas regras; (2) o verbo estar correto não elimina o problema operacional de concorrência: para gerar o payload completo, o cliente precisa ler o estado atual antes de escrever. Duas edições concorrentes (ex. dois administradores mexendo na lista ao mesmo tempo, cada um a partir do estado que tinha em tela) resultam em *lost update* — a última escrita substitui o recurso inteiro e apaga silenciosamente a mudança da outra. O problema (2) é mitigável com engenharia (controle de concorrência otimista — campo de versão, `ETag`/`If-Match`); o problema (1) não é — nenhuma solução de concorrência resolve dois domínios de validação compartilhando um único use case.

### Alternativa B: Campos `addPersonIds`/`removePersonIds` (delta, não substituição) na mesma rota
- Descrição: variação hipotética da alternativa A — não foi a proposta real de ninguém, incluída aqui por completude — que evitaria o replace total aceitando IDs a adicionar/remover como campos separados na mesma requisição de atualização da sala.
- Prós: resolve o problema de *lost update* da alternativa A, mantendo uma única rota.
- Contras: ainda mistura, no mesmo use case, validação de domínios diferentes (existência de pessoa vs. atributos da sala — bloco, capacidade), ainda impede diferenciar autorização (RBAC/guard) por tipo de operação sem lógica condicional no controller, e ainda expande a matriz de testes (combinações entre update de campo escalar e operações de lista na mesma chamada).

### Alternativa C: Endpoints dedicados (escolhida)
- Descrição: `POST /core/room/:id/authorized-persons` para adicionar, `POST /core/room/:id/remove-authorized-persons` para remover, cada um com use case, DTO e validação próprios; `PATCH /core/room/:id` permanece só para atributos escalares da sala.
- Prós: cada operação recebe um delta (lista de IDs a adicionar/remover), não o estado final — duas operações concorrentes convergem sem se apagar; validação de domínio (existência de pessoa) isolada da validação de domínio da sala; guard/policy podem ser aplicados por rota no futuro; superfície de teste linear, não combinatória.
- Contras: três rotas em vez de uma para o consumidor integrar; maior número de chamadas HTTP para compor a tela de "editar sala" no front.

## 4. Decisão

Alternativa C. O motivo decisivo é que "pessoas autorizadas de uma sala" e "atributos da sala" são domínios de validação diferentes (existência de pessoa vs. regras da própria sala) — isso sozinho já elimina a Alternativa B, mesmo ela resolvendo o problema de concorrência. Controle de concorrência (versionamento, `ETag`) resolveria o risco de *lost update* da Alternativa A, mas não resolveria a mistura de domínios, que é o problema estrutural de fundo. A concorrência é um risco adicional e real (seção 3, Alternativa A), mas não é o motivo central da decisão — é evidência reforçando uma decisão que já se sustentaria só pela separação de domínio.

## 5. Precedente no projeto

Esta decisão segue um padrão já estabelecido por Danilo Almeida no módulo `accounts`: vincular permissões a uma role é uma rota dedicada, separada do update genérico da role.

```
src/modules/accounts/presentation/role/controllers/create-role-permissions.controller.ts
```

`POST /roles/:roleId` cria o vínculo role↔permissão; não é um campo dentro de `PATCH /roles/:id`. `add`/`remove-authorized-persons` em `room` replica essa mesma decisão de design.

## 6. Consequências

### 6.1 Positivas

- Duas edições concorrentes na lista de autorizados (ex. dois administradores) convergem corretamente, sem *lost update*.
- Validação de existência de pessoa (`PersonRepository.checkPersonsExist`) isolada da validação de atributos da sala (`RoomValidator.validateUpdate`) — nenhuma trava a outra.
- Testes por use case, sem matriz combinatória entre update de sala e gestão de lista.
- Abre caminho para autorização (RBAC) diferenciada por operação no futuro.

### 6.2 Negativas / trade-offs aceitos

- O front precisa de três chamadas em vez de uma para compor um fluxo completo de "editar sala e sua lista de autorizados".

## 7. Riscos e perguntas em aberto

- `remove-authorized-persons` usa `POST` em vez de `DELETE` — o verbo de remoção está no path (`/remove-authorized-persons`) em vez de expresso pelo método HTTP. É uma inconsistência real com convenção REST, não corrigida nesta decisão.
- Nenhuma das rotas de `room` (`update-room`, `add-authorized-persons`, `remove-authorized-persons`) tem guard de autorização por role hoje — `AuthGuard` valida apenas autenticação (JWT), não há `@UseGuards`/policy CASL aplicado a este módulo. Qualquer usuário autenticado pode, tecnicamente, chamar essas rotas hoje, independentemente de role. Isso amplia o universo de atores que poderia gerar a condição de concorrência descrita na seção 3, e é um risco de autorização em aberto, não resolvido por este RFC.
- O mesmo padrão rejeitado na Alternativa A — campo relacional (array) substituído por inteiro dentro de uma rota de update genérica, independente do verbo HTTP usado — existe hoje em três outros pontos do sistema, todos via `PATCH`: `PATCH /users/:id` com `roles`, `PATCH servicebook/subgroup/:id` com `coordinators`/`responsibles`, `PATCH` de service-order com `responsiblesIds`. Não corrigidos, fora do escopo deste RFC. Candidatos a RFC futuro aplicando a mesma decisão.

## 8. Escopo de aplicação futura

Esta decisão é convenção para o projeto: qualquer relação N:N gerenciada entre uma entidade principal e outra (ex. sala↔pessoa, role↔permissão) deve ter endpoint dedicado, separado do update genérico da entidade principal, seguindo o mesmo raciocínio da seção 3. Os três casos citados na seção 7 (`user`, `service-subgroup`, `service-order`) divergem hoje desta convenção e devem ser tratados em RFC(s) futuro(s), não retroativamente por este documento.

---

*Este RFC é um registro retroativo. A janela de lazy consensus não se aplica: a decisão já está implementada e em produção. Discordância deve seguir o processo normal — abrir novo RFC referenciando este.*
