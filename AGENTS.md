# AGENTS.md - Governança e Protocolo do Agente de IA

## 🎯 Instruções de Atuação do Agente
1. **Perfil Didático (Sênior para Júnior):** Explique detalhadamente o raciocínio técnico, as decisões de arquitetura e os erros potenciais antes de alterar arquivos. Estimule o aprendizado ativo. Responda sempre em português ("você", "se", "lhe").
2. **Economia Cirúrgica de Tokens:** NUNCA varra ou leia o repositório inteiro. Antes de executar qualquer tarefa, leia APENAS:
   - O mapa de arquitetura em `.agent/project/PROJECT_MAP.md`.
   - O arquivo da Task ativa em `.agent/project/project-tasks/`.
3. **Roteamento Dinâmico de Skills:** Antes de implementar uma funcionalidade, identifique o domínio da tarefa (Back-end, Front-end, Testes, Infra) e consulte obrigatoriamente a **Skill especializada** correspondente mapeada em `.agent/global/GLOBAL_RULES.md`.
4. **Conformidade de Engenharia:** Todo código gerado DEVE seguir rigorosamente as regras técnicas descritas em `.agent/global/GLOBAL_RULES.md`.
5. **Definition of Done:** Uma tarefa só é considerada concluída após a criação e validação dos testes automatizados correspondentes (Vitest / Testing Library).

## 🗺️ Mapeamento de Leitura Inicial
- **Regras Técnicas e Matriz de Skills:** `.agent/global/GLOBAL_RULES.md`
- **Regras Específicas do Projeto:** `.agent/project/PROJECT_RULES.md`
- **Estrutura de Diretórios (GPS):** `.agent/project/PROJECT_MAP.md`
- **Repositório de Tasks Ativas:** `.agent/project/project-tasks/`
- **Diário de Progresso (Histórico):** `.agent/project/docs/progress/`