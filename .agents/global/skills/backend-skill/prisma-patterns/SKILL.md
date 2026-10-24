---
name: prisma-patterns
description: Padrões do Prisma ORM para backends TypeScript — design de schema, otimização de queries, transações, paginação e armadilhas críticas como updateMany retornar contagem em vez de registros, timeout do $transaction, migrate dev resetar o banco, @updatedAt ignorado em escritas em massa e esgotamento de conexões em serverless. Use ao escrever um schema ou query Prisma, ou ao depurar transações, migrations ou limites de conexão em serverless.
metadata:
  origin: ECC
---

# Padrões Prisma

Padrões de produção e armadilhas não óbvias do Prisma ORM em backends TypeScript.

> **Verifique sua versão antes de aplicar os padrões.** A API do Prisma mudou entre as versões principais:
>
> ```bash
> npx prisma --version
> ```
>
> Diferenças de API importantes entre versões:
> - `relationJoins` pode carregar relações via JOIN em vez de queries separadas, mas pode causar explosão de linhas em relações 1:N grandes ou `include` profundos — faça benchmark das duas abordagens
> - Foram adicionados o modificador de campo `omit` e a API de Client Extensions `prisma.$extends`
> - **Instalações mais novas**: o pacote pode se chamar `prisma` em vez de `@prisma/client`; o `PrismaClient` pode exigir um driver adapter (ex.: `@prisma/adapter-pg`); o `datasource.url` pode ficar em `prisma.config.ts` em vez de `schema.prisma`
> - Os comandos da CLI (`migrate dev`, `migrate deploy`, `generate`) não mudaram entre as versões

## Quando Ativar

- Ao projetar ou modificar models e relações do schema Prisma
- Ao escrever queries, transações ou lógica de paginação
- Ao usar `updateMany`, `deleteMany` ou qualquer operação em massa
- Ao rodar ou planejar migrations de banco
- Ao fazer deploy em ambientes serverless (Vercel, Lambda, Cloudflare Workers)
- Ao implementar soft delete ou filtragem de linhas multi-tenant

## Conceitos Fundamentais

### Estratégia de IDs

| Estratégia | Use quando | Evite quando |
|---|---|---|
| `@default(cuid())` | Escolha padrão — seguro para URL, ordenável, sem colisões | Sistemas externos exigem IDs sequenciais |
| `@default(uuid())` | É necessária interoperabilidade com sistemas fora do Prisma | Tabelas com muita escrita (UUIDs aleatórios fragmentam índices B-tree) |
| `@default(autoincrement())` | Tabelas de junção internas, logs de auditoria | IDs expostos publicamente (revela a quantidade de registros) |

### Padrões do Schema

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique  // @unique já cria um índice — não precisa de @@index
  name      String
  role      Role      @default(USER)
  posts     Post[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([createdAt])
  @@index([deletedAt, createdAt]) // composto para queries de soft delete + ordenação
}
```

- Adicione `@@index` em toda foreign key e coluna usada em `WHERE` ou `ORDER BY`.
- Declare `deletedAt DateTime?` desde o início quando soft delete for um requisito previsível — adicioná-lo depois exige uma migration em tabela em produção.
- `updatedAt @updatedAt` é preenchido automaticamente pelo Prisma apenas em `update` e `upsert` (veja nos Antipadrões a armadilha do update em massa).

### `include` vs `select`

| | `include` | `select` |
|---|---|---|
| Retorna | Todos os campos escalares + relações especificadas | Apenas os campos especificados |
| Use quando | Precisa da maioria dos campos mais uma relação | Caminhos críticos, tabelas grandes, evitar buscar dados demais |
| Performance | Pode buscar demais em tabelas largas | Payload mínimo, mais rápido em grandes volumes |
| Nota Prisma 5 | Usa JOIN por padrão (`relationJoins`) | Igual |

```ts
// include — todas as colunas + relação
const user = await prisma.user.findUnique({
  where: { id },
  include: { posts: { select: { id: true, title: true } } },
});

