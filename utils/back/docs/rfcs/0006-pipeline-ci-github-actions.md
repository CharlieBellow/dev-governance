# RFC 0006: Pipeline de CI (build, lint, testes) via GitHub Actions

| Campo | Valor |
|---|---|
| **Status** | Proposto |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-09-08 |
| **Módulo(s) afetado(s)** | Infraestrutura de CI (workflow GitHub Actions e secrets do repositório); toda a suíte de testes (unit + integração); lint (ESLint); build (Nest/TypeScript); configuração de ambiente (`.env.example` / `ConfigModule`); versionamento de Node (`Dockerfile`, `package.json`) |
| **Categoria de impacto** | ( ) Interno, sem impacto externo &nbsp;&nbsp; ( ) Afeta consumo do front &nbsp;&nbsp; ( ) Quebra contrato existente com o front &nbsp;&nbsp; (x) Requer infraestrutura nova — **sugestão, não decisão minha**: workflow do GitHub Actions e os secrets associados são um recurso novo do repositório; ver seção 7 sobre quem tem autoridade para aprovar |
| **Janela de aviso aplicada** | Sugerida: sem prazo curto fixo — aguarda aprovação ativa de quem detém autoridade sobre a infraestrutura de CI/secrets do repositório, conforme a linha "Envolve infraestrutura nova" do guia de fluxo (não decidido por mim) |
| **Confirmação ativa recebida de** | *(em branco até a resposta chegar)* |
| **Pessoas marcadas no PR** | *(em branco — quem abrir o PR decide)* |

---

## 1. Problema

A [RFC 0004](0004-reconciliacao-master-dev-e-promocao-a-main.md) foi implementada por completo — `dev` foi promovida a `main` e é hoje a única branch de longa duração (confirmado: `git merge-base --is-ancestor origin/dev main` retorna verdadeiro). A própria RFC 0004, na seção 7, registrou como pendência separada: "Implementar CI provavelmente é uma tarefa à parte... Esse estudo não foi feito nesta análise; tratar como issue separada, não como pré-requisito bloqueante do cutover". Esta RFC é esse estudo.

O levantamento feito contra a `main` limpa (sem nenhuma mudança minha) mostra que **ligar um pipeline de CI hoje, sem preparação, deixaria o primeiro run vermelho por motivos que não têm relação com nenhum PR novo** — o que destrói a confiança no sinal do CI antes mesmo dele começar a valer. Cinco lacunas concretas, detalhadas na seção 2, precisam de decisão antes de definir o workflow: testes que já falham hoje, lint com débito acumulado, inventário de variáveis de ambiente incompleto, versão do Node sem fonte única de verdade, e o requisito de Docker para os testes de integração via testcontainers.

## 2. Contexto

Levantamento feito contra `main` limpa nesta análise (sem alterações no código):

### 2.1 Testes que já falham hoje

- **`update-person.spec.ts`**: erro de compilação TypeScript pré-existente (`idUserProvider` faltando no payload) — quebra tanto um eventual gate de `tsc --noEmit` quanto a própria suíte no Jest, já que o Jest não roda o arquivo se ele não compila.
- **`account.integration.spec.ts`**: 11 asserções falhando hoje — contagem de roles incorreta, rotas de ACL retornando 404, delete de usuário retornando 500. Confirmado rodando contra a `main` limpa, sem nenhuma mudança minha.
- **`service_order_status_enum` do Postgres dessincronizado do enum TS** — falta o valor `'Atribuído'` no lado do banco. Causa falha **aleatória em ~14% das execuções** da suíte de integração do Service Book, porque `ServiceOrderFactory` sorteia o status aleatoriamente e às vezes sorteia esse valor.
- **"Connection terminated" no teardown** dos testes do módulo Service Book — depois de todos os testes individuais passarem, sobra um erro no teardown que faz o Jest reportar a suíte como "failed to run". Isso pode fazer o exit code do Jest vir não-zero mesmo com 100% dos testes verdes, dependendo de como o step de CI interpreta o resultado — ou seja, um gate de CI mal configurado nesse ponto pode bloquear PRs bons por um problema de infraestrutura de teste, não de código.

### 2.2 Lint

