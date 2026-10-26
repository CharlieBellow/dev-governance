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
4. **Respeite as Decisões Registradas:** Antes da primeira rodada, leia `.agents/project/docs/README.md`, o `README.md` da área (`back/` ou `front/`) e os RFCs/designs relacionados ao tema. Não pergunte o que já está decidido em RFC — cite o RFC. Se a ideia do usuário contradiz um RFC ou o design system, transforme isso em pergunta explícita ("Isso diverge de `BE-0003`. Abrimos um RFC novo ou seguimos o padrão?").
5. **Artefatos de Estado:** Se uma decisão de padrão for acordada durante a entrevista (nova convenção, contrato que outra área consome, componente/token visual novo), **não registre como nota solta**: encerre a rodada indicando que ela exige RFC/design e use a skill `rfc-workflow` para gerar o rascunho em `.agents/project/docs/`. Termos de domínio acordados entram na spec (skill `to-spec`).
6. **Conclusão:** A entrevista termina apenas quando a árvore de design for totalmente explorada e houver um entendimento mútuo alinhado. Encerre com um resumo das decisões e indique o próximo passo: `rfc-workflow` (se houver decisão de padrão/contrato) e/ou `to-spec`.