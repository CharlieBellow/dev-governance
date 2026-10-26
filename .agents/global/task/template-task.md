# <NNN>: <Título da Tarefa> (#<issue>)

> Arquivo: `.agents/project/tasks/<NNN>-<slug>#<issue>.md` — ex.: `001-rota-delete-users#42.md`. O sufixo `#<issue>` liga a task à issue que a gerou.

| Campo | Valor |
|---|---|
| **Status** | pronto-para-agente / bloqueado / em-progresso / concluído |
| **Área** | back / front / geral |
| **Spec de origem** | `.agents/project/docs/specs/<feature>-spec.md` |
| **RFC(s)** | `.agents/project/docs/<area>/rfcs/<ID>-*.md` (ou "N/A") |
| **Design(s)** | `.agents/project/docs/<area>/designs/<ID>-*.md` (ou "N/A") |
| **Bloqueado por** | Números das tasks pré-requisito, "aprovação do RFC <ID>", ou "Nenhum (pode iniciar imediatamente)" |
| **Issue** | #<issue> (obrigatório — o mesmo número do sufixo do nome do arquivo) |

## O que construir
Comportamento ponta a ponta que esta tarefa faz funcionar (do ponto de vista de quem usa/consome).

## Camadas tocadas
- **Domínio:**
- **Aplicação:**
- **Infraestrutura:**
- **Front (se aplicável):** apenas componentes de `.agents/project/docs/front/design-system.md`

## Critérios de aceitação
- [ ] Critério 1 (com cobertura em Vitest)
- [ ] Critério 2

## Testes obrigatórios
- [ ] Caminho feliz
- [ ] Fronteiras / entradas malformadas
- [ ] Erros esperados (exceções de domínio / status HTTP)

## Fora do escopo desta task
- O que pertence a outra task ou foi adiado.

## Ao concluir
- Atualizar status para `concluído`.
- Gerar log com a skill `update-progress` em `.agents/project/docs/progress/<NNN>-<slug>#<issue>-log.md`.
- Commit no padrão de `.agents/project/docs/convencoes-git.md` com rodapé `Refs #<issue>` e `Task: <NNN>` (e `RFC: <ID>`, se houver).