391 problemas reportados pelo ESLint na `main` limpa (166 auto-corrigíveis com `--fix`). Um gate de lint bloqueante ligado sem preparo quebra imediatamente em qualquer PR, mesmo um que não toque nos arquivos com erro pré-existente.

### 2.3 Inventário de variáveis de ambiente incompleto

`.env.example` documenta 5 variáveis (`DATABASE_*`, `SERVICE_PROVIDER_*`), mas o código usa 21 (`AWS_*`, `ELASTICSEARCH_*`, `MAIL_PROVIDER`, `STORAGE`, `APP_API_URL`, `FORGOT_MAIL_URL`, `LOG_INTEGRATION`, `NODE_ENV`, entre outras) — sem nenhuma validação de schema (nenhuma ocorrência de Joi ou class-validator no `ConfigModule`). Isso importa para o CI porque não dá para saber com certeza quais secrets injetar no workflow sem grepar o código inteiro a cada mudança.

### 2.4 Versão do Node não fixada fora do Dockerfile

`yarn` já está pinado (`packageManager: yarn@4.9.2` no `package.json` + `.yarnrc.yml`), mas a versão do Node só aparece hardcoded no `Dockerfile` (`node:22-alpine`) — não existe `.nvmrc` nem campo `engines` no `package.json`. Sem uma fonte única, o workflow de CI precisaria hardcodar a versão de novo, duplicando a informação (risco real de dessincronizar se o `Dockerfile` mudar e ninguém lembrar de atualizar o workflow também).

### 2.5 Requisito de Docker para os testes de integração

Os testes de integração sobem um Postgres efêmero via testcontainers (`@testcontainers/postgresql`) — não é necessário um serviço Postgres separado declarado no workflow, mas o runner precisa de acesso ao socket do Docker (disponível out-of-the-box em runner hospedado `ubuntu-latest` do GitHub Actions). Também é necessário rodar `nest build` antes do step de teste de integração, porque as migrations são carregadas de `dist/src/shared/infra/typeorm/migrations/*.js`, não do TypeScript fonte — se o step de build for pulado ou vier depois do step de teste, as migrations não são encontradas.

## 3. Alternativas consideradas

### Alternativa A: Ligar o pipeline completo e bloqueante imediatamente, do jeito que o código está hoje
- Ativar `tsc --noEmit`, ESLint e Jest (unit + integração) como gates bloqueantes já na primeira versão do workflow.
- Prós: zero trabalho de preparação antes de começar.
- Contras: quebra no primeiro run por motivos alheios a qualquer PR novo (seção 2.1 e 2.2) — o time perde confiança no sinal do CI antes dele começar a valer, e provavelmente reage desligando o gate inteiro em vez de investigar, o que joga fora o propósito de ter CI.

### Alternativa B: Resolver 100% do débito pré-existente antes de ligar qualquer gate
- Corrigir os 4 problemas de teste, zerar os 391 problemas de lint, completar `.env.example`, pinar o Node — só depois disso, ligar o workflow.
- Prós: primeiro run já nasce limpo e bloqueante, sem ressalva.
- Contras: sem prazo definido para "zerar 391 problemas de lint" nem para investigar a causa raiz do "Connection terminated" (que ainda não foi diagnosticada — ver seção 7); na prática, adia o CI indefinidamente por um débito que só cresce enquanto isso, que é exatamente o tipo de problema que CI existe para conter.

### Alternativa C: Rollout faseado — separar "bugs reais" de "política de gate", tratar cada um pelo custo/risco individual (escolhida)
- Descrita na seção 4.
- Prós: liga o CI rapidamente para pegar regressão em PRs novos, sem esperar o débito zerar; trata cada uma das 5 lacunas pelo seu risco real em vez de uma regra única para tudo.
- Contras: exige mais decisões (uma por lacuna, seção 4) em vez de uma regra simples; alguns gates nascem em modo não-bloqueante e dependem de disciplina do time para apertar depois — risco de nunca apertar, ver seção 7.

## 4. Decisão

Alternativa C. Trato as 5 lacunas do levantamento (seção 2) separadamente, porque misturam duas naturezas diferentes: **bugs reais** (que existiriam com ou sem CI) e **decisões de política de gate** (que só existem por causa do CI).