// select — lista explícita de permitidos
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true },
});
```

Nunca retorne entidades cruas do Prisma nas respostas da API — mapeie para DTOs de resposta para controlar os campos expostos:

```ts
// RUIM: vaza passwordHash, deletedAt e campos internos
return await prisma.user.findUniqueOrThrow({ where: { id } });

// BOM: mapeamento explícito para DTO
const user = await prisma.user.findUniqueOrThrow({ where: { id } });
return { id: user.id, name: user.name, email: user.email };
```

### Escolha da Forma de Transação

| Situação | Use |
|---|---|
| Operações independentes, sem dependência entre si | Forma de array |
| Uma etapa depende do resultado de outra anterior | Forma interativa |
| Envolve chamadas externas (e-mail, HTTP) | Totalmente fora da transação |

```ts
// Forma de array — agrupada em uma única ida ao banco
const [user, post] = await prisma.$transaction([
  prisma.user.update({ where: { id }, data: { name } }),
  prisma.post.create({ data: { title, authorId: id } }),
]);

// Forma interativa — use apenas o client tx, nunca o client prisma externo
const post = await prisma.$transaction(async (tx) => {
  const user = await tx.user.findUniqueOrThrow({ where: { id } });
  if (user.role !== 'ADMIN') throw new Error('Forbidden');
  return tx.post.create({ data: { title, authorId: user.id } });
});
```

### Singleton do PrismaClient

Cada instância de `PrismaClient` abre seu próprio pool de conexões. Instancie uma única vez.

```ts
// lib/prisma.ts

// Opção A — inicialização com adapter (exigida por instalações mais novas do Prisma)
import { PrismaClient } from '@prisma/client'; // ou o caminho do client gerado no seu setup
import { PrismaPg } from '@prisma/adapter-pg';

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Opção B — inicialização direta (instalações antigas, sem adapter)
// import { PrismaClient } from '@prisma/client';
// export const prisma = globalForPrisma.prisma ?? new PrismaClient({ ... });
```

Use a Opção A se a sua instalação do Prisma exigir o argumento `adapter` no construtor do `PrismaClient`.
Use a Opção B se `new PrismaClient()` funcionar sem argumentos. Deixe o compilador dizer qual é a correta.

O padrão com `globalThis` evita instâncias duplicadas durante o hot reload (Next.js, nodemon, ts-node-dev).

### Problema N+1

Carregar relações dentro de um loop dispara uma query por linha.

```ts
// RUIM: N+1 — uma query extra por usuário
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { authorId: user.id } });
}

// BOM: query única
const users = await prisma.user.findMany({ include: { posts: true } });
```

Com `relationJoins` no Prisma 5+, a forma com `include` usa um único JOIN. Em conjuntos 1:N grandes isso pode aumentar o tamanho do resultado — faça benchmark das duas abordagens se a relação puder retornar muitas linhas por pai.

## Exemplos de Código

### Paginação por Cursor (preferida para feeds e grandes volumes)

```ts
async function getPosts(cursor?: string, limit = 20) {
  const items = await prisma.post.findMany({
    where: { published: true },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }, // ordenação secundária evita paginação instável com timestamps duplicados
    ],
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasNextPage = items.length > limit;
  if (hasNextPage) items.pop();

  return { items, nextCursor: hasNextPage ? items[items.length - 1].id : null };
}
```

Busque `limit + 1` e remova o último — é a forma canônica de detectar `hasNextPage` sem uma query extra de contagem. Sempre inclua um campo único (ex.: `id`) como `orderBy` secundário para evitar paginação instável quando várias linhas têm o mesmo timestamp. Use paginação por offset apenas quando o usuário precisar pular para páginas arbitrárias (tabelas de admin).

### Soft Delete

```ts
// Sempre filtre explicitamente — não dependa de middleware (esconde comportamento, difícil de depurar)
const activeUsers = await prisma.user.findMany({ where: { deletedAt: null } });

