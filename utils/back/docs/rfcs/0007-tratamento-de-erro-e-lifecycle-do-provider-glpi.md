# RFC 0007: Tratamento de erro e lifecycle de sessão do provider GLPI

| Campo | Valor |
|---|---|
| **Status** | Proposto |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-09-12 |
| **Módulo(s) afetado(s)** | `src/modules/servicebook/infra/providers/service-order/GLPI/glpi-service-order.provider.ts`; use cases consumidores em `src/modules/servicebook/application/service-order/` e `.../service-order-follow-up/`; potencialmente `src/modules/exceptions` (se integrado à RFC 0003) |
| **Categoria de impacto** | ( ) Interno, sem impacto externo &nbsp;&nbsp; (x) Afeta consumo do front &nbsp;&nbsp; ( ) Quebra contrato existente com o front &nbsp;&nbsp; ( ) Requer infraestrutura nova |
| **Janela de aviso aplicada** | Sugestão: 48–72h úteis com confirmação ativa do consumidor (front), por mudar o que o front observa em cenários de falha do GLPI — **a confirmar por quem revisar**, ver seção 7 |
| **Confirmação ativa recebida de** | *(em branco até resposta)* |
| **Pessoas marcadas no PR** | @ |

---

## 1. Problema

`GlpiServiceOrderProvider` é a única integração com um sistema externo (GLPI) usada pelo módulo `servicebook`, e concentra vários problemas de robustez que, juntos, fazem falhas do GLPI se comportarem de formas imprevisíveis — de "sumir silenciosamente" a derrubar o processo Node inteiro. Investigação detalhada abaixo, com arquivo/linha do estado atual do código.

### 1.1 Lifecycle de sessão pode derrubar o processo inteiro (maior risco encontrado)

`glpi-service-order.provider.ts:23-25` chama `this.initSession()` no construtor **sem `await`**. `initSession()` (linhas 208-225) **não tem `try/catch`** e é também o alvo de `@Cron('*/10 * * * *')` (linha 207).

Verificação em `node_modules/cron/dist/job.js` (lib usada por baixo do `@nestjs/schedule`): o `try/catch` interno de `fireOnTick()` só cobre exceções síncronas, ou assíncronas quando `waitForCompletion: true` — o que o `@nestjs/schedule` não configura (confirmado: nenhuma ocorrência de `waitForCompletion` em `node_modules/@nestjs/schedule/dist/*.js`). Ou seja, um erro assíncrono dentro de `initSession()` vira uma promise rejeitada sem ninguém para capturá-la, tanto na chamada direta do construtor quanto em cada disparo do cron.

O projeto exige `node >= 22` (`package.json`) e não registra nenhum handler `process.on('unhandledRejection', ...)`. Comportamento padrão do Node desde a v15: **o processo é encerrado em caso de unhandled rejection.**

**Cenário de falha concreto:** GLPI fora do ar, URL/token mal configurado, ou timeout de rede no boot da aplicação (ou em qualquer execução do cron a cada 10 minutos) → `axios.get` rejeita dentro de `initSession()` → promise sem handler → processo Node encerrado → **toda a API fica fora do ar**, não só a integração GLPI.

### 1.2 Retorno `undefined` silencioso já causa crashes reais em pontos concretos de uso

A interface `ServiceOrderProvider` (`domain/providers/service-order/service-order.provider.ts:13-39`) declara retornos como `Promise<ServiceOrderProviderResponseDto>` e `Promise<AddFollowUpResponseDto>`, sem `| undefined`. `ServiceOrderProviderResponseDto` é um objeto simples (`{ id, user_id, message }`), sugerindo ao chamador que pode desreferenciar `.id`/`.user_id` livremente em qualquer resposta resolvida.

Na prática, ~10 métodos do provider (`updateFollowUP`, `deleteFollowUP`, `addFollowUP`, `assignUser`, `createUser`, `createServiceOrder`, entre outros) capturam qualquer erro do axios num `catch` que só faz `console.log` e não relança nada — a função termina retornando `undefined` implicitamente, violando o próprio tipo declarado.

Dois call sites concretos já quebram com esse padrão:

