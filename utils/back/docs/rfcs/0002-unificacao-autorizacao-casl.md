# RFC 0002: Unificação do padrão de autorização em CASL

| Campo | Valor |
|---|---|
| **Status** | Proposto |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-08-13 |
| **Módulo(s) afetado(s)** | `casl` (compartilhado), `accounts`, `academic`, `humanresources`, `servicebook`, `scheduling`, `core/room` |
| **Categoria de impacto** | ( ) Interno, sem impacto externo &nbsp;&nbsp; (x) Afeta consumo do front &nbsp;&nbsp; ( ) Quebra contrato existente com o front &nbsp;&nbsp; ( ) Requer infraestrutura nova |
| **Janela de aviso aplicada** | 48–72h úteis, com confirmação ativa do time de front — ver ressalva na seção 7 sobre esta classificação poder precisar ser a de "quebra contrato existente" |
| **Confirmação ativa recebida de** | (aguardando) |
| **Pessoas marcadas no PR** | @ |

---

## 1. Problema

O projeto tem hoje dois padrões de autorização coexistindo em branches diferentes, sem que nenhum RFC tenha decidido qual seguir:

- Em `feat/role-authorization`, os módulos Accounts, Academic, Human Resources e Service Book usam **CASL** (`@casl/ability`) — abilities definidas centralmente em `CaslAbilityFactory` e aplicadas via `PoliciesGuard` (`src/modules/casl/guards/policies.guard.ts`), com decorators declarativos (`@Subject(User)`, `@CheckPolicies(...)`) nos controllers.
- Em `dev`, Scheduling e Room implementam autorização **manual**, embutida diretamente no use case. Exemplo concreto em `src/modules/scheduling/application/schedule/use-cases/create-schedule/create-schedule.usecase.ts`:

```ts
const isAdmin = (user.roles as string[] ?? []).includes(UserRole.ADMIN);

if (!isAdmin) {
  if (room.authorizedPersons.length === 0) {
    throw new ForbiddenException(
      'Esta sala requer autorização de administrador para reservas.',
    );
  }
  const isAuthorized = room.authorizedPersons.some((u) => u.id === userId);
  if (!isAuthorized) {
    throw new ForbiddenException(
      'Você não está na lista de usuários autorizados a reservar esta sala.',
    );
  }
}
```

`feat/role-authorization` nunca foi mergeada com `dev` (divergiram no commit `0cdc176`) e ninguém decidiu formalmente qual dos dois padrões o projeto deveria seguir daqui pra frente. Sem essa decisão, o merge das branches não tem critério: alguém vai ter que escolher manter, estender ou substituir o código de autorização de Scheduling/Room durante o merge, e sem RFC essa escolha fica implícita em quem fizer o merge.

## 2. Contexto

Não há requisito formal (NEC/RF) específico sobre a *implementação* de autorização na documentação oficial do projeto — o requisito mais próximo é de controle de acesso geral (RN05: "acesso somente com permissão, concedida conforme descrição das roles"), que não prescreve mecanismo.

Achado relevante ao investigar o histórico: já existe um módulo `src/modules/casl/` **em `dev`**, presente desde o commit-base comum (`0cdc17696d132d14ef0d1a4bec10f52e1ed50fc1`, commit `b920bc5 "bring basic casl config"`) — com `CaslAbilityFactory`, `Action` enum e `UserRole` enum cobrindo só Service Book (`ServiceOrder`, `ServiceOrderFollowUp`). Esse módulo **nunca foi conectado**: não está em `src/app.module.ts`, não existe `PoliciesGuard`, nenhum controller usa decorator de policy. `dev` carrega esse código morto desde a divergência, sem tocá-lo — é evidência de que a intenção de usar CASL já existia no projeto antes da divergência, só não foi completada nesse branch.