O critério usado para separar bloqueante de não-bloqueante tem duas partes: **(a) mecânico** — sem isso o workflow não roda de forma correta ou dá sinal falso já no primeiro run, para qualquer PR, independente de conteúdo; **(b) risco real** — mesmo que o gate pudesse rodar contornando o item (ex.: via quarantine), o item em si já é um bug com risco de produção, não só um problema de sinal de CI, e por isso entra como pré-requisito de qualquer forma. Não-bloqueante = nem (a) nem (b) se aplicam — existe um jeito de ligar o gate correspondente hoje, com a ressalva registrada, sem esperar o item ser resolvido.

| # | Item | Bloqueante? | Por quê |
|---|---|---|---|
| 1 | `update-person.spec.ts` — erro de compilação TS | **Sim (a)** | `tsc --noEmit` falha sempre, em qualquer PR, até esse payload ser corrigido |
| 2 | `service_order_status_enum` dessincronizado (falta `'Atribuído'`) | **Sim (a)** | Sem a migration, ~14% dos runs de integração falham por sorte do factory, não por causa do PR |
| 3 | `.env.example` completo (21 variáveis) | **Sim (a)** | Não é sobre o pipeline rodar, é sobre poder configurar os secrets do workflow com confiança — sem a lista completa, a configuração inicial vira tentativa-e-erro |
| 4 | Ordem `install → build → test` no workflow (migrations vêm de `dist/`) | **Sim (a)** | Não é débito a corrigir, é requisito de design do workflow em si — pular isso quebra a suíte de integração sempre, estruturalmente |
| 5 | `account.integration.spec.ts` (11 asserções falhando) | **Sim (b)** | Contagem de roles errada, rotas de ACL em 404 e delete de usuário retornando 500 não são sintoma de teste frágil — são comportamento de produção potencialmente quebrado hoje. Tratar como quarantine só escondia o sinal do bug atrás do CI; entra como pré-requisito de correção, não de gate |
| 6 | "Connection terminated" no teardown (Service Book) | Não | Gate de integração liga, mas como não-bloqueante (report-only) até a causa raiz ser diagnosticada (seção 7) — diferente do item 5, aqui o sintoma é de infraestrutura de teste (conexão não fechada), não de comportamento de domínio incorreto |
| 7 | Lint — 391 problemas legados | Não | Gate liga bloqueante desde já, mas escopado ao diff (seção 4.2) — débito legado não impede nenhum PR novo |
| 8 | `.nvmrc` / `engines.node` | Não | Recomendado (evita duplicar a versão do Node entre `Dockerfile` e workflow), mas o workflow funciona sem isso — pode hardcodar a versão no YAML como alternativa temporária |
| 9 | Validação de schema de env vars (Joi/class-validator) | Não | Fora de escopo desta RFC — decisão de padrão à parte, não afeta se o CI liga ou não |
| 10 | Migração ESLint 8 → 9 (flat config) — achado à parte, ver nota abaixo | Não | ESLint 8 ainda funciona hoje; é dívida técnica que se sobrepõe com o trabalho de lint desta RFC, mas não impede ligar o gate agora |

Itens 1–5 são pré-requisito de merge antes de qualquer gate ser ligado como bloqueante. Itens 6–10 podem — e devem — ser tratados em paralelo ao workflow já rodando, sem travar a entrada em vigor desta RFC.

**Consequência direta de mover o item 5 para bloqueante:** diferente dos itens 1, 2 e 4 (fixes pequenos e de escopo conhecido), o esforço para corrigir `account.integration.spec.ts` é desconhecido — pode ser 1 causa raiz ou 3 problemas independentes (ver seção 7). Isso significa que o cronograma de adoção do CI passa a depender de investigar e corrigir esse bug, não só de escrever o workflow. Aceito esse acoplamento deliberadamente aqui porque o risco de produção pesa mais que a velocidade de adoção do CI — mas é uma escolha que quem revisar pode discordar, sinalizada explicitamente em vez de decidida em silêncio.

### 4.1 Testes que já falham hoje (seção 2.1) — corrigir antes de ligar o gate, não contornar

