# Dev Governance & Engineering Standards

Este repositório centraliza a governança, os padrões arquiteturais e as skills dos agentes de IA para todos os projetos (como a API do TransCenso e futuros sistemas em NestJS, Next.js, Prisma e MySQL).

## Princípios de Engenharia
- **Clean Architecture & DDD:** Separação rígida entre Domínio (puro), Aplicação (casos de uso) e Infraestrutura (Prisma/NestJS).
- **TDD Rigoroso:** Ciclo Red -> Green -> Refactor utilizando **Vitest** para cobrir regras de negócio do Domínio.
- **Tipagem Estrita:** TypeScript em strict mode, imutabilidade e tratamento centralizado de exceções de domínio.

## Estrutura de Documentação (`docs/`)
Todo o planejamento gerado pelas IAs é armazenado de forma permanente e organizada na pasta `docs/` do projeto:
- **`docs/specs/`**: Especificações técnicas sintetizadas.
- **`docs/tasks/`**: Fatias de tarefas verticais (*tracer-bullets*).
- **`docs/adr/`**: Registros de Decisão Arquitetural.

## Fluxo de Trabalho com Agentes
1. **Planejamento:** `/grill-plan` (Entrevista em rodadas para debater requisitos e regras de negócio).
2. **Especificação:** `/to-spec` (Sintetiza o alinhamento em uma spec salva em `docs/specs/`).
3. **Fatiamento:** `/to-tickets` (Quebra a spec em tarefas verticais salvas em `docs/tasks/`).
4. **Implementação:** Execução guiada por TDD e Clean Code.



## PARA RODAR O PROJETO:

adicionar no projeto em que está trabalhando com os seguintes passos:

## 1. Crie ou edite o arquivo: pnpm-workspace.yaml:

`
onlyBuiltDependencies:
  - "dev-governance"
`

## 2. Crie ou edite o arquivo: package.json:
adicionando a linha: `"dev-governance": "git+https://github.com/CharlieBellow/dev-governance.git"`, em devDependencies
`
 "devDependencies": {
    "dev-governance": "git+https://github.com/CharlieBellow/dev-governance.git"
    }
`
## 3. Instale as dependências para que o dev dependence seja adicionado como dependência e não polua o projeto:

`bash
pnpm install
`

## 4. Adicione no seu arquivo AGENTS.md a informação de que o projeto se utiliza desse repositório para usar as skills:

### Diretrizes do Projeto ###
Este projeto utiliza o repositório Dev Governance para governança de código.

Siga estritamente as regras de Clean Code, arquitetura limpa e testes em Vitest presentes no repositório.
Consulte as skills globais disponíveis em ./node_modules/dev-governance/skills/.

## 5. Copie a estrutura de .agents/project na raiz do seu projeto.

Crie um pasta .agents no seu projeto.

Depois de instalar as dependências, procure a pasta dev-governance em node_modules e copie a pasta project e salve na pasta .agents do seu projeto. Essa é uma estrutura de pastas necessária para as skills savarem os arquivos .md gerados.