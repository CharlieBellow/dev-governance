# Guia de Fluxo — Documentação e Processo do Projeto

> Estrutura de pastas: ver [README.md](README.md#estrutura). Convenções de branch, commit e PR: ver [convencoes-git.md](convencoes-git.md).

Board: `Backlog (draft) → A Fazer (issue) → Em Progresso → Em Review → Feito`

---

## Passo 1 — Toda ideia nasce como draft no Backlog

Sem formalidade, só uma frase de contexto mínimo. Só se preocupa em escrever direito quando for virar issue de verdade.

## Passo 2 — Decide priorizar → vira issue real

Descrição objetiva: motivo + objetivo + área (`back`, `front` ou `geral`). Move para "A Fazer".

## Passo 3 — Precisa de RFC?

Pergunta-chave: **essa decisão estabelece ou muda um padrão que outras partes do sistema (ou pessoas, no futuro) vão seguir?**

- **Sim** → RFC na pasta da área (`back/rfcs/`, `front/rfcs/` ou `geral/rfcs/`), publicado como Pull Request.
- **Não** (implementação direta seguindo padrões já documentados) → segue direto para implementação.

Exemplos de "sim" por área:

| Área | Exige RFC |
|---|---|
| Back | Nova convenção de rota, nova estrutura de módulo, nova camada de erro, nova lib de validação/ORM, mudança de autenticação/autorização |
| Front | **Novo componente base ou nova variante** (ex.: um 4º tipo de botão), novo token ou valor visual fora dos tokens, nova lib de UI/estado/formulário, nova convenção de pastas ou de data fetching |
| Geral | Mudança de pipeline de CI, de fluxo de branches, de ferramenta de lint/format, de estrutura do monorepo |

### Se for RFC, o alcance do aviso depende do impacto:

| Impacto | Template | Escopo de notificação | Janela de aviso | Silêncio conta como aprovação? |
|---|---|---|---|---|
| **Interno**: não afeta outra área nem infraestrutura (ex.: padronização interna de erros, refactor isolado) | `rfc-leve.md` | Registro público, sem aprovação ativa | 24h ou "documentando e seguindo" | Sim (lazy consensus) |
| **Afeta outra área**: muda como um consumidor (front, back, outro serviço) integra, sem quebrar nada existente | `rfc-completo.md` | Notificar diretamente o(s) responsável(is) da área consumidora e pedir confirmação explícita | 48–72h úteis, com riscos já registrados no RFC | **Não.** Requer confirmação ativa. Se o prazo passar sem resposta, cobrar antes de prosseguir |
| **Quebra contrato existente** em uso por outra área | `rfc-completo.md` | Notificar responsáveis com antecedência maior | ~1 semana | **Não.** Requer aprovação ativa |
| **Altera design system**: novo componente base, nova variante, novo token, mudança visual em componente compartilhado | `rfc-completo.md` | Notificar quem detém o design (designer/responsável pelo front) | 48–72h úteis | **Não.** Requer aprovação ativa de quem detém o design |
| **Infraestrutura nova** (armazenamento, servidor, serviço pago, custo) | `rfc-completo.md` | Notificar quem detém autoridade sobre o recurso | Sem prazo fixo — aguarda aprovação | **Não.** Requer aprovação ativa |

Todo RFC — leve ou completo — cobre no mínimo: **problema → decisão e por quê → alternativas descartadas → precedente existente no projeto** (quando houver). O template completo adiciona contexto, consequências detalhadas e escopo de aplicação futura.

> **Por que só a primeira linha usa lazy consensus:** em um time pequeno, "silêncio após o prazo = aprovado" só é confiável quando há gente suficiente revisando. Com poucos consumidores diretos, presumir aceite por ausência de resposta pode formalizar uma decisão unilateral — justamente quando a área afetada teria motivo para discordar. Por isso, mudanças que afetam outra área exigem confirmação ativa, mesmo custando mais fricção.

> **Por que o design system tem categoria própria:** um componente "só um pouquinho diferente" criado dentro de uma feature parece interno, mas muda a experiência visual do produto inteiro e vira precedente para o próximo dev copiar. A consistência visual é um contrato com o usuário final — tratá-la como decisão interna é o caminho mais comum para a UI se fragmentar.

## Passo 4 — Precisa de design doc?

| Área | Quando | Template | Pasta |
|---|---|---|---|
| Back | Existe **contrato externo**: rota/API consumida por outra parte do sistema | `design-api.md` | `back/designs/` |
| Front | Tela ou feature nova, ou mudança relevante de fluxo de uma tela existente | `design-ui.md` | `front/designs/` |

Se for só interno (refactor, ajuste sem contrato), o RFC já basta — ou nem RFC, se não houver decisão de padrão.

- **Design de API (back):** escopo + contrato (rotas, payload, resposta, erros) + link para RFC(s) + pendências do lado consumidor.
- **Design de UI (front):** escopo + componentes do design system usados + estados da tela (loading, vazio, erro) + API consumida (link para o design de API do back) + pendências.

O design de UI do front **referencia** o design de API do back, nunca redefine o contrato. Se o front precisa de algo diferente do que o back documentou, isso volta como pedido de alteração no design do back.

## Passo 5 — Implementação

Issue vai para "Em Progresso", seguindo o padrão descrito no(s) RFC(s) e no design. Branch, commits e PR seguem [convencoes-git.md](convencoes-git.md).

## Passo 6 — Revisão (Pull Request)

O revisor verifica, além do código:
- O PR referencia o RFC/design correspondente (quando houver).
- **Back:** o contrato implementado bate com `back/designs/`.
- **Front:** nenhum componente novo fora do catálogo de `front/design-system.md`, nenhum valor visual literal no lugar de token. Se houver, o PR volta com pedido de RFC — não é aprovado "só dessa vez".

## Passo 7 — Conclusão

- Status do RFC/design atualizado (`Implementado` / `Pronto`) e índice da área atualizado.
- **Back:** documentação de API (Swagger/OpenAPI) atualizada.
- **Front:** se o RFC criou componente/token novo, `front/design-system.md` atualizado no mesmo PR.
- Se havia área dependente: aviso de conclusão pelo canal da equipe, com oferta de suporte para integração.
- Se era só interno: fecha a issue, sem aviso adicional.

---

## Regra prática de bolso

1. **"Isso muda como as coisas são feitas no projeto?"** → Não, é só código seguindo o padrão → sem RFC, direto para implementação.
2. **"Estou criando algo visual que não existe no design system?"** → Sim → RFC no front com aprovação de quem detém o design. Nunca resolva no próprio componente.
3. **"Alguma outra área ou equipe depende disso para trabalhar?"** → Não → RFC leve, de registro. → Sim → pergunta 4.
4. **"Isso muda como outra área integra, ou quebra algo já em uso?"** → Muda sem quebrar → RFC completo com **confirmação explícita** do consumidor. → Quebra → mesma coisa, com janela de ~1 semana.
5. **"Precisa de recurso controlado por outra pessoa/área (infra, custo)?"** → Sim → RFC para quem tem autoridade sobre o recurso, aguardando aprovação ativa.

## Teste de sanidade para decidir se documenta mesmo sem impacto externo

> "Se alguém entrar no projeto daqui a 6 meses e perguntar por que isso é assim, existe resposta documentada — ou só ficaria a critério de quem implementou no momento?"

Se a resposta for a segunda, vale o RFC leve — não para aprovação de terceiros, mas como registro para quem herdar o projeto.

---

## Princípios de fundo

- **Documento existe para registro, não para pedir permissão — exceto quando afeta outra área ou o design system.** Nesses casos, silêncio **não** é aprovação.
- **Riscos e incertezas ficam registrados no próprio RFC** — o objetivo é reduzir mal-entendido, não blindar a decisão contra discordância.
- **Itens de backlog sem rastreabilidade não se apagam, se fecham com motivo documentado.**
- **Draft é rascunho de verdade** — sem formalidade até virar issue real.
- **Divergência de um padrão já registrado nunca é silenciosa** — questionar é legítimo, mas passa por um novo RFC referenciando o anterior, nunca por implementação por fora do que está documentado.
- **Exceção aprovada "só dessa vez" vira padrão na prática.** Se a exceção vale, ela merece RFC; se não vale, o PR volta.