Estes são bugs reais, não debate de política — silenciá-los no CI só esconderia o sintoma:
- **`update-person.spec.ts`**: corrigir o payload do teste (adicionar `idUserProvider`) antes de ligar o gate de `tsc --noEmit`. É um fix pequeno e isolado.
- **`service_order_status_enum` dessincronizado**: gerar uma migration adicionando `'Atribuído'` ao enum do Postgres. Prioridade alta — hoje esse bug já pode afetar produção de forma silenciosa (o enum do banco não aceitar um valor válido do domínio), CI só tornou o sintoma visível como flake de 14%.
- **"Connection terminated" no teardown**: causa raiz ainda não diagnosticada (ver seção 7) — precisa de investigação antes de decidir entre corrigir o fechamento da conexão do testcontainers ou ajustar como o step de CI interpreta o exit code do Jest. Enquanto não houver diagnóstico, **não ligar o gate de integração como bloqueante** — um exit code não-confiável bloquear PRs bons é pior do que não ter o gate. Esse é o único item de teste tratado como não-bloqueante, porque o sintoma é de infraestrutura de teste, não de comportamento de domínio incorreto.
- **`account.integration.spec.ts`** (11 asserções falhando): **tratado como bloqueante, não como quarantine.** Contagem de roles errada, rotas de ACL retornando 404 e delete de usuário retornando 500 não são sinais de teste frágil — são indício de comportamento de produção quebrado (autorização e exclusão de usuário são superfícies sensíveis). Pular a suíte com `.skip` esconderia esse sinal atrás do CI em vez de forçar a correção; por isso entra como pré-requisito de merge, junto aos itens 1, 2 e 4, mesmo com o escopo do fix ainda não mapeado (pode ser 1 causa raiz ou 3 problemas independentes — ver seção 7). Isso significa que o cronograma de habilitação do CI passa a depender da investigação desse bug.

### 4.2 Lint (seção 2.2) — gate bloqueante escopado ao diff, não ao repositório inteiro

Rodar `eslint --fix` para os 166 problemas auto-corrigíveis como um PR de limpeza único e isolado (não misturado com nenhuma mudança funcional). Para os problemas restantes (~225, não auto-corrigíveis), o gate de CI roda lint **apenas nos arquivos alterados pelo PR** (ex.: via `eslint` com lista de arquivos do diff contra `main`), bloqueante desde o primeiro dia — assim PRs novos não podem introduzir lint novo, mas também não são bloqueados pelo débito legado que não tocaram. O débito legado fica registrado como item de backlog à parte, sem prazo fixo neste RFC.

**Nota à parte, não-bloqueante:** `eslint` está pinado em `^8.42.0` no `package.json` (`eslint-config-prettier`, `eslint-plugin-prettier` e `eslint-plugin-unused-imports` são plugins dessa major) — o ESLint 8 já é EOL. A migração para o ESLint 9 troca o formato de configuração (`.eslintrc` → `eslint.config.js`, flat config) e não é mecânica na maioria dos projetos. Não bloqueia ligar o gate desta RFC — o 8.x roda normalmente hoje — mas como o workflow de CI está sendo desenhado agora, faz sentido decidir *já* se ele nasce assumindo o formato atual (`.eslintrc`) ou se a migração para o formato novo entra antes, para não acoplar o step de lint do workflow numa config que sabemos que vai trocar em breve. Fica registrado como pendência a decidir, não como escopo desta RFC.

### 4.3 Inventário de variáveis de ambiente (seção 2.3) — resolvido: `.env.example` mantido em 9, as outras 12 documentadas à parte (issue #108)

**Atualização — item concluído.** A investigação (feita antes de mexer no arquivo, sem alterar código) confirmou as 21 variáveis lidas via `process.env.*` em `src/`, mas revelou que a premissa original desta seção — "completar `.env.example` com as 21" — não era o caminho certo. Das 21, apenas **9** correspondem ao que a aplicação realmente usa hoje: são exatamente as variáveis que `docker-compose.yaml` (produção) passa para o container da API (`DATABASE_*` ×5, `SERVICE_PROVIDER_*`/`SERVICE_ORDER_PROVIDER` ×4) — e são as mesmas 9 que já estavam documentadas no `.env.example`.

