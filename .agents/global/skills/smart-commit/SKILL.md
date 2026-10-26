---
name: smart-commit
description: "Analisa git status/diff e gera mensagem de commit no padrão Conventional Commits mais o corpo da Pull Request no template do projeto. Use quando o usuário pedir mensagem de commit, commit inteligente ou texto de PR das alterações atuais."
---

# Skill: Gerador de Commit Convencional e PR

## Descrição
Analisa as alterações recentes no repositório (via `git status` / `git diff`), interpreta o contexto da última conversa ou do diário de progresso, e gera automaticamente uma mensagem de commit seguindo o padrão **Conventional Commits** e um template estruturado para Pull Request.

## Instruções para Execução do Agente
Quando esta skill for acionada, execute os seguintes passos internamente:
0. **Convenções do projeto:** Se existir `.agents/project/docs/convencoes-git.md` no projeto, ele é a fonte da verdade (tipos, escopos, rodapé `RFC:`, `BREAKING CHANGE`) e prevalece sobre esta skill. Se existir `.github/pull_request_template.md` na raiz, use-o no lugar do template abaixo.
1. **Inspeção:** Verifique os arquivos modificados e o diff atual do projeto.
2. **Classificação:** Defina o tipo de alteração (`feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `ci`, `perf`) e o escopo por área (`back/<modulo>`, `front/<modulo>`, `rfc`, `design`).
3. **Geração do Commit:** Escreva uma mensagem de commit objetiva usando o padrão Conventional Commits (ex: `feat(back/users): adiciona validação de regra de negócio para usuário`). Se a mudança implementa um RFC, inclua `RFC: <ID>` no rodapé.
4. **Geração do Corpo da PR:** Preencha rigorosamente o template com base no que foi alterado e nas discussões técnicas recentes, referenciando RFC/design em `.agents/project/docs/` quando houver.

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
