# Skill: Smart Conventional Commit & PR Generator

## Descrição
Analisa as alterações recentes no repositório (via `git status` / `git diff`), interpreta o contexto da última conversa ou do diário de progresso, e gera automaticamente uma mensagem de commit seguindo o padrão **Conventional Commits** e um template estruturado para Pull Request.

## Instruções para Execução do Agente
Quando esta skill for acionada, execute os seguintes passos internamente:
1. **Inspeção:** Verifique os arquivos modificados e o diff atual do projeto.
2. **Classificação:** Defina o tipo de alteração (`feat`, `fix`, `refactor`, `chore`, `test`) com base nas modificações.
3. **Geração do Commit:** Escreva uma mensagem de commit objetiva usando o padrão Conventional Commits (ex: `feat(domain): adiciona validação de regra de negócio para usuário`).
4. **Geração do Corpo da PR:** Preencha rigorosamente o template abaixo com base no que foi alterado e nas discussões técnicas recentes.

---

## Template de Saída da PR (Obrigatório)

## 🎯 O que foi feito?
- **[Área/Módulo]:** [Descrição clara do problema resolvido ou da funcionalidade implementada]

## 🚀 Tipo de Alteração
- [ ] Correção de bug (*bugfix*)
- [ ] Nova funcionalidade (*feat*)
- [ ] Refatoração de código (*refactor*)
- [ ] Ajustes de build e tipagem (*chore*)
- [ ] Atualização de testes (*test*)

## 🧠 Motivação (Por que essa alteração?)
- [Contexto rápido do porquê essa mudança foi necessária na arquitetura ou regra de negócio, ex: isolar o domínio de frameworks]

## 🧪 Como testar?
1. [Passos práticos ou comandos no terminal, ex: `pnpm vitest run`]