As outras 12 não são "falta de documentação" — são três situações distintas, cada uma com causa raiz própria:
- **Boilerplate nunca usado nesta organização** (`AWS_BUCKET`, `AWS_BUCKET_REGION`, `AWS_REGION`): `S3StorageProvider` e `SESMailProvider`, as únicas implementações que leem essas variáveis, entraram no commit inicial do repositório vindas de um projeto pessoal anterior do mesmo autor (evidência: email hardcoded de outro domínio em `SESMailProvider`, nunca modificado desde então; nenhum `docker-compose` deste repo jamais ativa esses branches; e mesmo que alguém ativasse, faltam as credenciais AWS que o código nunca leu).
- **Iniciativa real de observabilidade, nunca conectada ao deploy** (`ELASTICSEARCH_URL`, `ELASTICSEARCH_USERNAME`, `ELASTICSEARCH_PASSWORD`, e por extensão `LOG_INTEGRATION`): existe um stack dedicado de Elasticsearch/Kibana/Grafana (`observabilidade/docker-compose.yaml`), commitado com contexto de trabalho — mas o `docker-compose.yaml` de produção nunca repassa essas variáveis pro container da API, então a aplicação nunca teve como enviar log pra lá.
- **Lacuna real de produto, não de infraestrutura de CI** (`MAIL_PROVIDER`, `FORGOT_MAIL_URL`, `APP_API_URL`): o provider de email ativo em produção hoje é o in-memory (não envia nada), e `AWS_BUCKET_URL`/`APP_API_URL` são inalcançáveis por um bug de digitação em `avatar_url()` (`user.entity.ts`) que compara contra uma variável errada. Fora de escopo desta RFC — é comportamento de aplicação, não do pipeline.

**Decisão:** `.env.example` permanece com as 9 variáveis reais, sem alteração — já reflete com precisão o que o workflow de CI precisa para configurar secrets com confiança, que era o objetivo original desta seção. O levantamento completo das outras 12 (com file/linha de cada evidência) foi registrado separadamente, fora deste repositório, rastreado pela **issue #108** (documentação). Sinalizado aqui para não virar decisão implícita: diverge do texto original desta seção ("completar com as 21"), mas atinge o mesmo objetivo de fundo por um caminho mais preciso.

Adicionar validação de schema (Joi ou class-validator no `ConfigModule`) continua fora de escopo desta RFC — decisão de padrão à parte, registrada como possível RFC futura.

### 4.4 Versão do Node (seção 2.4) — `.nvmrc` como fonte única de verdade

Criar `.nvmrc` na raiz do repositório com `22` (mesma versão do `Dockerfile` hoje). O workflow do GitHub Actions usa `actions/setup-node` com `node-version-file: .nvmrc` (suporte nativo, sem duplicar a versão no YAML). Adicionar também `engines.node` no `package.json` como sinalização para quem rodar `yarn install` localmente com Node incompatível. O `Dockerfile` continua com a versão hardcoded por enquanto (mudar o `Dockerfile` para ler de `.nvmrc` em build time é possível, mas é uma mudança separada, de menor prioridade — o ponto central aqui é o CI não duplicar a fonte de verdade, não migrar o Dockerfile).

### 4.5 Docker para testes de integração (seção 2.5) — sem serviço Postgres separado no workflow

Runner `ubuntu-latest` hospedado pelo GitHub Actions, sem necessidade de declarar um serviço Postgres no workflow (testcontainers sobe o próprio Postgres efêmero via socket do Docker, disponível nativamente nesse runner). O job de CI precisa rodar `yarn build` (`nest build`) **antes** do step de teste de integração, na mesma ordem: install → build → unit tests → integration tests — porque as migrations são carregadas de `dist/`, não do TypeScript fonte.

### 4.6 Provider de service order nos testes — nunca o GLPI real, sem secrets do GLPI no workflow

**Achado ao desenhar o workflow, registrado por segurança.** A seleção de qual `ServiceOrderProvider` a aplicação usa é puramente `process.env.SERVICE_ORDER_PROVIDER ?? 'inmemory'` (`src/modules/servicebook/infra/providers/service-order/index.ts`) — não existe nenhum override automático baseado em ambiente de teste (`NODE_ENV` ou equivalente) que force o provider in-memory durante `jest`. Os testes de integração (`setupTestApp` → `TestAppModule`) importam o `ServiceBookModule` real, com essa mesma resolução de DI. Ou seja: se o workflow de CI setasse `SERVICE_ORDER_PROVIDER=glpi`, o `GlpiServiceOrderProvider` real seria instanciado durante os testes, e chamadas HTTP reais para o GLPI de produção (`SERVICE_PROVIDER_URL`) aconteceriam a partir do runner do GitHub Actions.