await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
await prisma.user.update({ where: { id }, data: { deletedAt: null } }); // restaurar
```

### Tratamento de Erros

```ts
import { Prisma } from '@prisma/client'; // ou o caminho do client gerado no seu setup

try {
  await prisma.user.create({ data: { email } });
} catch (e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') throw new ConflictError('E-mail já cadastrado');
    if (e.code === 'P2025') throw new NotFoundError('Registro não encontrado');
    if (e.code === 'P2003') throw new BadRequestError('O registro referenciado não existe');
  }
  throw e;
}
```

Códigos comuns: `P2002` violação de unicidade · `P2025` não encontrado · `P2003` violação de foreign key.

Capture na fronteira do service e traduza para erros de domínio. Nunca exponha mensagens cruas do Prisma para quem consome a API.

### Pool de Conexões — Serverless

Coloque os parâmetros de conexão diretamente na `DATABASE_URL` — concatenar strings quebra se a URL já tiver query parameters (ex.: `?schema=public`):

```bash
# .env — preferido: parâmetros embutidos na URL
DATABASE_URL="postgresql://user:pass@host/db?connection_limit=1&pool_timeout=20"

# Com um pooler externo (PgBouncer, pooler do Supabase)
DATABASE_URL="postgresql://user:pass@host/db?pgbouncer=true&connection_limit=1"
```

```ts
// Vercel, AWS Lambda e runtimes serverless parecidos:
// limite o pool a 1 por instância; connection_limit e pool_timeout são controlados pela DATABASE_URL

// Setup com adapter (se a sua instalação do Prisma exigir adapter):
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Setup direto (se a sua instalação do Prisma não exigir adapter):
// const prisma = new PrismaClient();
```

## Antipadrões

### `updateMany` retorna uma contagem, não registros

```ts
// RUIM: o resultado é { count: 2 } — users[0] é undefined
const users = await prisma.user.updateMany({ where: { role: 'GUEST' }, data: { role: 'USER' } });

// BOM: capture os IDs primeiro, depois atualize e então busque só as linhas afetadas
const targets = await prisma.user.findMany({
  where: { role: 'GUEST' },
  select: { id: true },
});
const ids = targets.map((u) => u.id);
await prisma.user.updateMany({ where: { id: { in: ids } }, data: { role: 'USER' } });
const updated = await prisma.user.findMany({ where: { id: { in: ids } } });
```

O mesmo vale para `deleteMany` — retorna `{ count: n }`, nunca as linhas apagadas.

### A forma interativa do `$transaction` expira após 5 segundos

```ts
// RUIM: chamada externa dentro da transação passa dos 5s padrão → "Transaction already closed"
await prisma.$transaction(async (tx) => {
  const user = await tx.user.findUniqueOrThrow({ where: { id } });
  await sendWelcomeEmail(user.email); // chamada externa
  await tx.user.update({ where: { id }, data: { emailSent: true } });
});

// BOM: chamadas externas fora da transação
const user = await prisma.user.findUniqueOrThrow({ where: { id } });
await sendWelcomeEmail(user.email);
await prisma.user.update({ where: { id }, data: { emailSent: true } });

// Só aumente o timeout quando um processamento em massa realmente precisar
await prisma.$transaction(async (tx) => { ... }, { timeout: 30_000 });
```

### `migrate dev` pode resetar o banco

O `migrate dev` detecta divergência (drift) no schema e pode pedir para resetar o banco, apagando todos os dados.

```bash
# NUNCA em dev compartilhado, staging ou produção
npx prisma migrate dev --name add_column

# Seguro em todo lugar, exceto no dev local individual
npx prisma migrate deploy

# Verificar drift sem aplicar
npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma \
  --shadow-database-url "$SHADOW_DATABASE_URL"