`feat/role-authorization` pegou esse mesmo ponto de partida e o expandiu: reestruturou `src/modules/casl/` em subpastas (`enums/`, `factories/`, `guards/`, `decorators/`, `interfaces/`, `registry/`), adicionou `PoliciesGuard`, decorators (`@Subject`, `@CheckPolicies`), um registry de repositórios (`CaslRepositoryRegistry`) para pré-carregar a entidade antes do check, e abilities para Accounts/Academic/HR/Service Book — cobrindo tanto RBAC puro (`can(Action.MANAGE, 'all')` para `ADMIN`) quanto ABAC (ex. `can(Action.UPDATE, ServiceOrder, ['status'], isInResponsibles)`).

`dev`, nesse mesmo período, resolveu o mesmo tipo de problema (controle de acesso a um recurso por relacionamento) de forma manual em Scheduling/Room — decisão nunca registrada em RFC (é, ela própria, um gap retroativo).

## 3. Alternativas consideradas

### Alternativa A: Manter e estender o padrão manual (RBAC ad-hoc por use case)

- Descrição: seguir o padrão já usado em `CreateScheduleUseCase` — checagem de role/relacionamento escrita à mão dentro de cada use case — e replicar esse padrão para os módulos que hoje não têm nenhuma checagem granular (Accounts, Academic, HR, catálogo de Service Book, Core). O código já pronto em `feat/role-authorization` seria descartado ou usado só como referência.
- Prós: sem curva de aprendizado de uma lib nova; lógica de autorização fica no mesmo arquivo que a regra de negócio, sem indireção.
- Contras: cada use case reimplementa a mesma checagem "é admin OU está numa lista de relacionamento" com pequenas variações — já visível em `CreateScheduleUseCase`, que mistura em ~15 linhas a checagem de autorização com validação de data/hora/recorrência. Não há lugar central para auditar "quem pode fazer o quê" — a resposta está espalhada em N use cases. Descartaria ~5 módulos de trabalho já implementado em `feat/role-authorization` (Accounts, Academic, HR, Service Book), incluindo testes.

### Alternativa B: Adotar CASL como padrão único (escolhida)

- Descrição: seguir o que `feat/role-authorization` já implementa — `CaslAbilityFactory` define as abilities por role/atributo, `PoliciesGuard` aplica o check centralmente via decorator nos controllers — e estender esse mesmo padrão para migrar Scheduling e Room (que hoje não o usam) na integração das branches.
- Prós: RBAC (`can(Action.MANAGE, 'all')`) e ABAC (`can(Action.UPDATE, ServiceOrder, ['status'], isInResponsibles)`) expressos na mesma sintaxe, num único lugar (`CaslAbilityFactory`) — a pergunta "quem pode fazer o quê" tem uma resposta central, não espalhada. Guard genérico (`PoliciesGuard`) elimina a necessidade de escrever a checagem de novo em cada use case. Trabalho de ~4 módulos já implementado e (parcialmente) testado em `feat/role-authorization`.
- Contras: curva de aprendizado da sintaxe do CASL (`AbilityBuilder`, condições no estilo MongoDB) para quem for estender abilities novas. `PoliciesGuard` hoje busca a entidade via `findById` antes de checar a ability (ver `src/modules/casl/guards/policies.guard.ts`, bloco `if (id && subjectClass)`) sempre que há `id` na rota, mesmo quando o usuário não teria acesso de jeito nenhum — query desnecessária a corrigir (ver seção 6.2).

### Alternativa C: Sistema de autorização novo, separado de ambos

- Descrição: descartar tanto o código manual quanto o CASL já escrito, avaliar uma terceira lib ou solução própria.
- Prós: nenhum vantagem concreta identificada frente às alternativas A/B.
- Contras: descarta trabalho já implementado dos dois lados sem motivo técnico que justifique; nenhum problema levantado nas alternativas A/B (mistura de concerns, falta de lugar central, query extra) exige uma terceira solução — são resolvíveis dentro do CASL. Não considerada seriamente.

## 4. Decisão