- `create-service-order.usecase.ts:80` — `serviceOrderProvider.user_id` acessado **sem** optional chaining. Se `createServiceOrder` engolir um erro internamente (linhas 446-461 do provider), o resultado é `undefined` e essa linha lança `TypeError: Cannot read properties of undefined (reading 'user_id')`.
- `create-follow-up.usecase.ts:48` — mesmo padrão com `serviceOrderProviderFollowUp.id`, sem nenhuma proteção. Agravante: o follow-up **já foi persistido no banco local** na linha 36, antes do crash — fica órfão (sem `followUpProviderId`), e o cliente recebe um 500 mesmo com o registro local já criado.
- Dentro do próprio provider, `glpi-service-order.provider.ts:366-384`: se `findUserByUserName` retorna `null` e `createUser` engolir erro (retornando `undefined`), a linha `id_user_provider = user.id` (384) lança `TypeError` **antes mesmo de entrar no `try/catch`** do método `createServiceOrder`.

Nenhum dos 5 use cases que chamam o provider (`create-service-order`, `create-follow-up`, `update-service-order-status`, `update-follow-up`, `update-service-order`) verifica `undefined`/falsy antes de acessar propriedades do retorno, nem envolve a chamada em `try/catch` próprio — todos confiam no tipo declarado, que a implementação não honra.

### 1.3 Divergência silenciosa entre estado local e GLPI (data desync)

Como o provider engole erros, os use cases de follow-up atualizam o registro local **e então** tentam propagar ao GLPI, sem checar o resultado:

- `create-follow-up.usecase.ts` — cria o follow-up local e só depois chama `addFollowUP`; se o GLPI falhar, o registro fica órfão (sem `followUpProviderId`). Ver 1.2.
- `update-follow-up.usecase.ts:22-29` — atualiza o follow-up local (linha 22) e só depois chama `updateFollowUP` (linha 25); se o GLPI falhar, o retorno do use case é sucesso mesmo assim.

Os demais fluxos **já** chamam o GLPI antes de persistir localmente, então não têm essa divergência: `create-service-order`, `update-service-order` (`assignUser`) e `update-service-order-status` (`updateStatus`). Neles, o risco é outro: falha parcial dentro do próprio provider. `createServiceOrder` e `assignUser` fazem mais de uma chamada ao GLPI em sequência (ex.: cria o ticket e depois associa o solicitante ou o patrimônio); se uma chamada posterior falha, o GLPI fica com um estado parcial e nada é gravado localmente.

Resultado possível em produção (follow-ups): follow-up editado no banco local enquanto o GLPI continua com o texto anterior, sem nenhum log ou sinal de que a sincronização falhou.

### 1.4 Tratamento de erro inconsistente dentro da mesma classe

`updateStatus()` (`glpi-service-order.provider.ts:167-205`) é o único método de escrita que **não tem `try/catch` nenhum** — deixa o erro do axios propagar cru. Todos os outros ~8 métodos engolem qualquer erro e retornam `undefined`. Não há como prever, olhando a interface pública da classe, qual comportamento esperar de qual método.

### 1.5 `getHeader()` nunca é usado

Método definido em `glpi-service-order.provider.ts:227-233`, mas nenhuma chamada HTTP da classe usa headers — todas passam `session_token`/`app_token` via `params` de query string. Código morto.

### 1.6 Métodos mortos (stubs comentados)

`findById` (464-473), `close` (476-482), `addRequester` (485-494) e `activeProfile` (315-325) têm o corpo real inteiro comentado e retornam `null`/`undefined` incondicionalmente — implementações "fantasma" da interface `ServiceOrderProvider`, que finge suportar essas operações mas nunca as executa.

### 1.7 Bug de shadowing de variável (encontrado durante a investigação, fora do mapeamento original)

`findComputerOrPrinterBySerialOrInventoryNumber` (`glpi-service-order.provider.ts:520-564`): dentro do bloco de fallback `if (!data)` (linhas 540-550), é declarado `const response = await axios.get(.../search/Printer, ...)`, escopado só a esse bloco `if`. O check final `if (response.status === 200 && filteredData.length > 0)` (linha 554), fora do bloco, referencia o `response` **externo** — o da busca por `Computer`, feita antes — não o da busca por `Printer` que efetivamente populou `data`/`filteredData` nesse caminho. Quando o ativo encontrado é uma impressora, o status HTTP validado é o de uma requisição diferente da que gerou o resultado.

### 1.8 Filtro de exceção global não cobre os crashes acima

`src/modules/exceptions/http-exception.filter.ts:10` usa `@Catch(HttpException)` — só captura `HttpException`. Os `TypeError`s descritos em 1.2 caem no handler default do Nest, com shape de resposta diferente do envelope padrão da API (`{statusCode, message, timestamp, path}`), dificultando observabilidade em produção. **Esse ponto já está mapeado, de forma mais ampla (para todo o projeto, não só GLPI), na RFC 0003.**