```

### Editar manualmente um arquivo de migration quebra deploys futuros

O Prisma calcula o checksum de cada arquivo de migration. Editar depois de aplicada causa `P3006 checksum mismatch` em todo ambiente onde a original já rodou. Crie uma nova migration em vez disso.

### Mudanças de schema que quebram compatibilidade exigem migration em várias etapas

Adicionar `NOT NULL` a uma coluna existente ou renomear uma coluna em uma única migration vai travar a tabela ou apagar dados. Use expandir-e-contrair:

```bash
# Etapa 1: crie a migration localmente e depois faça o deploy
npx prisma migrate dev --name add_new_column   # apenas local
npx prisma migrate deploy                       # staging / produção
```

```ts
// Etapa 2: preencha os dados (rode em um script ou job de migration, não no shell)
await prisma.user.updateMany({ data: { newColumn: derivedValue } });
```

```bash
# Etapa 3: crie localmente a migration da restrição NOT NULL e depois faça o deploy
npx prisma migrate dev --name make_new_column_required  # apenas local
npx prisma migrate deploy                               # staging / produção
```

### `@updatedAt` não dispara no `updateMany`

O `@updatedAt` é preenchido automaticamente apenas em `update` e `upsert`. Escritas em massa o deixam desatualizado.

```ts
// RUIM: updatedAt continua com o valor antigo
await prisma.post.updateMany({ where: { authorId }, data: { published: true } });

// BOM
await prisma.post.updateMany({
  where: { authorId },
  data: { published: true, updatedAt: new Date() },
});
```

### Soft delete + `findUniqueOrThrow` vaza registros apagados

O `findUniqueOrThrow` lança `P2025` apenas quando a linha não existe no banco. Linhas com soft delete ainda existem e são retornadas sem erro.

O `findUniqueOrThrow` exige um campo com restrição de unicidade no `where` — adicionar `deletedAt: null` junto com `id` quebra o tipo, porque `{ id, deletedAt }` não é uma restrição de unicidade composta. Use `findFirstOrThrow` em vez disso.

```ts
// RUIM: retorna usuário com soft delete
const user = await prisma.user.findUniqueOrThrow({ where: { id } });

// RUIM: erro de tipo no Prisma — { id, deletedAt } não é restrição de unicidade
const user = await prisma.user.findUniqueOrThrow({ where: { id, deletedAt: null } });

// BOM: findFirstOrThrow aceita condições arbitrárias no where
const user = await prisma.user.findFirstOrThrow({ where: { id, deletedAt: null } });
```

### `deleteMany` sem `where` apaga todas as linhas

```ts
// RUIM: limpa a tabela silenciosamente
await prisma.post.deleteMany();

// BOM
await prisma.post.deleteMany({ where: { authorId: userId } });
```

## Boas Práticas

| Regra | Motivo |
|---|---|
| `migrate deploy` no CI/CD, `migrate dev` só localmente | `migrate dev` pode resetar o banco ao detectar drift |
| Mapeie entidades para DTOs de resposta | Evita vazar campos internos |
| Capture `PrismaClientKnownRequestError` na fronteira do service | Traduza para erros de domínio |
| Prefira os métodos `*OrThrow` a checagens manuais de null | Lança P2025 automaticamente; use `findFirstOrThrow` ao filtrar campos não únicos |
| `connection_limit=1` + pooler externo em serverless | Evita esgotar as conexões |
| Sempre informe `where` no `deleteMany` | Evita apagar a tabela por acidente |
| Preencha `updatedAt: new Date()` manualmente no `updateMany` | `@updatedAt` ignora escritas em massa |

## Skills Relacionadas

- `nestjs-patterns` — camada de services do NestJS que integra o Prisma
- `postgres-patterns` — índices e ajuste de conexões no nível do PostgreSQL
- `database-migrations` — planejamento de migrations em várias etapas para produção
- `backend-patterns` — design geral de API e da camada de services