**Decisão:** o job de CI fixa `SERVICE_ORDER_PROVIDER: inmemory` como valor hardcoded no `env:` do workflow — não copiado do `docker-compose.yaml` de produção nem vindo de secret — precisamente para que nunca instancie o provider real. Consequência direta: `SERVICE_PROVIDER_URL`, `SERVICE_PROVIDER_USER_TOKEN` e `SERVICE_PROVIDER_APP_TOKEN` **não precisam existir como secrets do GitHub Actions** — o CI nunca os lê, porque o `GlpiServiceOrderProvider` nunca é instanciado no pipeline.

Há precedente direto no próprio repositório: `.env.docker` já fixa `SERVICE_ORDER_PROVIDER="inmemory"` para o ambiente dockerizado, pelo mesmo motivo (evitar que o ambiente de desenvolvimento/teste grave no GLPI real). Esta seção estende a mesma decisão, de forma explícita, para o CI.

## 5. Precedente no projeto

- [RFC 0004](0004-reconciliacao-master-dev-e-promocao-a-main.md), seção 7: já registrou CI como pendência separada desta análise ("Implementar CI provavelmente é uma tarefa à parte... tratar como issue separada"). Esta RFC é essa tarefa.
- Fixação de versão de dependência já é prática estabelecida no projeto: `packageManager: yarn@4.9.2` no `package.json` + `.yarnrc.yml` fixam o Yarn. A decisão da seção 4.4 estende o mesmo princípio (fonte única de verdade para versão de ferramenta) para o Node, que hoje só está fixado dentro do `Dockerfile`.
- Não há precedente direto de workflow de CI neste projeto — é a primeira vez que um pipeline automatizado é proposto. As decisões sobre gate bloqueante vs. não-bloqueante (seção 4.1, 4.2) se apoiam no levantamento empírico desta análise (contagens de falhas rodadas contra `main` limpa), não em prática de mercado genérica.

## 6. Consequências

### 6.1 Positivas

- PRs novos passam a ter sinal automatizado de compilação, lint (nos arquivos tocados) e teste, sem esperar o débito legado inteiro ser zerado primeiro.
- Dois bugs reais de produção (enum do Postgres dessincronizado, payload de teste desatualizado) são corrigidos como efeito direto de preparar o CI, não só o pipeline em si.
- Fonte única de verdade para versão do Node (`.nvmrc`) elimina um ponto de dessincronia futura entre `Dockerfile` e workflow de CI.
- `.env.example` completo reduz o tempo de configurar secrets do workflow de "grepar o código inteiro" para "copiar do arquivo".

### 6.2 Negativas / trade-offs aceitos

- Tratar `account.integration.spec.ts` como bloqueante (seção 4.1) acopla o cronograma de habilitação do CI a um esforço de correção ainda não estimado — diferente dos outros itens bloqueantes (1, 2 e 4), que são fixes pequenos e de escopo conhecido, esse pode ser 1 causa raiz ou 3 problemas independentes (seção 7). Aceito esse trade-off porque o risco de produção (autorização, exclusão de usuário) pesa mais que a velocidade de adoção do CI — mas é o item que mais pode atrasar a entrada em vigor desta RFC.
- Lint escopado ao diff (seção 4.2) significa que o repositório como um todo continua com os ~225 problemas não auto-corrigíveis por tempo indeterminado — um arquivo só fica limpo quando alguém o toca por outro motivo, não há push ativo para zerar o backlog.
- Gate de teste de integração começa sem ser totalmente bloqueante enquanto a causa do "Connection terminated" não for diagnosticada (seção 4.1) — ou seja, o CI nasce com uma lacuna de cobertura conhecida no dia 1, não 100% do que se esperaria de um pipeline maduro.
- CD continua fora de escopo (confirmado como pendência separada já na RFC 0004, seção 6.2 — acesso à infra de deploy local segue indisponível). Esta RFC cobre só CI.

## 7. Riscos e perguntas em aberto

