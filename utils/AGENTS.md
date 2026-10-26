# AGENTS.md - Governança e Protocolo do Agente de IA

> Modelo do dev-governance (`utils/AGENTS.md`). Vai para a **raiz** do projeto; se o projeto já tiver um AGENTS.md/CLAUDE.md, mescle este conteúdo nele.
> Neste projeto, `.agents/global/` = `node_modules/dev-governance/.agents/global/` (skills e regras globais, instaladas como dependência) e `.agents/project/` = pasta local do projeto.

## 🎯 Instruções de Atuação do Agente
1. **Perfil Didático (Sênior para Júnior):** Explique detalhadamente o raciocínio técnico, as decisões de arquitetura e os erros potenciais antes de alterar arquivos. Responda sempre em português.
2. **Economia Cirúrgica de Tokens:** NUNCA varra ou leia o repositório inteiro. Antes de executar qualquer tarefa, leia APENAS:
   - O mapa de arquitetura em `.agents/project/PROJECT_MAP.md`.
   - O arquivo da Task ativa em `.agents/project/tasks/`.
3. **Roteamento Dinâmico de Skills:** Antes de implementar, identifique o domínio da tarefa (Back-end, Front-end, Testes, Infra, Governança) e consulte a **Skill** correspondente na matriz de `node_modules/dev-governance/.agents/global/GLOBAL_RULES.md`.
4. **Conformidade de Engenharia:** Todo código gerado DEVE seguir `GLOBAL_RULES.md` (global) e `.agents/project/PROJECT_RULES.md` (projeto). Em conflito, o projeto prevalece.
5. **Definition of Done:** Uma tarefa só é concluída após a criação e validação dos testes automatizados correspondentes (Vitest / Testing Library).

## 📚 Documentação Técnica e Governança de Decisões

As decisões técnicas do projeto ficam em `.agents/project/docs/`.

Antes de sugerir ou implementar **mudança de padrão** (novo endpoint, convenção de rota, estrutura de módulo, **novo componente visual, variante ou token**) ou algo com **contrato externo** (API consumida pelo front ou por outro serviço), leia **[`.agents/project/docs/README.md`](.agents/project/docs/README.md)** e use a skill `rfc-workflow`.

- **Back-end:** leia também `.agents/project/docs/back/README.md`.
- **Front-end:** leia também `.agents/project/docs/front/README.md` e **`.agents/project/docs/front/design-system.md`** antes de criar qualquer componente.
- **Commits e PRs:** siga `.agents/project/docs/convencoes-git.md`.

Se a tarefa for implementação direta, seguindo o que já está documentado, não é necessário criar documento novo.

**Divergência nunca é silenciosa:** se a tarefa pedir algo que contradiz um RFC ou o design system, pare, aponte o conflito e proponha um RFC — não implemente por fora.

## 🗺️ Mapeamento de Leitura Inicial
- **Regras Técnicas e Matriz de Skills:** `node_modules/dev-governance/.agents/global/GLOBAL_RULES.md`
- **Skills:** `node_modules/dev-governance/.agents/global/skills/`
- **Regras Específicas do Projeto:** `.agents/project/PROJECT_RULES.md`
- **Estrutura de Diretórios (GPS):** `.agents/project/PROJECT_MAP.md`
- **Decisões técnicas (RFCs, designs, design system):** `.agents/project/docs/`
- **Specs de feature:** `.agents/project/docs/specs/`
- **Tasks Ativas:** `.agents/project/tasks/`
- **Diário de Progresso:** `.agents/project/docs/progress/`