Alternativa B. O critério decisivo: as regras de autorização deste projeto não são só "role X pode fazer Y" (RBAC puro) — várias dependem de atributo ou relacionamento (dono do recurso, coordenador de subgrupo, campo específico editável, pessoa autorizada numa sala). A prova está no próprio código manual de `CreateScheduleUseCase`: a checagem `room.authorizedPersons.some((u) => u.id === userId)` já é, na prática, uma regra ABAC escrita à mão. RBAC puro (Alternativa A) não elimina essa necessidade — só a implementa sem lugar central, como already aconteceu em Scheduling. CASL expressa RBAC e ABAC na mesma sintaxe (`can(Action.UPDATE, ServiceOrder, ['status'], isInResponsibles)` já demonstra isso rodando em `feat/role-authorization`), então resolve o problema de fundo em vez de adiá-lo módulo por módulo.

## 5. Precedente no projeto

`feat/role-authorization` já aplica o padrão nos controllers de Accounts:

```
src/modules/accounts/presentation/user/controllers/create-user.controller.ts
```

```ts
@Controller('/users')
@Subject(User)
export class CreateUserController {
  @Post()
  async handle(@Body() dto: CreateUserRequestDto): Promise<UserResponseDto> { ... }
}
```

O `PoliciesGuard` infere a ação (`CREATE` a partir do `POST`), resolve a ability do usuário via `CaslAbilityFactory`, e barra a requisição antes de chegar no use case caso a role não tenha permissão — sem nenhuma checagem manual no controller ou use case. O mesmo padrão está aplicado em `role`, `permission` (Accounts) e nas entidades de Service Book (`ServiceOrder`, `ServiceOrderFollowUp`).

Não há precedente de aplicação em Scheduling/Room — essa parte é trabalho novo desta decisão, não migração de um padrão já existente ali.

## 6. Consequências

### 6.1 Positivas

- Um único lugar (`CaslAbilityFactory`) responde "quem pode fazer o quê", cobrindo tanto regra por role quanto por atributo/relacionamento.
- Controllers/use cases deixam de carregar lógica de autorização misturada com regra de negócio (caso concreto: `CreateScheduleUseCase` deixa de ter ~15 linhas de checagem de admin/lista de autorizados no meio da validação de agendamento).
- ~4 módulos (Accounts, Academic, HR, Service Book) entram já com autorização granular funcionando, sem trabalho de implementação adicional — só o merge.
- Abre caminho para fechar os gaps de autorização hoje existentes no catálogo de Service Book e em Core (ver issue-mãe do merge) usando o mesmo padrão, sem decisão de arquitetura nova para cada um.

### 6.2 Negativas / trade-offs aceitos

- Ações que hoje funcionam para qualquer usuário autenticado (ex. criar/editar/deletar `User`, `Course`, `EmployeeRole`) passam a exigir role específica (`ADMIN` ou similar) após o merge — usuários sem essa role recebem `403` onde antes recebiam sucesso. Ver seção 7.
- Scheduling e Room precisam ser migrados do padrão manual para CASL como parte deste trabalho — não é só "aceitar o que já existe", é reescrever `CreateScheduleUseCase` e o fluxo de autorização de `Room`.
- `PoliciesGuard` faz `findById` antes de checar a ability sempre que a rota tem `id`, mesmo para usuário sem nenhuma chance de acesso — query desnecessária. Correção (checagem por classe via `ability.can(action, SubjectClass)` antes do fetch) fica registrada como melhoria a aplicar, não bloqueia esta decisão.
- Curva de aprendizado do CASL para quem for adicionar abilities novas no futuro.

## 7. Riscos e perguntas em aberto