### 1.9 Ausência total de testes

Nenhum teste unitário cobre `GlpiServiceOrderProvider`. Confirmado: `test/test-helpers.ts` injeta `InMemoryServiceOrderProvider` em todo use case testado (linhas 168, 181, 596, 607, 658, 698, 709) — nunca `GlpiServiceOrderProvider`. Uma busca por `Glpi` em todo `**/*.spec.ts` do projeto não retorna nenhum arquivo. Não há sequer um padrão de mock de `axios` já estabelecido no projeto para modelar os testes desta classe.

### 1.10 Configuração via `process.env` direto

Investigado e **rebaixado** frente ao mapeamento original: `@nestjs/config` está no `package.json` como dependência, mas não há nenhuma ocorrência de `ConfigModule`/`ConfigService` em todo o `src`. `process.env` direto é o padrão de fato do projeto inteiro hoje (12 arquivos fazem o mesmo), não um desvio pontual desta classe. Ver seção 8.

## 2. Contexto

`GlpiServiceOrderProvider` é selecionado via `useClass` em `src/modules/servicebook/infra/providers/service-order/index.ts:5-14`, condicionado a `process.env.SERVICE_ORDER_PROVIDER === 'glpi'`. É `@Injectable()` sem escopo customizado, portanto singleton — `sessionToken` é estado de instância compartilhado entre todas as requisições da aplicação.

Essa RFC nasce de um mapeamento inicial (tratamento de erro, lifecycle de sessão, ausência de testes, código morto, config) feito manualmente durante revisão de código, seguido de uma investigação mais profunda que confirmou os cinco pontos originais e encontrou os itens 1.1 (gravidade maior do que o mapeamento original sugeria), 1.3, 1.4, 1.7 e 1.8 adicionalmente.

**RFC 0003 (`0003-camada-erro-app-error.md`, status Proposto) já documenta exatamente o problema do item 1.8** em escopo de projeto inteiro: introduzir uma hierarquia `AppError` desacoplada de HTTP, com o mapeamento para `HttpException` concentrado num único ponto na borda. Esta RFC 0007 é o caso concreto que motiva aplicar aquele padrão à camada de infraestrutura (providers de integração externa), não só à camada de aplicação (usecases) que a RFC 0003 cobre explicitamente.

## 3. Alternativas consideradas

### Alternativa A: Não fazer nada agora, só registrar como débito técnico
- Descrição: manter o comportamento atual, documentar os riscos e esperar até que um incidente real force a correção.
- Prós: zero esforço imediato, zero risco de regressão introduzida pela mudança.
- Contras: o risco do item 1.1 (derrubar o processo inteiro) já existe em produção hoje, independente de qualquer decisão de RFC — não é um risco hipotético futuro.

### Alternativa B: Patch pontual, isolado nesta classe
- Descrição: dentro do próprio `GlpiServiceOrderProvider`, envolver `initSession()` em `try/catch` com log e sem propagação fatal; fazer os métodos que hoje engolem erro relançarem uma exceção simples (`HttpException` genérica, ex. `BadGatewayException`) em vez de retornar `undefined`; corrigir o bug de shadowing (1.7); remover código morto (1.5, 1.6).
- Prós: resolve os riscos concretos rapidamente, sem depender de nenhuma outra decisão de arquitetura; escopo pequeno, fácil de revisar.
- Contras: não resolve a inconsistência de shape de erro do item 1.8 além do que o `HttpExceptionFilter` já cobre para `HttpException`; se a RFC 0003 for aceita depois, esta classe fica fora do padrão novo e precisa de um segundo patch de migração.

### Alternativa C: Alinhar com a RFC 0003 (camada `AppError`)
- Descrição: esperar a RFC 0003 ser aceita e, junto com a implementação dela, fazer o provider GLPI lançar tipos de `AppError` (ex. um caso `ExternalIntegrationError` ou similar) em vez de `HttpException` direto ou `undefined` silencioso.
- Prós: resolve o problema uma única vez, no padrão que o projeto já decidiu adotar para erro de domínio; evita generalizar `HttpException` na camada de infraestrutura, que a RFC 0003 já identifica como acoplamento indesejado.
- Contras: bloqueia a correção do risco crítico do item 1.1 (que não depende de `AppError` para ser corrigido) até a RFC 0003 ser aceita e implementada — acoplamento de urgências diferentes.

