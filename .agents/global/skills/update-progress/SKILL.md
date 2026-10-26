---
name: update-progress
description: "Gera o diário de bordo/log de progresso da task ativa em .agents/project/docs/progress/<numero>-<task>-ISS<issue>-log.md a partir do git status e dos testes executados. Use quando o usuário pedir para atualizar o progresso ou registrar o log de uma task."
---

# Skill: Atualizar Progresso / Diário de Bordo

## Descrição
Gera o relatório retrospectivo de progresso e diário de bordo (`<numero>-<nome-da-task>-ISS<issue>-log.md`) salvando-o estritamente na pasta `.agents/project/docs/progress/`.

## Instruções para Execução do Agente
Quando esta skill for acionada, o agente deve:
1. **Identificar:** Ler o nome e o número da Task ativa (ex: `001-rota-delete-users-ISS42`) — o log herda o mesmo sufixo `-ISS<issue>` da task.
2. **Inspecionar:** Verificar as alterações reais no git (`git status`) e os testes executados.
3. **Salvar:** Criar o arquivo de log seguindo a convenção de nome exata na pasta `.agents/project/docs/progress/`.

---

## Template de Saída do Log (Obrigatório)
O arquivo gerado DEVE ser salvo em: `.agents/project/docs/progress/[NUMERO]-[NOME_DA_TASK]-ISS[ISSUE]-log.md`

# Log de Progresso: [NUMERO] - [NOME_DA_TASK] (#[ISSUE])

## 🎯 O que foi feito?
- **[Módulo/Camada]:** [Descrição objetiva e técnica da alteração realizada]

## 🧪 Validação e Testes
- [Descrever os testes executados e validados via Vitest]

## 🚀 Próximo Passo Imediato
- [O que falta ou qual a próxima micro-tarefa pendente, se houver]