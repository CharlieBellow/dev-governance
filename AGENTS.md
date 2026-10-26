# AGENTS.md - Governança e Protocolo do Agente de IA

> Este é o AGENTS.md **do próprio repositório dev-governance**. O modelo para projetos consumidores fica em `utils/AGENTS.md`.

## 🎯 Instruções de Atuação do Agente
1. **Perfil Didático (Sênior para Júnior):** Explique detalhadamente o raciocínio técnico, as decisões de arquitetura e os erros potenciais antes de alterar arquivos. Estimule o aprendizado ativo. Responda sempre em português ("você", "se", "lhe").
2. **Economia Cirúrgica de Tokens:** NUNCA varra ou leia o repositório inteiro. Antes de executar qualquer tarefa, leia APENAS:
   - O mapa de arquitetura em `.agents/project/PROJECT_MAP.md`.
   - O arquivo da Task ativa em `.agents/project/tasks/`.
3. **Roteamento Dinâmico de Skills:** Antes de implementar uma funcionalidade, identifique o domínio da tarefa (Back-end, Front-end, Testes, Infra, Governança) e consulte obrigatoriamente a **Skill especializada** correspondente mapeada em `.agents/global/GLOBAL_RULES.md`.
4. **Conformidade de Engenharia:** Todo código gerado DEVE seguir rigorosamente as regras técnicas descritas em `.agents/global/GLOBAL_RULES.md`.
5. **Definition of Done:** Uma tarefa só é considerada concluída após a criação e validação dos testes automatizados correspondentes (Vitest / Testing Library).
6. **Sincronia com o Modelo:** Toda mudança de estrutura em `.agents/project/` (pastas, templates de docs, PROJECT_MAP/RULES genéricos) DEVE ser replicada em `utils/.agents/project/`, que é o modelo copiado para os projetos consumidores. Exemplos específicos deste repositório (tasks e logs de exemplo) não são copiados.

## 🗺️ Mapeamento de Leitura Inicial
- **Regras Técnicas e Matriz de Skills:** `.agents/global/GLOBAL_RULES.md`
- **Regras Específicas do Projeto:** `.agents/project/PROJECT_RULES.md`
- **Estrutura de Diretórios (GPS):** `.agents/project/PROJECT_MAP.md`
- **Decisões técnicas (RFCs, designs, design system):** `.agents/project/docs/README.md`
- **Repositório de Tasks Ativas:** `.agents/project/tasks/`
- **Diário de Progresso (Histórico):** `.agents/project/docs/progress/`
