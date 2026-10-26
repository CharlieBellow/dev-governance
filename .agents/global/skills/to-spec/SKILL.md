---
name: to-spec
description: "Sintetiza a conversa, ADRs e vocabulário de domínio já acordados em uma especificação técnica salva em .agents/project/docs/specs/<feature>-spec.md, sem entrevistar o usuário. Use após um planejamento (ex.: grill-plan) quando o usuário pedir a spec."
---

# Skill: To Spec (Sintetizador de Especificação Técnica)

## Propósito
Sintetizar o contexto atual da conversa, decisões arquiteturais (ADRs) e o vocabulário de domínio em uma especificação técnica formal. **NÃO entreviste o usuário;** apenas sintetize o que já foi acordado.

## Processo e Estrutura de Saída
Gere um documento de especificação em Markdown seguindo exatamente este template e salve-o em **`.agents/project/docs/specs/<nome-da-feature>-spec.md`**:

### 0. Documentos Relacionados
- Issue: `#___`
- RFC(s): caminho em `.agents/project/docs/*/rfcs/` e **status** (ex.: `BE-0004 — Aceito`).
- Design(s): caminho em `.agents/project/docs/*/designs/`.
- Se a spec depende de um RFC ainda `Proposto`, declare: **"Bloqueada até aprovação de <ID>"**.

> A spec **não redecide** o que o RFC/design decidiu: contrato de API, convenção e componentes visuais vêm de lá, por referência. Se a conversa chegou a uma decisão de padrão que ainda não tem RFC, pare e indique a skill `rfc-workflow` antes de gerar a spec.

### 1. Declaração do Problema
O problema enfrentado pelo usuário sob a perspectiva dele.

### 2. Visão Geral da Solução
A solução arquitetural sob a perspectiva do usuário.

### 3. Histórias de Usuário (User Stories)
Uma lista detalhada e numerada de histórias de usuário:
- Formato: `1. As an <actor>, I want a <feature>, so that <benefit>`

### 4. Decisões de Implementação (DDD & Clean Architecture)
- Módulos/Camadas afetadas (Domínio, Aplicação, Infraestrutura).
- Esclarecimentos técnicos, escolhas arquiteturais e alterações de esquema (Prisma/MySQL).
- Evite caminhos de arquivos rígidos; foque nas fronteiras arquiteturais.

### 5. Estratégia de Testes
- Foco em comportamento em vez de detalhes de implementação.
- Requisitos de testes unitários usando **Vitest** para os casos de uso do Domínio.
- Testes de integração para repositórios e rotas.

### 6. Fora do Escopo e Notas Adicionais
- Limites explícitos e casos de borda não cobertos.