# RFC 0014: Provider de email via SMTP (Gmail) com fila BullMQ/Redis, avisos e grupos de email

| Campo | Valor |
|---|---|
| **Status** | Proposto |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-10-08 |
| **Módulo(s) afetado(s)** | `src/shared/container/providers/MailProvider/` (reescrita); `accounts` (`SendForgotPasswordMailUseCase`); novo módulo `notification` (fila de envio, avisos e grupos de email); `casl` (novos subjects `Announcement` e `MailingGroup`); `core` (consulta de pessoas por vínculo, leitura apenas); `nest-cli.json` (assets `.hbs`); `package.json` (`bullmq`, `@nestjs/bullmq`); `.env.example`, `docker-compose.yaml` e `docker-compose-dev.yaml` (novo serviço Redis) |
| **Categoria de impacto** | ( ) Interno, sem impacto externo &nbsp;&nbsp; (x) Afeta consumo do front &nbsp;&nbsp; ( ) Quebra contrato existente com o front &nbsp;&nbsp; (x) Requer infraestrutura nova |
| **Janela de aviso aplicada** | Sugestão: aguardar aprovação ativa de quem administra a conta Google institucional (conta remetente + credencial) e de quem responde pelo ambiente onde o Redis vai rodar, e 48–72h úteis com confirmação ativa do front para as rotas de avisos. **A confirmar por quem revisar**, ver seção 7 |
| **Confirmação ativa recebida de** | *(em branco até resposta)* |
| **Pessoas marcadas no PR** | *(em branco: quem abrir o PR decide)* |

Design doc relacionado: [`docs/designs/0005-avisos-por-email.md`](../designs/0005-avisos-por-email.md) (avisos e grupos de email).

---

## 1. Problema

O projeto não consegue enviar email hoje. Existem dois providers em `src/shared/container/providers/MailProvider/implementations/`, nenhum funciona no contexto deste projeto, e o único fluxo que depende de email (recuperação de senha) está quebrado mesmo se um provider funcionasse. Além disso, há um requisito novo, o envio de avisos por email escritos pelo admin na plataforma, que o desenho atual não suporta.

### 1.1 `SESMailProvider`: boilerplate de outro projeto, sem infraestrutura

`SESMailProvider.ts` usa o `SES` do `aws-sdk` v2 com `region: process.env.AWS_REGION` e remetente fixo `'Contato <italo.carlo@redeamamenta.com.br>'` (linha 35), endereço de outro projeto. O projeto não tem conta AWS/SES configurada: `AWS_REGION` não aparece em `.env.example`, `.env.docker` nem `docker-compose.yaml`. É o único provider real registrado em `MailProvider/index.ts:5-8`.

### 1.2 `EtherealMailProvider`: código morto de curso

`EtherealMailProvider.ts` não está registrado no mapa de `index.ts` (só `ses` e `inmemory`), então é inalcançável. O remetente fixo é `'Rentx <noreply@rentx.com.br>'` (linha 43), do projeto de exemplo de onde veio. O construtor dispara `nodemailer.createTestAccount()` sem `await` (linhas 10-25), e `this.client` fica `undefined` até a promise resolver. Ethereal também não entrega email de verdade, só serve para inspeção manual em dev.

### 1.3 Seleção do provider pode derrubar o boot

`index.ts:12` faz `useClass: mailProviders[process.env.MAIL_PROVIDER ?? 'inmemory']`. Qualquer valor fora do mapa (ex.: `MAIL_PROVIDER=smtp`, `MAIL_PROVIDER=ethereal`) resolve para `undefined` e o Nest falha ao montar o `SharedModule`. `MAIL_PROVIDER` não está documentado em nenhum `.env*`, então em produção hoje cai sempre no `MailProviderInMemory`, que só empilha a mensagem num array e não envia nada. O `POST /password/forgot` responde `204` e nenhum email sai.

### 1.4 Recuperação de senha aponta para um template que não existe em runtime

`send-forgot-password-mail.usecase.ts:23-30` resolve o template como `resolve(__dirname, '..', '..', 'views', 'email', 'forgotPassword.hbs')`. Partindo de `application/password/use-cases/send-forgot-password-mail/`, isso dá `application/password/views/email/forgotPassword.hbs`. O arquivo real está em `src/modules/accounts/presentation/views/email/forgotPassword.hbs`. Além disso, `nest-cli.json` não declara `assets`, então nenhum `.hbs` é copiado para `dist/` (confirmado: `find dist -name "*.hbs"` não retorna nada).

Com um provider real ativo, `fs.readFileSync(path)` lançaria `ENOENT` em toda chamada. O spec (`send-forgot-password-mail.usecase.spec.ts`) passa porque usa `MailProviderInMemory`, que nunca lê o arquivo.

`FORGOT_MAIL_URL` (linha 47), usado para montar o link de reset, também não está em nenhum `.env*` nem no `docker-compose.yaml`. Sem ele, o link sai como `undefined<token>`.

### 1.5 O contrato `IMailProvider` mistura transporte e template

`IMailProvider.sendMail(to, subject, variables: any, path: string)` obriga cada implementação a ler o arquivo do disco (com I/O síncrono, `readFileSync`), compilar Handlebars e enviar. As duas implementações duplicam as mesmas 5 linhas de template. Um aviso escrito pelo admin não é um arquivo `.hbs` no disco, então não cabe nesse contrato.

### 1.6 Envio síncrono dentro da requisição, sem limite de taxa

O único uso atual faz `await this.mailProvider.sendMail(...)` dentro do request HTTP. Para um email isso é tolerável. Para um aviso enviado a centenas de usuários, o request ficaria aberto por minutos, qualquer falha no meio deixaria um envio parcial sem registro de quem recebeu, e o Gmail bloquearia a conta ao estourar o limite (ver 2.2).

## 2. Contexto

### 2.1 Requisitos

1. **Provider funcional** para emails transacionais (hoje: recuperação de senha; no futuro, provavelmente notificações de chamado e de agendamento).
2. **Avisos por email:** um ADMIN escreve um aviso na plataforma (assunto + corpo) e escolhe o público; o sistema envia para todos os destinatários.
3. **Respeitar os limites do Gmail**, que é o serviço de email disponível para a instituição. O sistema precisa limitar quantos emails saem por intervalo e por dia, e não pode perder envios quando atinge o limite.
4. **Grupos de email** (pedido do admin): o público de um aviso é escolhido entre grupos salvos, de dois tipos:
   - **dinâmico:** definido por critérios de vínculo (ex.: "todos os técnicos administrativos"). Os membros saem do cadastro de vínculos e se atualizam sozinhos quando o vínculo muda;
   - **estático:** lista manual, em que o admin adiciona e remove pessoas.

`TODO.txt` já registra a direção: *"vamos usar smtp, possivelmente nodemailer (mas nest tem module pra isso)"*. `nodemailer@6.10.1` e `handlebars` já são dependências.

### 2.2 Limites do Gmail

Limites publicados pelo Google para contas Google Workspace ([Gmail sending limits in Google Workspace](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace)):

