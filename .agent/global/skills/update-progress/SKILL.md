# Skill: Update Progress / Diário de Bordo

## Descrição
Analisa as alterações recentes no código, os testes executados e o escopo da tarefa atual para gerar um registro de progresso limpo e estruturado (`task-log.md`), garantindo a continuidade do contexto entre diferentes sessões ou computadores.

## Instruções para Execução do Agente
Quando esta skill for acionada, o agente deve:
1. **Inspecionar:** Verificar o status atual do git (`git status`, arquivos alterados) e a spec que estava sendo desenvolvida.
2. **Resumir:** Sintetizar o que foi concluído, quais decisões técnicas ou arquiteturais foram tomadas e quais testes foram validados.
3. **Gerar Log:** Produzir um arquivo Markdown seguindo estritamente o template abaixo pronto para ser salvo na pasta de progresso do projeto.

---

## Template de Saída do Log (Obrigatório)

# Log de Progresso - [NOME_DA_TASK_OU_FEATURE]

## 🎯 O que foi feito?
- **[Módulo/Camada]:** [Descrição objetiva da alteração, ex: Criada a entidade de Domínio Task com validações puras]

## 🧪 Validação e Testes
- [Descrever os testes executados, ex: Testes unitários rodados via Vitest com sucesso]

## 🚀 Próximo Passo Imediato
- [O que falta fazer para concluir esta spec ou qual é a próxima micro-tarefa pendente]