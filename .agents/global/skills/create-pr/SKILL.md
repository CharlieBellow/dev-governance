---
name: create-pr
description: "Gera o texto de Pull Request de uma issue a partir de todas as suas tasks (.agents/project/tasks/*#<issue>.md) e logs (.agents/project/docs/progress/*#<issue>-log.md). Use quando o usuário pedir o texto/descrição da PR de uma issue ou task."
---

# Skill: Gerar Texto de Pull Request (Smart PR)

## Descrição
Lê **todas as tasks de uma issue** (`.agents/project/tasks/*#<issue>.md`) e os Logs de Progresso correspondentes (`.agents/project/docs/progress/*#<issue>-log.md`) para gerar um texto de Pull Request rico, estruturado, profissional e pronto para ser copiado.

## Como Acionar / Executar
Use o comando: `Gere o texto da PR da issue #[issue]`

## Instruções para o Agente
Quando acionado, o agente DEVE:
1. Listar as tasks da issue pelo sufixo do nome: `.agents/project/tasks/*#[issue].md`. Se alguma **não** estiver com status `concluído`, **pare** e liste o que falta — o PR só é gerado com todas as tasks da issue concluídas.
2. Ler os logs correspondentes em `.agents/project/docs/progress/*#[issue]-log.md`.
3. Sintetizar as informações combinando o problema inicial com a solução implementada, gerando o markdown abaixo.
4. Se o projeto tiver `.github/pull_request_template.md`, usar **esse** template (prevalece sobre o abaixo) e seguir `.agents/project/docs/convencoes-git.md` para o título.
5. Referenciar o RFC/design relacionado em `.agents/project/docs/` (back, front ou geral), quando houver.

---

## Template de Saída da PR (Obrigatório)

📝 **Resumo das Alterações**
Closes #[ISSUE]. Este Pull Request consolida as tasks `[NNN]`, `[NNN]`... da issue #[ISSUE], implementando os requisitos arquiteturais definidos em spec com foco em Clean Code, DDD e segurança.

🎯 **O que foi feito?**
- [Resumo técnico item 1 do que foi implementado]
- [Resumo técnico item 2 cobrindo DTOs, Zod ou Domínio]
- [Cobertura de testes unitários realizados]

🧠 **Motivação (Por que essa alteração?)**
[Resgatar do contexto da Task o problema original e por que a solução foi desenhada dessa forma, citando Clean Architecture, separação de camadas ou previsibilidade de negócio]

🧪 **Como testar?**
1. Certifique-se de que as dependências estão atualizadas.
2. Execute o comando de testes unitários específicos: `pnpm vitest run [caminho-do-teste]`
3. Valida se todos os cenários retornam verde (Green).

📋 **Tipo de Alteração**
[ ] Nova funcionalidade (feat)
[ ] Correção de bug (fix)
[ ] Refatoração de código (refactor)
[ ] Adição de testes (test)
[ ] Documentação (docs)