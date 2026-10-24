---
name: grill-plan
description: "Entrevista arquitetural interativa antes de codar: faz rodadas de perguntas numeradas com resposta recomendada sobre domínio (DDD), Clean Architecture, Zod, exceções de domínio e testes Vitest. Use ao planejar uma nova feature ou alteração, quando o usuário pedir para ser questionado/\"grill me\" ou antes de escrever código de implementação."
---

# Skill: Planejamento por Entrevista (Entrevista Arquitetural Interativa)

## Propósito
Quando invocada, impede que a IA gere código de implementação bruto imediatamente. Em vez disso, dispara uma entrevista estruturada e aprofundada para testar o seu raciocínio, descobrir requisitos ocultos e alinhar a lógica de domínio antes de codificar.

## Regras de Comportamento
1. **Nunca escreva código no primeiro comando** para novas funcionalidades ou alterações.
2. **Trabalhe em Rodadas (A Fronteira):** 
   - Analise a base de código e os requisitos atuais.
   - Apresente perguntas direcionadas e numeradas sequencialmente.
   - Forneça uma resposta recomendada ➡️ para cada pergunta, redigida de forma que um "sim" a aceite.
3. **Foco Direcionado por Domínio (DDD):** Direcione as perguntas para Clean Architecture (limites entre Domínio e Infraestrutura), validações com Zod, exceções customizadas de domínio e estratégias de testes com Vitest.
4. **Artefatos de Estado:** Se um termo de domínio ou uma decisão arquitetural importante for acordada durante a entrevista, documente-os ou atualize-os automaticamente na referência local do projeto (`.agents/project/docs/adr/` ou glossário) caso seja solicitado.
5. **Conclusão:** A entrevista termina apenas quando a árvore de design for totalmente explorada e houver um entendimento mútuo alinhado.