### Alternativa D: Reescrita completa da integração (cliente HTTP dedicado com interceptors, retry de sessão automático, fila de sincronização assíncrona para falhas do GLPI)
- Descrição: substituir as chamadas `axios` soltas por uma instância dedicada com interceptor de request (injeta `session_token`/`app_token`) e de response (detecta 401 e refaz `initSession` com retry/backoff antes de repetir a chamada original); desacoplar a criação de chamado/follow-up da disponibilidade imediata do GLPI via fila.
- Prós: resolve a causa raiz do lifecycle de sessão (não só o crash, mas também sessão expirada em uso normal) e dá resiliência a indisponibilidade temporária do GLPI sem impactar o usuário final.
- Contras: escopo bem maior, exige decisão de infraestrutura (fila) fora do controle desta RFC, e tempo de implementação incompatível com a urgência do item 1.1.

## 4. Decisão

Combinar B (curto prazo, urgente) com C (destino final), tratando D como follow-up de escopo maior:

1. **Imediato, independente de qualquer outra RFC:** corrigir o lifecycle de `initSession()` (1.1) — `try/catch` interno, e substituir a chamada solta no construtor por um hook de lifecycle do Nest (`OnModuleInit`) aguardado corretamente. Esse ponto não depende de nenhuma decisão de padrão de erro, é uma correção de robustez isolada.
2. **Curto prazo:** fazer os métodos do provider pararem de engolir erro e retornar `undefined` — relançando o erro original ou uma exceção específica (`BadGatewayException` como medida provisória, já que é uma `HttpException` reconhecida pelo `HttpExceptionFilter` atual). Isso já resolve 1.2 e 1.4 sem esperar a RFC 0003 (o 1.3 depende também do passo 5).
3. **Quando a RFC 0003 for aceita:** migrar esse tratamento provisório para o tipo de `AppError` que ela definir, evitando duas versões divergentes de "como um provider de infraestrutura sinaliza falha".
4. Corrigir o bug de shadowing (1.7) e remover código morto (1.5, 1.6) junto do passo 2, por serem mudanças pequenas e de baixo risco no mesmo arquivo. Os stubs `findById`, `close` e `addRequester` foram removidos da interface `ServiceOrderProvider` e das duas implementações, por decisão do autor: nenhum código os chamava, e uma implementação futura deve ser reescrita quando houver necessidade.
5. Inverter a ordem nos use cases de follow-up (1.3): chamar o GLPI antes de persistir localmente, como os demais fluxos já fazem. Assim uma falha do GLPI não deixa registro órfão nem divergência.
6. Escrever testes unitários (1.9) cobrindo os caminhos de erro corrigidos, com mock de `axios` — não existe padrão prévio no projeto para isso, esta seria a primeira referência.
7. Alternativa D fica registrada como possível RFC futura, não como parte do escopo desta. A RFC 0014 (fila BullMQ/Redis para e-mail) cria a infraestrutura de fila que essa RFC futura poderia reaproveitar, o que reduz a objeção de infraestrutura da Alternativa D; permanecem em aberto a decisão de produto e o estado "pendente de sincronização" (ver seção 7).
8. Item 1.10 (config) não entra no escopo desta RFC — é um padrão de projeto inteiro, não específico do GLPI (ver seção 8).

## 5. Precedente no projeto

Não há precedente de tratamento de erro de provider de integração externa no projeto — `GlpiServiceOrderProvider` é a única classe desse tipo (`InMemoryServiceOrderProvider`, a outra implementação de `ServiceOrderProvider`, não faz I/O externo, então não enfrenta os mesmos problemas).

O único precedente relevante é a própria RFC 0003 (`docs/rfcs/0003-camada-erro-app-error.md`), que documenta o problema equivalente na camada de aplicação (usecases lançando `HttpException` direto, erro de banco tratado ad-hoc) e já está com status "Proposto" — ainda não aceita nem implementada.

`src/modules/exceptions/http-exception.filter.ts` é o único ponto centralizado de erro hoje, e cobre apenas `HttpException`.

## 6. Consequências

### 6.1 Positivas

- Falha de integração com o GLPI deixa de poder derrubar o processo inteiro da API.
- Falha de integração com o GLPI deixa de "sumir": usecases que hoje retornam sucesso mesmo com o GLPI fora do ar passam a refletir a falha na resposta.
- Estado local e GLPI deixam de poder divergir silenciosamente (chamado "fechado" localmente com o ticket ainda aberto no GLPI, por exemplo).
- Abre caminho para testes automatizados, hoje inexistentes para esta classe.
- Remove ambiguidade de comportamento entre métodos da mesma classe (item 1.4).

### 6.2 Negativas / trade-offs aceitos

