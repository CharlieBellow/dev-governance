<!-- exemplo de tarefa criada -->
# Log de Progresso - 001 Criar Tarefa (Domínio)

## 🎯 O que foi feito?
- **Domínio (`src/domain/exceptions/domain.exception.ts`):** Criada a classe abstrata base `DomainException`, permitindo tratamento centralizado futuro de qualquer erro de regra de negócio via `instanceof`.
- **Domínio (`src/domain/task/exceptions/invalid-task-title.exception.ts`):** Criada a exceção específica `InvalidTaskTitleException`, exigida pela Spec 001.
- **Domínio (`src/domain/task/value-objects/task-title.vo.ts`):** Criado o Value Object `TaskTitle`, encapsulando a regra "título não pode ser vazio nem conter apenas espaços em branco", com construtor privado + factory `create`.
- **Domínio (`src/domain/task/task.entity.ts`):** Criada a Entidade `Task`, com factory method estático `Task.create(title)`, geração de `id` via `node:crypto randomUUID`, invariante "toda tarefa nasce com `isCompleted: false`" e método `toJSON()` para o formato de saída (id, title, isCompleted). Zero dependência de frameworks (sem NestJS, sem Prisma).
- **Configuração de suporte:** Criados `package.json` e `tsconfig.json` (TypeScript `strict: true`) na raiz, apenas com `typescript`, `vitest` e `@types/node` como devDependencies, para viabilizar a execução dos testes exigidos pelo Definition of Done — sem introduzir nenhum framework de aplicação no domínio.

## 🧪 Validação e Testes
- `pnpm run typecheck` (`tsc --noEmit`): sem erros, TypeScript estrito validado.
- `pnpm run test` (Vitest): **16/16 testes passando**, cobrindo:
  - Criação de tarefa com sucesso (`isCompleted: false`, `id` gerado, título correto).
  - Unicidade do `id` entre tarefas distintas.
  - Trim de espaços nas extremidades do título.
  - Lançamento de `InvalidTaskTitleException` para título vazio, apenas espaços, `undefined`, `null` e valores não-string.
  - Formato de saída via `toJSON()` (id, title, isCompleted).
  - Comportamento de igualdade por valor do Value Object `TaskTitle`.

## 🚀 Próximo Passo Imediato
- Implementar a camada de Caso de Uso `CreateTaskUseCase` em `src/application/`, orquestrando a criação da `Task` a partir de um repositório (interface/porta), ainda sem qualquer dependência de infraestrutura concreta (Prisma/NestJS), conforme a Spec 001 e o `PROJECT_RULES.md`.