- **Import quebrado após o merge:** `create-schedule.usecase.ts` (dev) importa `UserRole` de `@modules/casl/userrole.enum` (caminho plano). `feat/role-authorization` moveu esse arquivo para `@modules/casl/enums/userrole.enum`. Após o merge, esse import não vai resolver — é erro de compilação (não falha silenciosa), mas precisa ser corrigido como parte do trabalho de migração de Scheduling, não é automático.
- **Módulo `casl` duplicado nos dois branches, mas não idêntico:** `dev` tem uma cópia não-modificada do estado do merge-base (`action.enum.ts`, `casl-ability-factory.ts`, `casl.module.ts`, `userrole.enum.ts`, todos na raiz de `src/modules/casl/`); `feat/role-authorization` reestruturou esses mesmos arquivos em subpastas e os expandiu. Como o lado `dev` não foi modificado desde a base, a expectativa é que o merge do Git resolva isso automaticamente a favor da versão de `feat` (detecção de rename), mas isso não foi validado rodando o merge de verdade — é um risco técnico do merge, não desta decisão de arquitetura em si, mas nasce diretamente dela.
- **Regra "sala sem autorizados = bloqueada, exceto admin"** está implementada hoje como `if` dentro do use case (`room.authorizedPersons.length === 0` → bloqueia). Não está claro ainda como essa condição específica (lista vazia) se traduz para uma condição CASL declarativa (`can`/`cannot`) sem lógica condicional no meio do factory — fica como ponto a resolver na migração de Scheduling/Room, não nesta RFC.
- **Sem medição de paridade de comportamento:** não há suíte de teste rodando os dois padrões lado a lado para confirmar que a migração de Scheduling/Room para CASL preserva exatamente as mesmas regras de acesso hoje implementadas manualmente. Risco aceito, mitigado por escrever os testes de CASL para Scheduling/Room como parte do trabalho de migração (fora do escopo desta RFC).
- **Tabela `permissions` fica sem efeito real na autorização.** `role` continua funcional: `LoginUserUseCase` (`login-user.usecase.ts:33`) monta o claim `roles` do JWT a partir de `user.roles?.map((role) => role.name)`, e é esse array de nomes que `CaslAbilityFactory` compara contra o enum `UserRole`. Já `permissions`/`permission_roles`/`user_permissions` continuam existindo e CRUD-operáveis via API (`create-permission.controller.ts`, `create-role-permissions.controller.ts`), mas `CaslAbilityFactory.defineAbility()` nunca lê `claims.permissions` nem consulta a tabela `permissions` — as regras de ability são hardcoded por nome de role no TypeScript, não derivadas do que está gravado em `permission_roles`. Na prática, anexar uma permissão a uma role hoje não muda nada no que essa role pode fazer.
  - Alternativa considerada e descartada por ora: tornar as abilities do CASL dirigidas por dado (ler `permission_roles` em vez de hardcoded). Rejeitada porque as regras atuais carregam condição ABAC embutida no código (ex. `can(Action.UPDATE, ServiceOrder, ['status'], isInResponsibles)`), e representar isso como dado exigiria um formato sério pra serializar action+subject+condição em `Permission.name`/`description` — decisão de arquitetura maior, sem requisito concreto pedindo essa granularidade hoje (RN05 já fala em acesso "conforme descrição das roles", não por permissão individual).
  - Proposta a confirmar na revisão: aposentar o modelo de permissão granular (remover ou não migrar os endpoints de escrita de `permissions`/`permission_roles`/`user_permissions`), deixando `role` como único mecanismo de concessão de acesso, para não manter uma funcionalidade que parece operante mas não tem efeito.

## 8. Escopo de aplicação futura

Esta decisão é convenção para o projeto: **todo controle de acesso granular novo (por role, por dono do recurso, por relacionamento) deve ser expresso via CASL** (`CaslAbilityFactory` + `PoliciesGuard` + decorators), não implementado manualmente dentro de use case, controller ou service. Isso vale tanto para os módulos que ainda não têm nenhuma checagem granular (catálogo de Service Book, Core — `Person`, `PersonLink`, `Department`, `Block`, `Room`) quanto para qualquer módulo futuro. A migração de Scheduling/Room do padrão manual para CASL é trabalho decorrente desta decisão, não opcional — enquanto não for feita, o projeto convive com os dois padrões simultaneamente, o que esta RFC busca encerrar.

---

*Este RFC segue o modelo de "lazy consensus" apenas se a categoria de impacto confirmada for a de menor janela; dado o risco levantado na seção 7 sobre a classificação, a decisão final sobre exigir ou não confirmação ativa do consumidor (front) deve ser tomada por quem revisar antes de considerar a janela de aviso encerrada.*