- **Causa raiz do "Connection terminated" no teardown do Service Book não foi diagnosticada nesta análise.** Pode ser o testcontainers fechando o container antes do pool de conexões do TypeORM finalizar, um problema de ordem de `afterAll`, ou outra coisa — sem esse diagnóstico, não dá para escolher entre "corrigir o fechamento" e "ajustar como o CI interpreta o exit code do Jest" com segurança. Tratar como spike antes de fechar a seção 4.1 definitivamente.
- **Escopo real das 11 asserções falhando em `account.integration.spec.ts` não foi investigado a fundo** — não sei se é 1 causa raiz (ex.: uma migration de seed desatualizada afetando contagem de roles e rotas de ACL) ou 3 problemas independentes. Como esse item virou pré-requisito bloqueante (seção 4), esse é o risco de maior impacto no cronograma desta RFC: sem estimativa de esforço, não dá para dizer se a habilitação do CI é questão de dias ou de semanas. Recomendo tratar como spike de investigação com prioridade imediata, separado da issue de tracking, justamente para reduzir essa incerteza antes de comprometer um prazo.
- **Quem tem autoridade para aprovar a infraestrutura nova (workflow + secrets do GitHub Actions) não está definido nesta RFC** — sinalizado na tabela do topo como categoria "Requer infraestrutura nova", mas não decidi isso sozinho (regra do `docs/README.md`); precisa de confirmação de quem revisar.
- **Risco de o débito legado de lint nunca ser zerado** com o escopo por diff da seção 4.2 — a decisão aceita esse trade-off deliberadamente (ver 6.2), mas não há um plano concreto de quando ou como revisitar isso; fica como ponto em aberto genuíno, não uma objeção já respondida.
- **Lista de 21 variáveis de ambiente foi levantada por grep nesta análise, não re-verificada de forma independente nesta RFC** — recomendo confirmar a lista exata no momento da implementação do `.env.example`, já que uma variável usada apenas condicionalmente (ex.: atrás de um feature flag) pode ter passado despercebida.
- **Runner assumido como `ubuntu-latest` hospedado pelo GitHub** (seção 4.5) — não confirmado com quem tem visibilidade da infraestrutura de CI se esse é de fato o runner-alvo, ou se há preferência por self-hosted por outro motivo (custo, rede interna). Se for self-hosted, a premissa de "Docker disponível out-of-the-box" da seção 2.5 precisa ser reavaliada.
- **Dependências do projeto estão desatualizadas de forma mais ampla que só o ESLint** (ex.: `@nestjs/*` em major 10, `typeorm` em `0.3.x`) — não levantado a fundo nesta RFC, tratado como fora de escopo (upgrade de dependência é decisão própria, com risco de breaking change, não uma preparação de CI). Registrado aqui só para não se perder: o achado do ESLint 8 EOL (seção 4.2) é o único ponto de sobreposição direta com o trabalho desta RFC; o resto fica para uma RFC separada, se e quando for priorizada.

## 8. Escopo de aplicação futura

Esta decisão estabelece o padrão permanente para o pipeline de CI do repositório, não uma configuração pontual:
- Todo PR para `main` passa pelos gates definidos na seção 4 (compilação, lint escopado ao diff, testes unitários, testes de integração conforme o diagnóstico da seção 7 permitir tornar bloqueante) antes de merge — isso estende a exigência de "feature branch + PR de auditoria, sem exceção" já formalizada na RFC 0004.
- Qualquer nova falha do tipo "pré-existente, não relacionada ao PR" que aparecer no futuro segue o mesmo critério desta RFC: bug real corrige-se antes de virar gate, decisão de política de gate (bloqueante vs. escopado vs. quarantine) fica registrada explicitamente em vez de silenciosamente contornada — não se emenda o pipeline para "passar" sem registrar o motivo.
- `.nvmrc` passa a ser a fonte única de verdade para a versão do Node consumida por ferramentas de automação (CI hoje; `Dockerfile` fica como possível migração futura, fora de escopo aqui).
- `.env.example` deve ser mantido atualizado como parte de qualquer mudança que introduza uma variável de ambiente nova — critério que vale para qualquer módulo, não só os tocados nesta análise.

---

*Este RFC segue o modelo de "lazy consensus": a decisão entra em vigor ao final da janela de aviso indicada acima, salvo objeção registrada no Pull Request antes desse prazo — **com a ressalva já registrada no topo**: por ser categorizada como infraestrutura nova, a janela sugerida não é lazy consensus, é aprovação ativa de quem detém autoridade sobre o recurso, conforme o guia de fluxo.*
