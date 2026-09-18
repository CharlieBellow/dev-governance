# AGENTS.md - Governança e Regras do Projeto

## 🗺️ Mapeamento de Diretórios (Busque apenas aqui)
- **Domínio (Regras puras):** `src/domain/` (Agnóstico de frameworks: sem Prisma, sem NestJS).
- **Casos de Uso (Aplicação):** `src/application/`
- **Infraestrutura (Bordas):** `src/infrastructure/` (Repositórios, Controllers, ORM).
- **Especificações (Specs):** `specs/`
- **Testes:** `src/**/*.spec.ts`
- **Regras gerais de atuação (Global Rules):** `/.agent/.antigravity/` (Regras e Diretrizes Gerais de codificação). Contem o arquivo GLOBAL_RULES.md e as pastas /skills e /specs globais 
- **Regras específicas do projeto (Project Rules):** `/.agent/project/` (Regras e Diretrizes específicas do projeto para codificação). Contem o arquivo PROJECT_RULES.md e as pastas /skills e /specs do projeto 
- **Documentação (Docs):** `/.agent/project/docs/` (Documentação do projeto). Contem a pasta /progress passo a passo de implementação com decisões arquiteturais e de regras de negócio. 

## ⚙️ Regras de Ouro e Boas Práticas
1. **Busca Cirúrgica:** Nunca leia o projeto inteiro. Leia apenas o arquivo da spec correspondente e os arquivos citados no escopo.
2. **Stack Obrigatória:** TypeScript estrito (`strict mode`), NestJS (Back-end) e NextJS (Front-end).
3. **Padrões Arquiteturais:** Clean Architecture, Domain-Driven Design (DDD), SOLID, MVVM, DRY e KISS.
4. **Clean Code:** Funções pequenas com responsabilidade única. Proibido uso de `any`. Tratamento centralizado de exceções (sem `try/catch` genéricos espalhados).
5. **Definition of Done (Testes):** Nenhuma feature é considerada pronta sem cobertura de testes unitários (Vitest) para o Domínio e Casos de Uso.