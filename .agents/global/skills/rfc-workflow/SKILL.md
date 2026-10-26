---
name: rfc-workflow
description: "Classifica a tarefa e gera rascunho de RFC (leve/completo) ou design (API/UI) em .agents/project/docs/ ANTES do código. Use quando a tarefa envolver nova convenção, novo endpoint consumido por outra área, novo componente/variante/token visual, infraestrutura nova, ou divergência de um RFC existente."
---

# Skill: Fluxo de RFC e Design Docs

## Descrição
Garante que decisões de padrão e contratos sejam documentados **antes** da implementação, e que nenhuma mudança fuja do escopo já registrado do projeto (padrões do back, contratos de API, design system do front). A fonte completa das regras é `.agents/project/docs/README.md` e `.agents/project/docs/guia-fluxo-documentacao.md` do projeto.

## Instruções para o Agente
1. **Leia** `.agents/project/docs/README.md` e o `README.md` da área (`.agents/project/docs/back/` ou `.agents/project/docs/front/`). No front, leia também `.agents/project/docs/front/design-system.md`.
2. **Procure RFC existente** sobre o tema na área e em `.agents/project/docs/geral/rfcs/`. Se existir, siga-o. Se a tarefa contradiz um RFC, **pare e aponte a divergência** citando o ID (ex.: `BE-0003`).
3. **Classifique** a tarefa (tabela da seção "Se você é uma IA" em `.agents/project/docs/README.md`):
   - Implementação direta seguindo padrões → não gere documento; siga para a skill de implementação da área.
   - Decisão interna → `.agents/project/docs/_templates/rfc-leve.md`.
   - Afeta outra área / quebra contrato / altera design system / infra → `.agents/project/docs/_templates/rfc-completo.md`.
   - Endpoint consumido por outra parte → `.agents/project/docs/_templates/design-api.md` em `.agents/project/docs/back/designs/`.
   - Tela/feature nova no front → `.agents/project/docs/_templates/design-ui.md` em `.agents/project/docs/front/designs/`.
4. **Gere o rascunho** com o próximo número da área (`BE-`, `FE-`, `GER-`, `BE-D-`, `FE-D-`), preenchido com caminhos e trechos reais do código — nunca generalidades.
5. **Status sempre** `Proposto` / `Em design`. Categoria de impacto e janela de aviso são **sugestões** a confirmar por quem revisa.
6. **Atualize o índice** da área com o novo documento.
7. **Não implemente** o código de decisões que exigem confirmação ativa (tudo exceto "Interno") até a pessoa usuária confirmar que o RFC foi aprovado.

## Saída esperada
- Caminho do documento criado.
- Classificação proposta (área, categoria de impacto, janela) e o motivo.
- Lista de quem precisa ser notificado, conforme `.agents/project/docs/guia-fluxo-documentacao.md` (Passo 3) e a tabela de Responsáveis em `.agents/project/PROJECT_RULES.md` (seção 5).
- Próximo passo: aguardar aprovação (se exigida) e então `to-spec`, referenciando o documento criado.