| Limite | Valor |
|---|---|
| Mensagens por dia, por conta | 2.000 (500 em conta trial) |
| Destinatários por mensagem via SMTP | 100 |
| Total de destinatários por dia | 10.000 |
| Destinatários externos únicos por dia | 2.000 |

Os limites são em **janela móvel de 24h**, não reiniciam à meia-noite. Contas Gmail pessoais (`@gmail.com`) têm limites menores (por volta de 500/dia, sem número oficial estável). O Google não publica limite de conexões SMTP simultâneas; na prática, muitas conexões paralelas ou rajadas rápidas geram respostas `421 4.7.0` (temporário) e, no limite diário, `550 5.4.5 Daily user sending limit exceeded`, que bloqueia o envio da conta por até 24h.

**Autenticação:** desde 14/03/2025 o Google desligou autenticação SMTP com senha comum ("less secure apps") ([Transition from less secure apps to OAuth](https://knowledge.workspace.google.com/admin/sync/transition-from-less-secure-apps-to-oauth)). Restam **senha de app** (exige verificação em duas etapas na conta, e o admin do Workspace pode desabilitar) ou **OAuth2 (XOAUTH2)**, que o nodemailer suporta nativamente com `clientId`/`clientSecret`/`refreshToken`.

### 2.3 Infraestrutura atual

- Não há Redis nem outro broker no `docker-compose.yaml`; só `api` e `db` (Postgres 15). **Este RFC introduz o Redis** (seção 4.3).
- `@nestjs/schedule` já está registrado em `app.module.ts` (`ScheduleModule.forRoot()`) e é usado por `glpi-service-order.provider.ts` (`@Cron`).
- Configuração é lida via `process.env` direto no projeto todo (ver RFC 0007, item 1.10). Este RFC segue esse padrão e não introduz `ConfigService`.
- A RFC 0007 (Alternativa D) já prevê uma fila assíncrona para a sincronização com o GLPI. Uma infraestrutura de fila introduzida aqui pode ser reaproveitada por ela.

### 2.4 RFCs relacionados

- **RFC 0007** (provider GLPI) definiu o princípio de que provider de integração externa relança o erro em vez de engolir, e não roda lifecycle assíncrono sem tratamento no construtor. O provider SMTP segue isso. A Alternativa D da mesma RFC (fila de sincronização com o GLPI) é candidata a usar a mesma infraestrutura de fila.
- **RFC 0003** (`AppError`): enquanto não for aceito, erros de domínio novos usam `HttpException` do Nest, como o resto do projeto.
- **RFC 0002 / 0013** (CASL): rotas de avisos ficam restritas a ADMIN pela `CaslAbilityFactory`, sem checagem de role no controller.

### 2.5 Como o vínculo está modelado hoje

O vínculo é a entidade `PersonLink` (`src/modules/core/domain/entities/person-link.entity.ts`), em relação N:1 com `Person`. Uma pessoa pode ter vários vínculos. Campos usáveis como critério de grupo:

| Campo | Tipo | Exemplo |
|---|---|---|
| `linkType` | enum `LinkType` (`core/domain/enums/link-type.ts`) | `Técnico Administrativo`, `Docente`, `Discente`, `Discente Pós-Graduação`, `Terceirizado` |
| `unity` | enum `EducationalUnity` | `Arapiraca`, `Palmeira dos Índios`, `Viçosa`, `Penedo`, ... |
| `departmentId` | FK `Department` | |
| `courseId` | FK `Course` | |
| `employeeRoleId` | FK `EmployeeRole` (cargo) | |
| `functionalLevelId` | FK `FunctionalLevel` | |
| `startDate` / `endDate` | data; `end_date` é nullable na migration `1652190090645-CreatePersonLink.ts` | vínculo encerrado tem `endDate` no passado |

Na `Person` (`core/domain/entities/person.entity.ts`):

- `email` é **nullable** (migration `1652187207337-CreatePerson.ts:73-76`); há pessoas sem email cadastrado. Existe também `secondaryEmail`.
- `status` é o enum `PersonStatus`, com 14 valores (`Ativo`, `Férias`, `Falecido`, `Desligado`, `Aposentado`, `Exonerado`, ...).
- `isActiveMail` já existe e está documentado como *"recebe notificações no email"* (`create-person-dto.ts:80`). É o opt-out natural para avisos. Porém o valor está inconsistente no código: a migration usa `default true`, o construtor da entidade atribui `false`, e `create-person.usecase.ts:23-25` força `true` sempre que o DTO não manda `true`, ou seja, **um `false` explícito vira `true` na criação**.
- Muitas `Person` não têm `User` (o `User` aponta para a pessoa por `person_id`, nullable). As roles (`UserRole`) estão no `User`, não na `Person`.

## 3. Alternativas consideradas

Há quatro decisões independentes: transporte, mecanismo de fila, forma de envio dos avisos e modelo dos grupos de email.

### 3.1 Transporte

#### Alternativa T1: SMTP genérico com nodemailer, configurado para Gmail (escolhida)
- Descrição: um `SmtpMailProvider` com `nodemailer.createTransport({ host, port, secure, auth })`. Host/porta/credenciais por env. Gmail é só a configuração atual (`smtp.gmail.com:465`).
- Prós: nodemailer já é dependência e já é a base dos dois providers existentes. Trocar Gmail por outro SMTP (relay da UFAL, Brevo, SES via SMTP) é só mudar env. Suporta senha de app e OAuth2 sem dependência nova.
- Contras: SMTP dá menos informação de erro que uma API HTTP; a classificação de erro (seção 4.5) depende de códigos SMTP.

#### Alternativa T2: `@nestjs-modules/mailer` (o "module do nest" citado no `TODO.txt`)
- Descrição: módulo da comunidade que embrulha o nodemailer com integração de templates.
- Prós: configuração declarativa, adaptadores de template prontos.
- Contras: nova dependência que é uma camada fina sobre o nodemailer que já temos. Não resolve fila, limite diário nem retry, que são a parte difícil deste RFC. Fugiria do padrão de provider com interface abstrata + `useClass` por env já usado em `StorageProvider` e `MailProvider`.

#### Alternativa T3: Gmail API (`googleapis`)
- Descrição: enviar via `users.messages.send` em vez de SMTP.
- Prós: erros HTTP mais claros.
- Contras: dependência pesada nova, obriga OAuth2 desde o início, e prende o código ao Google. Os limites de envio são os mesmos.

#### Alternativa T4: Manter/consertar o SES
- Contras: exige conta AWS, verificação de domínio e saída do sandbox do SES, infraestrutura que a instituição não tem hoje. O `aws-sdk` v2 está em fim de suporte. Se no futuro houver SES, ele entra pela T1 (SES expõe SMTP) sem código novo.

### 3.2 Fila de envio

Ponto comum a todas as alternativas: o volume é pequeno. O Gmail limita a conta a ~2.000 mensagens/dia; com a taxa proposta (10/min), sai no máximo um email a cada 6 segundos. Nenhuma das opções abaixo é escolhida por vazão. O que diferencia é como cada uma lida com cota diária, prioridade, retry com espera, pausa e custo operacional.

Também é comum a todas: o **status por destinatário precisa ficar no Postgres** de qualquer forma, porque a tela de detalhe do aviso mostra enviados/falhos/pendentes e isso precisa ser consultável e durável junto com o resto dos dados do sistema.

#### Alternativa F1: Sem fila (envio direto no request, como hoje)
- Prós: zero código novo.
- Contras: inviável para avisos (1.6). Sem controle de limite diário, sem retry, sem registro do que foi enviado.

#### Alternativa F2: Fila em memória no processo
- Prós: simples; sem tabela nova.
- Contras: perde tudo em restart/deploy. Um aviso para 1.500 pessoas com limite diário de ~2.000 pode levar horas ou passar de um dia para outro; não dá para depender do processo ficar de pé esse tempo todo.

#### Alternativa F3: Fila na própria tabela do Postgres + worker com `@nestjs/schedule`
- Descrição: um worker em `@Interval` faz polling em `mail_messages` com `SELECT ... FOR UPDATE SKIP LOCKED`, respeita o orçamento e atualiza o status das linhas.
- Prós: nenhuma infraestrutura nova. Criação do aviso e enfileiramento na mesma transação. `SKIP LOCKED` torna seguro rodar mais de uma instância.
- Contras: limite de taxa, backoff, prioridade, recuperação de job travado e pausa da fila seriam todos código próprio, sem precedente no projeto. Latência de até um intervalo de polling (mitigável). A pausa por quota fica em memória por instância. Não serve de base reaproveitável para a fila do GLPI (RFC 0007, Alternativa D) sem reimplementar o mesmo mecanismo.

#### Alternativa F4: BullMQ + Redis (escolhida)
- Descrição: fila `mail` no BullMQ, processada por um worker do `@nestjs/bullmq`. A tabela `mail_messages` continua no Postgres como registro de status de cada envio; o job no Redis só carrega o id da linha.
- Prós:
  - limite de taxa **global entre instâncias** nativo (`limiter: { max, duration }`) e pausa manual da fila (`worker.rateLimit(ms)`), que resolve a pausa por quota em todas as instâncias de uma vez;
  - prioridade, jobs atrasados, retry com backoff e erro não-recuperável (`UnrecoverableError`) prontos;
  - detecção de job travado (stalled) pronta, sem lock manual;
  - o job entra direto na fila, sem polling: o reset de senha sai imediatamente;
  - integração oficial com Nest (`@nestjs/bullmq`, que aceita Nest 10 sem upgrade) e painel visual disponível (Bull Board);
  - a mesma infraestrutura atende a futura fila de sincronização com o GLPI (RFC 0007, Alternativa D) e outros usos de Redis (cache, rate limit de login).
- Contras:
  - Redis é infraestrutura nova: container, volume, senha, monitoramento;
  - por padrão o Redis guarda tudo em memória: sem AOF e `maxmemory-policy noeviction`, jobs podem sumir em restart ou com memória cheia;
  - gravar no Postgres e publicar no Redis são duas operações separadas (dual-write), e exige reconciliação (4.3);
  - o limitador do BullMQ é de janela fixa; a cota de 24h em janela móvel do Gmail continua sendo código próprio;
  - testes de use case não podem depender de Redis: precisa de uma implementação in-memory da fila.

#### Alternativa F5: RabbitMQ
- Descrição: fila `mail` num broker RabbitMQ, consumida pela API.
- Prós: entrega confiável com confirmação, filas com prioridade (`x-max-priority`), roteamento flexível entre exchanges. Melhor opção quando vários serviços publicam e consomem eventos entre si.
- Contras:
  - sem limite de taxa nativo;
  - retry com espera exige o plugin de mensagens atrasadas ou combinação de TTL com dead letter exchange;
  - pausar a fila por quota significa cancelar o consumidor manualmente ou devolver mensagens à fila em loop;
  - a cota de 24h continua sendo código próprio;
  - infraestrutura mais pesada que Redis (Erlang, painel de gestão, usuários/vhosts) para operar.

  O projeto é um monólito com um único consumidor; quase nada do que o RabbitMQ faz de melhor seria usado.

### 3.3 Forma de envio dos avisos

#### Alternativa E1: Uma mensagem por destinatário (escolhida)
- Prós: não expõe a lista de destinatários; status de entrega por pessoa; um endereço inválido falha só a linha dele; permite saudação personalizada.
- Contras: N mensagens no lugar de poucas.

#### Alternativa E2: Uma mensagem com destinatários em BCC, em lotes de até 100
- Prós: menos mensagens.
- Contras: **não economiza cota**, porque o Gmail conta destinatários, não mensagens (10.000 destinatários/dia). Um endereço rejeitado pode afetar o lote todo, e não há status individual. Sem ganho real.

### 3.4 Grupos de email

#### Membro do grupo: `Person` ou `User`

- **`Person` (escolhida):** o vínculo, o email cadastral e o `isActiveMail` estão na `Person`. Técnicos, docentes e terceirizados sem conta na plataforma também recebem avisos. Critério por role continua possível, fazendo join `person → users → user_roles`.
- **`User`:** só alcança quem tem conta. Um grupo "todos os técnicos" deixaria de fora quem nunca fez login, o que contraria o pedido.

#### Grupo dinâmico: resolver na hora ou materializar membros

- **Resolver sob demanda (escolhida):** o grupo guarda só os critérios; os membros são uma query (`person JOIN person_link WHERE ...`) executada quando alguém lista os membros, pede a contagem ou cria um aviso. Sempre reflete o cadastro atual, sem sincronização. A query é uma só, indexável, e o volume (milhares de pessoas) é pequeno.
- **Materializar membros numa tabela, atualizada por cron ou por evento ao alterar `PersonLink`:** listagem mais barata e histórico de quem estava no grupo. Mas obriga a interceptar toda escrita em `PersonLink`/`Person` (módulo `core`) ou a conviver com membros desatualizados entre execuções do cron. O que se ganha não paga a complexidade, porque o aviso já guarda os destinatários resolvidos no momento do envio (snapshot).

#### Formato dos critérios

- **Filtro estruturado com campos fixos (escolhida):** `{ linkTypes?, unities?, departmentIds?, courseIds?, employeeRoleIds?, functionalLevelIds?, userRoles?, personStatuses? }`. Cada campo é uma lista (OR dentro do campo), e os campos se combinam com AND. Valida com `class-validator`, gera uma query previsível e o front monta com selects.
- **Expressão livre (AND/OR aninhados, ou SQL):** mais poderoso, mas difícil de validar, de montar na tela e de proteger contra queries caras ou injeção. Sem caso de uso que exija isso hoje.

#### Grupo híbrido (dinâmico com exceções manuais)

- Ex.: "todos os técnicos, exceto fulano, mais beltrano". **Fica fora desta versão:** dá para chegar perto disso selecionando vários grupos no mesmo aviso (um dinâmico mais um estático), e as exceções podem ser adicionadas depois sem quebrar o contrato (campos `includedPersonIds`/`excludedPersonIds` no grupo dinâmico).

## 4. Decisão

T1 + F4 + E1: provider SMTP via nodemailer configurado para Gmail; toda saída de email passa por uma fila BullMQ no Redis, com o status de cada envio registrado no Postgres; avisos geram uma mensagem por destinatário. O público de um aviso é um ou mais **grupos de email** (4.9), estáticos ou dinâmicos, com membros do tipo `Person`.

Entre F3 e F4, a escolha pelo BullMQ é porque limite de taxa, prioridade, backoff, pausa global e recuperação de job travado já vêm prontos e testados, em vez de serem implementados à mão. Além disso, a infraestrutura serve para outras filas que o projeto já prevê (GLPI). O custo aceito é operar um Redis e tratar o dual-write com reconciliação.

### 4.1 Novo contrato do provider (transporte apenas)

```ts
// src/shared/container/providers/MailProvider/IMailProvider.ts
interface SendMailInput {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

abstract class IMailProvider {
	/** Envia uma mensagem. Lança MailDeliveryError em falha; nunca retorna undefined. */
	abstract sendMail(input: SendMailInput): Promise<{ messageId: string }>;
}
```

Implementações:

- `SmtpMailProvider` (nova): nodemailer com `pool: true` e `maxConnections` igual à concorrência do worker. O `from` vem de `MAIL_FROM` (nada fixo no código). Erros do nodemailer viram `MailDeliveryError` com `kind: 'TEMPORARY' | 'PERMANENT' | 'QUOTA' | 'AUTH'` (ver 4.5). O `transporter.verify()` roda em `onModuleInit` com `try/catch` e só loga; credencial errada não derruba o boot (princípio da RFC 0007, item 1.1). O controle de taxa fica no BullMQ, não no pool do nodemailer, para valer entre instâncias.
- `MailProviderInMemory` (mantida, adaptada à assinatura nova): continua sendo o padrão em teste e dev.
- `EtherealMailProvider`: **removido**. Para inspecionar emails em dev usa-se o **Mailpit** (container no `docker-compose-dev.yaml`, SMTP em `localhost:1025`, UI em `localhost:8025`) através do próprio `SmtpMailProvider`, só com variáveis de ambiente. Assim dev exercita o mesmo provider de produção, sem internet e sem prévias públicas.
- `SESMailProvider`: **removido**. O `aws-sdk` v2 continua no `package.json` porque `S3StorageProvider` ainda usa.

Seleção em `MailProvider/index.ts` com validação: valor de `MAIL_PROVIDER` fora do mapa (`smtp`, `inmemory`) lança erro com mensagem clara no boot, em vez do `useClass: undefined` de hoje (1.3).

### 4.2 Renderização de template separada do transporte

Um `MailTemplateRenderer` (Handlebars) compila os templates uma vez na inicialização e expõe `render(templateName, variables): { html, text }`. Templates passam a ficar em `src/shared/views/mail/` (`layout.hbs`, `forgot-password.hbs`, `announcement.hbs`), com `nest-cli.json` declarando `"assets": [{ "include": "**/*.hbs", "watchAssets": true }]`. Isso corrige 1.4 e 1.5.

O corpo de aviso escrito pelo admin é texto puro: é escapado pelo Handlebars (`{{body}}`) e as quebras de linha viram `<br>`. Nenhum HTML do admin vai cru para o email (ver seção 7 sobre formatação rica).

### 4.3 Fila: BullMQ no Redis, status no Postgres

**Divisão de responsabilidade:**

| Onde | O quê |
|---|---|
| Postgres, tabela `mail_messages` | conteúdo renderizado, status, tentativas, erro, data de envio. É a fonte da verdade e o que as rotas de aviso consultam |
| Redis, fila BullMQ `mail` | só o agendamento: job com `jobId = mail_messages.id` e payload `{ mailMessageId }`, prioridade, atraso, retry |

Perder o Redis não perde email: as linhas `PENDING` do Postgres são reenfileiradas pela reconciliação (abaixo).

Tabela `mail_messages`:

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | também é o `jobId` no BullMQ |
| `to` | varchar | |
| `subject` | varchar | |
| `html` / `text` | text | já renderizados no momento do enfileiramento |
| `priority` | smallint | `1` transacional, `10` aviso (no BullMQ, menor = mais prioritário) |
| `status` | enum | `PENDING`, `SENT`, `FAILED`, `CANCELED` |
| `attempts` | int | |
| `last_error` | text | |
| `provider_message_id` | varchar | retorno do SMTP |
| `announcement_id` | uuid, nullable | FK para `announcements` (a FK é criada junto com a tabela, na fase de avisos; até lá é só a coluna) |
| `person_id` | uuid, nullable | `Person` destinatária, quando o email veio de um grupo |
| `sent_at`, `created_at` | timestamptz | |

Índices: `(status, sent_at)` para o orçamento diário; `(announcement_id, status)` para as estatísticas do aviso; `(status, created_at)` para a reconciliação.

**Abstração da fila.** Um contrato `MailQueue` (`enqueue(ids: string[], priority)`) com duas implementações, no mesmo padrão de provider por env (`MAIL_QUEUE=bullmq|inmemory`):

- `BullMqMailQueue`: `queue.addBulk(...)` com `jobId` igual ao id da linha. O `jobId` torna o enfileiramento idempotente: publicar duas vezes o mesmo id não duplica o job.
- `InMemoryMailQueue`: processa na hora, sem Redis. Usada nos testes de use case (`test/test-helpers.ts`), em dev sem Redis e **como padrão em produção até o Redis ser ligado** (ver "Ativação gradual", abaixo). Envia dentro da requisição, sem limite de taxa, sem cota e sem retry: em falha, a linha vira `FAILED`.

**Ativação gradual.** `MAIL_QUEUE` ausente ou vazio vale `inmemory`; valor fora de `bullmq`/`inmemory` lança erro no boot. Sem `MAIL_QUEUE=bullmq`, o `BullModule` **nem é registrado**: nenhuma conexão com o Redis é aberta, e o `MailProcessor` e a reconciliação não existem. Isso permite integrar a fila na `main` sem exigir o Redis no deploy, que é manual, e ligá-lo só depois de validado em dev. Consequência para os avisos: como a fila em memória envia tudo dentro da requisição e sem limite, **a criação de aviso deve recusar a requisição (ex.: `503`) quando `MAIL_QUEUE` não for `bullmq`**. Isso entra na fase de avisos; grupos de email não são afetados.

**Enfileiramento.** Quem quer mandar email chama `EnqueueMailUseCase` (`execute({ to, subject, template, variables, priority, announcementId? })`), que:

1. renderiza e grava a(s) linha(s) em `mail_messages` como `PENDING` (no caso do aviso, na mesma transação do `Announcement`);
2. **depois do commit**, publica os jobs no BullMQ.

Só o worker usa o `IMailProvider`.

**Redis fora na hora de publicar.** O BullMQ não falha quando o Redis está inacessível: `queue.add` espera a conexão voltar, e a requisição ficaria pendurada (verificado: sem resposta em mais de 100s, mesmo com `enableOfflineQueue: false`). Por isso o `BullMqMailQueue.enqueue` tem um timeout (`MAIL_ENQUEUE_TIMEOUT_MS`, padrão 3s): estourado, lança, o `EnqueueMailUseCase` registra o erro e a linha segue `PENDING` até a reconciliação. Se a publicação concluir depois do timeout, republicar o mesmo `jobId` é inofensivo.

**Reconciliação (dual-write).** Se o processo cair entre o commit e a publicação, ou se o Redis perder dados, a linha fica `PENDING` sem job. Um `@Cron` (a cada `MAIL_RECONCILE_INTERVAL`, padrão 5 min, mesmo mecanismo do GLPI) busca linhas `PENDING` com `created_at` mais antigo que alguns minutos e as republica. Como o `jobId` é o id da linha, republicar uma linha que já tem job é inofensivo.

**Worker** (`MailProcessor`, `@Processor('mail')` do `@nestjs/bullmq`):

- Configuração: `concurrency: MAIL_MAX_CONNECTIONS`, `limiter: { max: MAIL_RATE_LIMIT, duration: MAIL_RATE_DELTA_MS }` (global entre todas as instâncias), `attempts: MAIL_MAX_ATTEMPTS`, backoff com **estratégia customizada** (`settings.backoffStrategy` do worker, `backoff: { type: 'custom' }` nos jobs) com a sequência fixa 1min, 5min, 30min, 2h. O `exponential` do BullMQ dobraria o atraso (1, 2, 4, 8 min) e não produz essa sequência. A estratégia indexa uma lista de atrasos pelo número da tentativa e usa o último valor se as tentativas passarem do tamanho da lista.
- Para cada job:
  1. Carrega a linha. Se o status não for `PENDING` (já enviada, ou cancelada), termina o job sem enviar. Isso dá o cancelamento e reduz duplicidade em retry.
  2. Calcula o orçamento: `MAIL_DAILY_LIMIT - COUNT(status = 'SENT' AND sent_at > now() - interval '24 hours')`.
  3. Orçamento zerado: `worker.rateLimit(ms até a linha SENT mais antiga da janela sair dela)` e `throw Worker.RateLimitError()`. A fila inteira pausa em todas as instâncias e o job volta sem contar tentativa.
  4. Job de aviso (`priority = 10`) com orçamento `<= MAIL_RESERVED_TRANSACTIONAL`: `job.moveToDelayed(now + MAIL_BULK_DEFER_MS)` e `throw DelayedError`. Só ele espera; transacionais continuam saindo. Um aviso grande nunca impede um "esqueci minha senha" no mesmo dia.
  5. Envia pelo provider e atualiza a linha conforme a 4.5.
- O BullMQ detecta jobs travados (worker morreu no meio) e os devolve à fila automaticamente.

**Redis** (novo serviço no `docker-compose.yaml` e no `docker-compose-dev.yaml`):

- `redis:7-alpine`, com `--appendonly yes --maxmemory-policy noeviction --requirepass ${REDIS_PASSWORD}`;
- volume persistente, healthcheck (`redis-cli ping`), sem porta exposta fora da rede `ud_network` em produção;
- **Dev** (`docker-compose-dev.yaml`): serviço `redis` sempre ativo, sem senha, porta `6379` exposta.
- **Produção** (`docker-compose.yaml`): o serviço `redis` fica atrás do profile `redis` (`docker compose --profile redis up -d`) e o `api` **não** tem `depends_on` nele. Divergência em relação à primeira versão desta RFC, que previa `depends_on` com `service_healthy`: com a ativação gradual, exigir o Redis faria o deploy atual quebrar sem necessidade. Quando `MAIL_QUEUE=bullmq` virar o padrão, o profile e o `depends_on` devem ser revistos.

`noeviction` é obrigatório pelo BullMQ: com outra política o Redis pode apagar chaves de job quando a memória enche.

**Dependências novas:** `bullmq` e `@nestjs/bullmq` (a linha 10.x aceita `@nestjs/common ^10`, versão atual do projeto).

### 4.4 Avisos por email

Novo módulo `src/modules/notification/` nas camadas do projeto (`domain`, `application`, `infra`, `presentation`), contendo a fila (4.3), os avisos e os grupos de email (4.9). O contrato HTTP está no design doc 0005; aqui fica só a decisão:

- Entidade `Announcement` (`id`, `subject`, `body`, `audience` (jsonb), `created_by`, `status`, `total_recipients`, `created_at`, `canceled_at`).
- Público: um ou mais grupos de email (`groupIds`). Os membros de todos os grupos são resolvidos **na criação** (snapshot), unidos e deduplicados por email normalizado (`lower(trim)`), e as linhas de `mail_messages` são gravadas na mesma transação do aviso. Ou cria tudo, ou nada; os jobs são publicados depois do commit (4.3).
- `audience` guarda uma cópia dos grupos usados (`[{ id, name, type }]`), não FK. Editar ou apagar o grupo depois não altera o histórico do aviso.
- O request responde `202 Accepted` com o total de destinatários; o envio acontece em segundo plano pelo worker.
- Status do aviso derivado das linhas: `QUEUED` → `SENDING` → `COMPLETED` / `COMPLETED_WITH_FAILURES` / `CANCELED`.
- Cancelamento marca como `CANCELED` as linhas ainda `PENDING` no Postgres. Os jobs continuam na fila, mas o worker os descarta ao ver o status (4.3, passo 1). Tentar remover os jobs do Redis é otimização opcional, não requisito.
- Autorização: subject CASL `Announcement`. Nenhuma regra nova para não-ADMIN; o `can(MANAGE, 'all')` do ADMIN já cobre. Mesmo padrão da RFC 0013.

### 4.5 Classificação de erros SMTP

| Resposta | Exemplo | `kind` | Ação no worker |
|---|---|---|---|
| `4xx` em geral | `421 4.7.0` (taxa), timeout, conexão recusada | `TEMPORARY` | relança; o BullMQ refaz com backoff. Na última tentativa, a linha vira `FAILED` |
| Limite diário | `550 5.4.5`, `421 4.7.28` | `QUOTA` | `worker.rateLimit(MAIL_QUOTA_PAUSE_MS)` + `RateLimitError`: pausa global, sem contar tentativa |
| Autenticação | `535 5.7.8` | `AUTH` | mesma pausa global, e log em nível `error` (credencial precisa de intervenção humana) |
| `5xx` restante | `550 5.1.1` (destinatário não existe) | `PERMANENT` | linha vira `FAILED`; `throw new UnrecoverableError()`, sem retry |

Como a pausa é feita no Redis, ela vale para todas as instâncias da API ao mesmo tempo.

### 4.6 Recuperação de senha

`SendForgotPasswordMailUseCase` passa a chamar `EnqueueMailUseCase` com o template `forgot-password` e `priority: 1`. Contrato HTTP de `POST /password/forgot` **não muda** (continua `204`, e `400` para email não cadastrado). O caminho de template quebrado (1.4) desaparece porque o use case não resolve mais caminhos de arquivo.

### 4.7 Variáveis de ambiente

Adicionadas ao `.env.example` e ao `docker-compose.yaml`:

```
MAIL_PROVIDER=inmemory            # "smtp" em produção; em dev, "smtp" apontando para o Mailpit
MAIL_QUEUE=inmemory               # "bullmq" em produção
MAIL_FROM="UD - UFAL Arapiraca <conta@ufal.br>"
MAIL_SMTP_HOST=smtp.gmail.com
MAIL_SMTP_PORT=465
MAIL_SMTP_SECURE=true
MAIL_SMTP_USER=
MAIL_SMTP_PASS=                   # senha de app
MAIL_DAILY_LIMIT=1800             # margem abaixo dos 2.000 do Workspace
MAIL_RESERVED_TRANSACTIONAL=200
MAIL_MAX_CONNECTIONS=2            # concorrência do worker e do pool SMTP
MAIL_RATE_LIMIT=10                # mensagens...
MAIL_RATE_DELTA_MS=60000          # ...por janela (aqui, 10/min), global entre instâncias
MAIL_MAX_ATTEMPTS=5
MAIL_QUOTA_PAUSE_MS=3600000
MAIL_BULK_DEFER_MS=900000
MAIL_RECONCILE_INTERVAL="*/5 * * * *"
MAIL_RECONCILE_MIN_AGE_MS=300000  # só republica linhas PENDING mais antigas que isto
MAIL_ENQUEUE_TIMEOUT_MS=3000        # desiste de publicar se o Redis não responder; a linha segue PENDING
MAIL_BACKOFF_MS=60000,300000,1800000,7200000  # espera antes de cada nova tentativa
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
FORGOT_MAIL_URL=                  # já usado, nunca documentado
```

Os valores de taxa acima são ponto de partida conservador, não derivados de limite publicado (ver seção 7).

### 4.8 Testes

- `SmtpMailProvider`: mock do `nodemailer.createTransport` cobrindo a classificação de erro da 4.5.
- `MailProcessor`: testado chamando o método `process(job)` diretamente com um job falso, repositório in-memory e `MailProviderInMemory` configurável para falhar. Cobre: linha cancelada/já enviada é ignorada, orçamento zerado pausa, reserva transacional adia aviso, `PERMANENT` vira `UnrecoverableError`.
- `CreateAnnouncementUseCase` e `EnqueueMailUseCase`: com `InMemoryMailQueue`, sem Redis. Cobre deduplicação, snapshot de destinatários, atomicidade e publicação após o commit.
- Reconciliação: linha `PENDING` antiga é republicada; republicar não duplica (idempotência por `jobId`).
- **Teste de integração do sincronismo (implementado, `test/modules/notification/mail-queue.integration.spec.ts`):** Postgres e Redis reais via `testcontainers` (`@testcontainers/redis` entra como dependência de dev), com a fila, o worker e a tabela `mail_messages` de verdade; só o provider de email é falso. Cobre: envio completo (`PENDING` → `SENT`); idempotência do `jobId`; linha cancelada depois da publicação; falha na publicação depois do commit recuperada pela reconciliação; Redis que perde os dados recuperado pela reconciliação; reconciliar duas vezes sem duplicar; `PERMANENT` sem retry; `TEMPORARY` com backoff e `FAILED` na última tentativa; recuperação de `TEMPORARY`; pausa por `QUOTA` sem contar tentativa; retenção até o envio mais antigo sair da janela de 24h; adiamento do aviso para proteger a reserva transacional; e limite de taxa por janela. Não cobre recuperação de job travado (stalled), que é função do BullMQ.
- Corrigir o spec de recuperação de senha para verificar o enfileiramento.
- `MailingGroupMembersResolver`: teste de integração com Postgres (`testcontainers`), porque a lógica está na query. Cobre: AND entre campos e OR dentro do campo; critérios de vínculo casando no mesmo vínculo; vínculo encerrado não entra; status padrão; `userRoles` via `User`; pessoa sem email e com `isActiveMail = false` marcada como não alcançável; grupo estático ignora status.
- Use cases de grupo: tipo imutável, rotas de membro em grupo dinâmico dão `409`, critério vazio é rejeitado, adicionar/remover é idempotente.

### 4.9 Grupos de email

Também no módulo `notification`. Contrato HTTP no design doc 0005.

**Modelo:**

- `mailing_groups`: `id`, `name` (único), `description`, `type` (`STATIC` | `DYNAMIC`, imutável após criar), `criteria` (jsonb, só em `DYNAMIC`), `created_by`, `created_at`, `updated_at`.
- `mailing_group_members`: `group_id`, `person_id`, `added_at` (PK composta), só para `STATIC`. Apagar a `Person` apaga a linha (FK `ON DELETE CASCADE`).

**Critérios do grupo dinâmico** (`criteria`):

```ts
{
	linkTypes?: LinkType[];           // ex.: ['Técnico Administrativo']
	unities?: EducationalUnity[];
	departmentIds?: string[];
	courseIds?: string[];
	employeeRoleIds?: string[];
	functionalLevelIds?: string[];
	userRoles?: UserRole[];           // via person -> users -> user_roles
	personStatuses?: PersonStatus[];  // padrão: ver abaixo
}
```

- Lista dentro de um campo é OR; campos diferentes combinam com AND. "Técnicos ou docentes de Arapiraca" = `{ linkTypes: [TECNICO, DOCENTE], unities: [ARAPIRACA] }`.
- Pelo menos um campo além de `personStatuses` é obrigatório. Um grupo sem critério seria "todo mundo" por acidente.
- Os critérios de vínculo (`linkTypes`, `unities`, `departmentIds`, `courseIds`, `employeeRoleIds`, `functionalLevelIds`) precisam bater **no mesmo vínculo**, e esse vínculo precisa estar **vigente**: `start_date <= hoje` (ou nulo) e `end_date` nulo ou `>= hoje`. Quem foi técnico e hoje é docente não entra em "técnicos".
- `personStatuses` padrão, quando omitido: `Ativo`, `Férias`, `Afastado para Qualificação`, `Licença Maternidade`, `Licença Geral`, `Cessão de Servidor`. Ficam de fora `Falecido`, `Desligado`, `Bloqueado`, `Removido`, `Redistribuído`, `Vacância`, `Exonerado`, `Aposentado` (ver seção 7).
- Ids informados (departamento, curso, cargo, nível) são validados ao salvar (`404` se não existirem). Se um deles for apagado depois, o critério só deixa de casar com alguém; o grupo não quebra.

**Resolução de membros** (`MailingGroupMembersResolver`), usada na listagem de membros, na contagem e na criação do aviso:

- `DYNAMIC`: uma query `SELECT DISTINCT person ... FROM person JOIN person_link ... [JOIN users/user_roles]` montada a partir dos critérios, com paginação para a listagem e `COUNT` para a contagem. Fica num repositório próprio do módulo `notification` que lê as tabelas de `core`/`accounts`; nenhum use case de `core` muda.
- `STATIC`: join de `mailing_group_members` com `person`. Não aplica filtro de status: quem o admin adicionou à mão recebe, a menos que se enquadre nas regras abaixo.
- Nos dois tipos, a pessoa só vira destinatário se tiver `email` preenchido **e** `isActiveMail = true`. A listagem de membros mostra todos, com um campo `reachable` e o motivo (`NO_EMAIL`, `MAIL_DISABLED`), para o admin entender por que a contagem de destinatários é menor que a de membros.
- Usa `Person.email`. `secondaryEmail` não é usado nesta versão (ver seção 7).

**Operações:**

- CRUD do grupo. `type` não muda depois de criado; para converter, cria-se outro grupo.
- Em grupo `STATIC`: adicionar e remover membros por `personIds`, em `POST`/`DELETE /mailing-groups/:id/members`, mesmo padrão de rota da RFC 0005 (`POST`/`DELETE` no mesmo caminho, delta e idempotente). Adicionar por email, como na RFC 0010, entra como conveniência (`POST .../members/by-email`).
- Em grupo `DYNAMIC`: rotas de membros respondem `409`; a forma de mudar os membros é editar os critérios.
- Prévia de critérios sem salvar (`POST /mailing-groups/preview`), para o admin ver quantas pessoas um filtro pega enquanto monta o grupo.
- Apagar grupo é permitido mesmo se já foi usado em avisos (o aviso guarda cópia, 4.4).

**Autorização:** subject CASL `MailingGroup`, só ADMIN, como `Announcement`.

## 5. Precedente no projeto

- **Provider abstrato + `useClass` por env:** `src/shared/container/providers/StorageProvider/index.ts` (`local`/`s3`) e o próprio `MailProvider/index.ts`. Mantido para o provider e repetido para a fila (`MAIL_QUEUE`).
- **Provider de integração externa relança erro, lifecycle sem crash no construtor:** RFC 0007, seções 4 e 8.
- **Agendamento com `@nestjs/schedule`** (usado na reconciliação): `glpi-service-order.provider.ts` (`@Cron('*/10 * * * *')`) e `ScheduleModule.forRoot()` em `src/app.module.ts`.
- **Autorização só por CASL, ADMIN via `MANAGE all`:** RFC 0002 e RFC 0013; `src/modules/casl/factories/casl-ability-factory.ts:58-62`.
- **Busca de usuários por role:** `UserRepository.findByRoleNames` / `findAllByRole` (`src/modules/accounts/domain/user.repository.ts:18-23`).
- **Rotas dedicadas de membros N:N com `POST`/`DELETE` no mesmo caminho, delta e idempotente:** RFC 0005 / design 0001 (`servicebook/subgroup/:id/coordinators`). Adicionar por email: RFC 0010 / design 0004.
- **Busca de pessoa por email:** `PersonRepository.findByEmail` (RFC 0010).
- **Filtro dinâmico salvo como critério:** não há precedente no projeto.
- **Testes de integração com container:** `@testcontainers/postgresql` já usado; o mesmo mecanismo serve para Redis.
- **Fila de mensagens / Redis:** não há precedente no projeto. Este seria o primeiro.

## 6. Consequências

### 6.1 Positivas

- Recuperação de senha passa a funcionar de fato em produção, e sai imediatamente (sem polling).
- Admins conseguem enviar avisos por email com registro de entrega por destinatário.
- O limite do Gmail vira configuração: o sistema espera em vez de ser bloqueado, e emails transacionais têm cota reservada.
- Taxa e pausa por quota valem para todas as instâncias da API ao mesmo tempo.
- Nenhum envio se perde em restart, deploy ou perda do Redis (o Postgres guarda o estado; a reconciliação republica).
- Trocar de Gmail para outro servidor SMTP (relay institucional, serviço pago) é só mudar env.
- Remove código morto e configurações de outros projetos (remetentes `redeamamenta` e `rentx`).
- O admin monta públicos reutilizáveis: grupos dinâmicos por vínculo acompanham o cadastro sem manutenção, e grupos estáticos cobrem listas ad hoc (comissões, conselhos).
- Pessoas sem conta na plataforma também recebem avisos, porque o membro do grupo é a `Person`.
- O `isActiveMail`, que já existia sem uso, passa a funcionar como opt-out.
- A fila e o Redis servem de base para notificações futuras (chamados, agendamentos) e para a fila de sincronização com o GLPI (RFC 0007, Alternativa D).

### 6.2 Negativas / trade-offs aceitos

- **Redis é infraestrutura nova** para operar: container, volume, senha, monitoramento e configuração correta de persistência (`appendonly`, `noeviction`). Configurado errado, o Redis perde jobs (recuperados pela reconciliação, com atraso) ou o BullMQ se comporta mal.
- **Estado em dois lugares.** O status vive no Postgres e o agendamento no Redis; a consistência entre os dois depende da reconciliação e da idempotência por `jobId`.
- **Avisos grandes demoram.** Com 10/min, 1.000 destinatários levam cerca de 1h40; acima do orçamento diário, o restante sai no dia seguinte. O front precisa mostrar progresso, não "enviado".
- Tabela `mail_messages` cresce (HTML renderizado por destinatário). Precisa de rotina de limpeza (ex.: apagar `html`/`text` de linhas `SENT` com mais de 90 dias, mantendo os metadados). Jobs concluídos no Redis também precisam de limpeza (`removeOnComplete` / `removeOnFail` com limite).
- A conta Gmail remetente vira dependência operacional: senha de app expirada/revogada pausa todos os envios até alguém trocar a credencial.
- Duas dependências novas (`bullmq`, `@nestjs/bullmq`).
- **O módulo `notification` lê tabelas de `core` e `accounts` direto na query de resolução de membros.** É um acoplamento ao esquema dessas tabelas: renomear coluna de `person_link` quebra a resolução. Aceito porque a alternativa (passar por repositórios de `core` com filtro) exigiria mudar `PersonRepository` para um caso só deste módulo.
- **A qualidade do grupo dinâmico depende da qualidade do cadastro de vínculos.** Vínculo sem `endDate` para alguém que já saiu, ou `linkType` errado, vira email para a pessoa errada.

## 7. Riscos e perguntas em aberto

- **Categoria de impacto e janela de aviso são sugestão.** Marquei "Requer infraestrutura nova" porque depende do Redis e de uma conta Google institucional dedicada com credencial, que não estão sob controle de quem implementa, e "Afeta consumo do front" pelas rotas novas de avisos. Quem revisar confirma.
- **Onde o Redis vai rodar e quem cuida dele.** A proposta é um container no mesmo `docker-compose.yaml` da API. Não sei se o NTI prefere um Redis gerenciado/compartilhado, nem quem fica responsável por backup, atualização e monitoramento.
- **Qual conta vai enviar?** Conta Workspace da UFAL (limite de 2.000/dia) ou `@gmail.com` pessoal (por volta de 500/dia, sem número oficial)? Os valores padrão da 4.7 supõem Workspace. Não sei se a UFAL permite criar conta de serviço dedicada nem se o admin do Workspace mantém senhas de app habilitadas.
- **Senha de app vs. OAuth2.** A proposta começa com senha de app por simplicidade. Se o Workspace da UFAL bloquear senhas de app, será preciso OAuth2 (refresh token de um client OAuth do Google Cloud), que o nodemailer suporta, mas exige criar o projeto no Google Cloud e definir quem é dono dele.
- **A taxa (10/min, 2 conexões) não tem base em limite publicado.** O Google não documenta limite de conexões nem de taxa por minuto via SMTP; o valor é conservador e deve ser ajustado observando respostas `421` em produção.
- **Limite de destinatários externos.** Se os destinatários forem majoritariamente externos ao domínio remetente (ex.: alunos com email pessoal cadastrado), o limite efetivo pode ser 2.000 externos únicos/dia, não 2.000 mensagens. Não verifiquei como os emails estão distribuídos entre `@ufal.br` e domínios externos na base.
- **Entregabilidade.** Avisos em massa de uma conta Gmail podem cair em spam ou levar a conta a ser marcada. Não avaliei SPF/DKIM do domínio remetente nem se o volume esperado justifica um relay institucional ou serviço transacional desde o início.
- **Quais status de `Person` entram por padrão nos grupos dinâmicos.** A lista da 4.9 é proposta minha. Não sei, por exemplo, se aposentados devem receber avisos institucionais, nem se `Bloqueado` significa só bloqueio de acesso ou desligamento. Quem revisar (ou o admin) precisa confirmar.
- **Os dados de vínculo estão confiáveis?** A resolução assume que vínculos encerrados têm `endDate` preenchido. Não verifiquei na base quantos vínculos ativos sem `endDate` pertencem a pessoas que já saíram, nem quantas `Person` ativas estão sem `email`. Vale rodar essas contagens antes de liberar a feature.
- **`secondaryEmail`.** Não é usado. Se muitas pessoas tiverem só o email secundário preenchido, ou o principal desatualizado, talvez valha usar o secundário como fallback. Não sei qual dos dois a instituição considera o oficial.
- **Grupo híbrido.** Fica fora (seção 3.4). Se o admin precisar com frequência de "dinâmico menos fulano", vale adicionar `includedPersonIds`/`excludedPersonIds`.
- **Quem pode gerenciar grupos.** Proponho só ADMIN. Se outras roles (ex.: `HUMANRESOURCES_ADMIN`) precisarem criar grupos ou enviar avisos, muda a regra CASL e talvez o escopo dos grupos por unidade.
- **Opt-out / LGPD e o `isActiveMail`.** Proponho usar o `isActiveMail` da `Person` como opt-out. Mas hoje ele está inconsistente (2.5): `create-person.usecase.ts` força `true` mesmo quando o DTO manda `false`, e o construtor da entidade usa `false`. Antes de depender dele, isso precisa ser corrigido, e alguém precisa decidir se avisos institucionais obrigatórios devem ignorar o opt-out. Também não está decidido se o email precisa de link de descadastro.
- **Formatação do corpo.** Texto puro é o mais seguro. Se o front quiser editor rico, será preciso aceitar Markdown ou HTML sanitizado, decisão a fazer com o front no design doc.
- **Envio duplicado.** Se o worker morrer depois do SMTP aceitar a mensagem e antes de gravar `SENT`, o BullMQ devolve o job (stalled) e o destinatário recebe duas vezes. A checagem de status no início do job reduz, mas não elimina. Aceitei o risco (at-least-once); não há forma barata de evitar via SMTP.
- **Bull Board.** O painel ajudaria a operar a fila, mas expô-lo exige proteger a rota (só ADMIN, ou só na rede interna). Fica fora do escopo desta RFC até decidirem se vale.
- **Enumeração de usuários no reset de senha.** `POST /password/forgot` responde `400 User not found` para email não cadastrado, o que permite descobrir quais emails têm conta. Está fora do escopo deste RFC (mudaria contrato com o front), mas fica registrado.
- **Retenção de `mail_messages`.** A tabela guarda o HTML e o texto renderizados de cada email, por destinatário, sem prazo. Isso inclui os links de redefinição de senha (com token) e os endereços de email dos destinatários, que são dados pessoais. A proposta é apagar só o `html`/`text` de linhas `SENT` depois de um prazo configurável, mantendo todos os metadados (destinatário, assunto, status, tentativas, erro, `sent_at`, `announcement_id`, `person_id`), marcar o que foi limpo em `content_purged_at`, limpar o conteúdo transacional (reset de senha) logo depois do envio e nunca apagar as linhas, porque as contagens de entrega dos avisos dependem delas. O texto dos avisos já fica em `announcements.body`. Os 90 dias citados na seção 6.2 são um número meu, não uma política: não sei qual prazo de guarda a UFAL exige para comunicações oficiais, nem se avisos institucionais precisam de retenção maior. Quem responde pela política de dados precisa definir. **Padrão provisório (2026-10-23):** se ninguém definir a política, vale o padrão de 90 dias (`MAIL_RETENTION_DAYS`), escolhido sem política validada e alterável por quem responde pelos dados, só mudando a variável, sem deploy de código. Como a tabela começa vazia no deploy, nenhuma linha chega a 90 dias antes de 90 dias depois do go-live, e esse é o prazo para objeções antes de qualquer apagamento, que é irreversível. A limpeza do conteúdo do reset de senha (links com token) é uma questão de segurança, não de retenção, e não depende dessa resposta. Adiado de forma deliberada, enquanto o volume é pequeno; deve ser feito antes de os avisos entrarem em produção (issue #195).

## 8. Escopo de aplicação futura

Convenção para o projeto inteiro, não só para este módulo:

- **Todo envio de email passa pelo `EnqueueMailUseCase`.** Nenhum use case chama `IMailProvider` diretamente; só o worker. Notificações futuras (abertura/atualização de chamado, aprovação de agendamento) devem enfileirar com `priority` adequada.
- **Templates de email ficam em `src/shared/views/mail/`** e são renderizados pelo `MailTemplateRenderer`, nunca por caminho de arquivo montado no use case.
- **Remetente e credenciais só por env.** Nada de endereço fixo no código.
- **Notificações futuras para públicos (não para uma pessoa específica) usam grupos de email**, em vez de cada módulo montar sua própria consulta de destinatários.
- **Processamento em segundo plano usa BullMQ sobre o Redis introduzido aqui.** Filas futuras (em especial a sincronização com o GLPI da RFC 0007, Alternativa D) seguem o mesmo padrão: estado de negócio no Postgres, job no Redis só com o id, publicação após o commit, reconciliação para o dual-write e `jobId` igual ao id da entidade para idempotência. Cada fila nova é um `@Processor` próprio; não se cria um segundo mecanismo de fila.
- **Broker com roteamento entre serviços (ex.: RabbitMQ)** só deve ser reavaliado, em RFC própria, se outros sistemas da UFAL passarem a publicar ou consumir eventos deste backend.

---

*A parte interna (provider, fila, correção da recuperação de senha) depende de aprovação ativa de quem controla a conta remetente e o ambiente onde o Redis vai rodar, por exigir infraestrutura nova. As rotas de avisos exigem confirmação ativa do front antes de prosseguir, conforme a tabela do Passo 3 do guia de fluxo.*
