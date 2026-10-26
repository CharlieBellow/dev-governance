---
name: to-tickets
description: "Quebra uma spec, plano ou conversa em tasks de fatia vertical (tracer-bullets) com dependências, salvas em .agents/project/tasks/<NNN>-<slug>#<issue>.md seguindo .agents/global/task/template-task.md. Use quando o usuário pedir para fatiar uma spec em tasks/tickets."
---

# Skill: To Tickets (Fatiamento Vertical e Quebra de Tarefas)

## Propósito
Quebrar uma especificação, plano ou conversa atual em um conjunto de **tarefas em fatias verticais (*tracer-bullets*)**: fatias que cortam completamente todas as camadas (Caso de uso do Domínio, Schema do Prisma, Controller NestJS, Testes em Vitest), declarando suas dependências (blockers).

## Regras de Fatiamento
1. **Vertical, não Horizontal:** Nunca crie uma tarefa apenas para "DTOs" ou "banco de dados". Cada fatia deve entregar um comportamento final verificável ponta a ponta.
2. **Dimensionadas para Contexto Fresco:** Cada fatia deve caber confortavelmente em uma única janela de contexto fresca.
3. **Pré-fatoração:** Identifique pré-requisitos ou refatorações necessárias ("Torne a mudança fácil, depois faça a mudança fácil").
4. **Refatores Amplos:** Se uma mudança quebradora abranger todo o código, use uma sequência de expansão e contratação (*expand-contract*).
5. **Rastreabilidade:** Toda task referencia a spec de origem e os RFCs/designs que ela implementa. A task **não redefine** contrato nem padrão — aponta para onde ele está decidido.
6. **Bloqueio por Decisão:** Se a spec depende de RFC com status `Proposto`, toda task que implementa essa decisão recebe `Bloqueado por: aprovação do RFC <ID>`.

## Formato de Saída (Arquivos Locais em `.agents/project/tasks/`)
1. Descubra o **maior número já usado** em `.agents/project/tasks/` e continue a partir dele (numeração global de 3 dígitos — nunca reinicie em `001` para uma nova spec, para não colidir com tasks anteriores).
2. Escreva um arquivo por tarefa em **`.agents/project/tasks/<NNN>-<slug>#<issue>.md`**, em ordem de dependência, seguindo **`.agents/global/task/template-task.md`**. O sufixo `#<issue>` é o número da issue que gerou a task (ex.: `001-rota-delete-users#42.md`). Se o número da issue não estiver na conversa ou na spec, **pergunte antes de criar os arquivos**.
3. Ao final, liste as tasks criadas com suas dependências em formato de árvore, agrupadas por issue.
