---
name: to-tickets
description: "Quebra uma spec, plano ou conversa em tasks de fatia vertical (tracer-bullets) com dependências, salvas em .agents/project/tasks/<NN>-<slug>.md. Use quando o usuário pedir para fatiar uma spec em tasks/tickets."
---

# Skill: To Tickets (Fatiamento Vertical e Quebra de Tarefas)

## Propósito
Quebrar uma especificação, plano ou conversa atual em um conjunto de **tarefas em fatias verticais (*tracer-bullets*)**: fatias que cortam completamente todas as camadas (Caso de uso do Domínio, Schema do Prisma, Controller NestJS, Testes em Vitest), declarando suas dependências (blockers).

## Regras de Fatiamento
1. **Vertical, não Horizontal:** Nunca crie uma tarefa apenas para "DTOs" ou "banco de dados". Cada fatia deve entregar um comportamento final verificável ponta a ponta.
2. **Dimensionadas para Contexto Fresco:** Cada fatia deve caber confortavelmente em uma única janela de contexto fresca.
3. **Pré-fatoração:** Identifique pré-requisitos ou refatorações necessárias ("Torne a mudança fácil, depois faça a mudança fácil").
4. **Refatores Amplos:** Se uma mudança quebradora abranger todo o código, use uma sequência de expansão e contratação (*expand-contract*).

## Formato de Saída (Arquivos Locais em `.agents/project/tasks/`)
Escreva um arquivo Markdown por tarefa na pasta **`.agents/project/tasks/<NN>-<slug>.md`**, numerados a partir de `01` em ordem de dependência:

# <NN>: <Título da Tarefa>

**O que construir:** Comportamento ponta a ponta que esta tarefa faz funcionar.
**Bloqueado por:** Os números/títulos dos pré-requisitos, ou "Nenhum (pode iniciar imediatamente)".
**Status:** pronto-para-agente

- [ ] Critério de aceitação 1 (com cobertura em Vitest)
- [ ] Critério de aceitação 2