- **Mudança de comportamento observável pelo front:** operações que hoje retornam sucesso (200) mesmo com o GLPI indisponível (por exemplo, criar um follow-up que não chega a ser sincronizado) passam a retornar erro nesses cenários. Isso é uma correção de um bug de confiabilidade, não uma feature nova, mas é um comportamento novo que o front vai observar e precisa saber tratar (ex.: exibir mensagem de "chamado criado localmente, mas sincronização com GLPI falhou" vs. um erro genérico).
- Usar `BadGatewayException` como medida provisória (passo 2) cria uma dependência de migração futura para a RFC 0003, que precisa ser rastreada para não virar débito esquecido.
- Nenhuma correção aqui resolve indisponibilidade temporária do GLPI de forma transparente para o usuário (isso é escopo da Alternativa D, não desta RFC) — durante uma instabilidade do GLPI, operações que dependem dele continuarão falhando de forma visível, só que agora de forma correta/sinalizada em vez de silenciosa ou fatal.

## 7. Riscos e perguntas em aberto

- **Classificação de impacto e janela de aviso desta RFC são sugestão, não decisão fechada** — marquei "Afeta consumo do front" porque cenários que hoje retornam 200 passam a retornar erro, mas não tenho visibilidade se o time de front já lida com isso de alguma forma (retry, ignorar campo ausente) que tornaria o impacto real menor do que pareço estimar aqui. Quem revisar deve confirmar a categoria.
- **Comportamento correto durante indisponibilidade do GLPI ainda não está decidido** (a abordagem de manter o registro local como fonte de verdade e sincronizar depois exigiria também um estado "pendente de sincronização" visível ao front, e depende da infraestrutura de fila da RFC 0014): falhar a requisição inteira (o que esta RFC propõe como passo imediato) vs. aceitar a operação localmente e sincronizar depois de forma assíncrona (Alternativa D) é uma decisão de produto, não só técnica — afeta diretamente a experiência de quem abre um chamado quando o GLPI está fora do ar.
- **Dependência de timing com a RFC 0003:** se a RFC 0003 for aceita com um design de `AppError` muito diferente do que se antecipa aqui (ver riscos abertos nela mesma, item 3 "design interno do AppError não decidido"), o passo 3 desta RFC (migração) pode precisar de retrabalho.
- **Não foi possível confirmar em produção se o bug de shadowing (1.7) já causou associação incorreta de patrimônio a chamados** — a investigação foi só de leitura de código, sem acesso a logs históricos ou dados já gravados no GLPI/banco para validar se o impacto prático já aconteceu ou é só um risco latente.
- **Não há contexto histórico sobre por que os métodos mortos (1.5, 1.6) foram deixados como stubs comentados** em vez de removidos — podem ser um sinal de migração incompleta e planejada (ex.: alguém pretendia voltar a implementar `findById`/`close`/`addRequester` via GLPI) ou simplesmente lixo esquecido. Vale confirmar com quem escreveu antes de remover, para não apagar uma intenção futura registrada.
- **Estratégia de retry/backoff para sessão expirada (401 em uso normal, fora do escopo do crash do item 1.1) não está definida nesta RFC** — fica para quando a Alternativa D for avaliada, se for.

## 8. Escopo de aplicação futura

O padrão de "provider de integração externa deve relançar erro (nunca engolir e retornar `undefined`) e não deve rodar lifecycle assíncrono sem tratamento de erro no construtor" deveria valer para qualquer integração externa futura do projeto, não só o GLPI — hoje é a única desse tipo, mas a decisão de arquitetura (item 4, passos 1-3) é genérica o suficiente para ser reaproveitada.

O item 1.10 (config via `process.env`) fica **fora do escopo de aplicação futura desta RFC**: é um padrão do projeto inteiro (12 arquivos, nenhum uso de `ConfigService` em lugar nenhum), não algo específico de providers de integração externa. Migrar para `ConfigService` — se decidido — mereceria uma RFC própria de escopo maior, não uma decisão amarrada à correção do GLPI.

---

*Este RFC segue o modelo de "lazy consensus" para a parte sem impacto externo (itens 1.1, 1.4, 1.5, 1.6, 1.7, 1.9): a decisão entra em vigor ao final da janela de aviso indicada acima, salvo objeção registrada no Pull Request antes desse prazo. A parte com impacto no front (item 1.2/1.3, mudança de comportamento em cenário de falha) exige confirmação ativa antes de prosseguir, conforme tabela do Passo 3 do guia de fluxo.*
