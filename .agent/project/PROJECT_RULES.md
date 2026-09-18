# Regras Específicas do Projeto: To-Do API

## 1. Escopo Inicial
- O projeto consiste em uma API backend construída com NestJS e TypeScript estrito.
- Foco inicial: Módulo de Tarefas (Tasks).

## 2. Camadas e Responsabilidades
- **Domínio (`src/domain/`):** Contém as entidades puras (ex: `Task`) e objetos de valor. Nenhuma dependência externa (sem Prisma, sem NestJS).
- **Casos de Uso (`src/application/`):** Contém a lógica de aplicação (ex: `CreateTaskUseCase`).
- **Infraestrutura (`src/infrastructure/`):** Repositórios TypeORM/Prisma, Controllers do NestJS e conexões externas.

## 3. Padrões de Qualidade
- Obrigatório uso de Vitest para testes unitários nas entidades e casos de uso.
- Tratamento de erros centralizado via Exception Filters do NestJS.