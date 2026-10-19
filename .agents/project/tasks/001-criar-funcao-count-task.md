# Spec de Tarefa: 001 - Criar Função Count

## 🎯 Problema / Issue Relatada
- **Descrição:** Precisamos criar uma função utilitária simples de contagem (`countItems`) em TypeScript que receba um array de elementos e uma condição opcional (predicate), retornando a quantidade de itens que satisfazem a condição. O objetivo é testar o fluxo do agente.
- **Módulo Alvo:** `scripts/utils/count.ts`

## 📋 Critérios de Aceite
1. A função deve ser pura, tipada com *generics* do TypeScript (sem uso de `any`).
2. Deve conter tratamento para arrays vazios ou nulos de forma segura (boas práticas de segurança de tipo).
3. Deve vir acompanhada de um teste unitário correspondente usando Vitest (`count.spec.ts`).