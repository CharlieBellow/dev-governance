# Regras Específicas do Projeto: To-Do API

## 1. Escopo Tecnológico
- Backend construído com NestJS, TypeScript estrito e arquitetura modular.
- Validação de payload nas bordas utilizando **Zod**.

## 2. Camadas e Responsabilidades
- **Domínio (`src/domain/`):** Entidades puras de Tarefas (ex: `Task`). Totalmente independentes de Prisma, TypeORM ou NestJS.
- **Aplicação (`src/application/`):** Casos de uso (ex: `CreateTaskUseCase`) e contratos de repositório (Interfaces).
- **Infraestrutura (`src/infrastructure/`):** Implementação de repositórios (Prisma/TypeORM), Controllers do NestJS e filtros de exceção.

## 3. Padrões de Qualidade e Segurança
- Obrigatório o uso de **Vitest** para testes unitários isolados nas regras de negócio.
- Tratamento centralizado de erros de domínio.
- Proibido expor entidades de banco de dados diretamente nos controllers; utilize DTOs de resposta validados.