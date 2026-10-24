# Guia de Fluxo — Documentação e Processo do Backend

> Estrutura de pastas (`rfcs/`, `designs/`): ver [README.md](README.md#estrutura).

Board: `Backlog (draft) → A Fazer (issue) → Em Progresso → Em Review → Feito`

---

## Passo 1 — Toda ideia nasce como draft no Backlog

Sem formalidade, só uma frase de contexto mínimo. Só se preocupa em escrever direito quando for virar issue de verdade.

## Passo 2 — Decide priorizar → vira issue real

Descrição objetiva: motivo + objetivo. Move para "A Fazer".

## Passo 3 — Precisa de RFC?

Pergunta-chave: **essa decisão estabelece ou muda um padrão que outras partes do sistema (ou pessoas, no futuro) vão seguir?**

- **Sim** → RFC em `docs/rfcs/`, publicado como Pull Request.
- **Não** (é só implementação direta, sem decisão de arquitetura nova) → segue direto para implementação.

### Se for RFC, o alcance do aviso depende do impacto:

| Impacto | Escopo de notificação | Janela de aviso | Silêncio conta como aprovação? |
|---|---|---|---|
| Não afeta consumidores externos nem infraestrutura (ex.: padronização interna de erros, refactor isolado) — usar `rfcs/0000-TEMPLATE-LEVE.md` | Registro público, sem necessidade de aprovação ativa | 24h ou "documentando e seguindo" | Sim (lazy consensus) |
| Afeta como um consumidor externo (ex.: front-end, outro serviço) vai integrar, mas não quebra nada existente | Notificar diretamente o(s) responsável(is) pela área consumidora e pedir confirmação explícita — não basta publicar e esperar | 48–72h úteis, com riscos e perguntas em aberto já registrados no próprio RFC | **Não.** Requer confirmação ativa (reação/resposta) de quem consome. Se o prazo passar sem resposta, cobrar diretamente antes de prosseguir — não presumir aceite |
| Quebra contrato que já está em uso por um consumidor externo | Notificar responsáveis pela área consumidora com antecedência maior | ~1 semana | Não. Requer aprovação ativa |
| Envolve infraestrutura nova (armazenamento, servidor, custo) | Notificar quem detém autoridade sobre esse recurso | Sem prazo curto fixo — aguarda aprovação ativa antes de prosseguir | Não. Requer aprovação ativa |

Todo RFC — leve ou completo — cobre no mínimo: **problema → decisão e por quê → alternativas descartadas → precedente existente no projeto** (quando houver). O template completo adiciona contexto, consequências detalhadas e escopo de aplicação futura.

> **Por que a segunda linha não usa lazy consensus:** em um time pequeno, "silêncio após o prazo = aprovado" só funciona bem quando há volume suficiente de gente revisando para o silêncio ser um sinal confiável de que ninguém se opõe. Com poucos consumidores diretos, presumir aceite por ausência de resposta pode formalizar uma decisão unilateral em vez de validar consenso real — especialmente quando é justamente a área consumidora que teria motivo para discordar. Por isso, mudanças que afetam como o front (ou outro consumidor) integra exigem confirmação ativa, mesmo custando mais fricção que as puramente internas.

## Passo 4 — Precisa de design doc?

Só quando existe **contrato externo** a documentar (API consumida por outra parte do sistema). Se for só interno, o RFC já basta — essa etapa pode ser dispensada.

Design doc em `docs/designs/`: escopo (o que entra/não entra) + contrato da API (rotas, payload, resposta) + link para o(s) RFC(s) relacionado(s) + pendências de integração do lado consumidor.

## Passo 5 — Implementação

Issue vai para "Em Progresso", seguindo o padrão descrito no(s) RFC(s).

## Passo 6 — Conclusão

- Documentação de API (Swagger/OpenAPI) atualizada sempre.
- Se havia consumidor externo dependente: aviso de conclusão pelo canal de comunicação usado pela equipe, com oferta de suporte para integração.
- Se era só interno: fecha a issue, sem necessidade de aviso adicional.

---

## Regra prática de bolso

1. **"Isso muda como as coisas são feitas no projeto?"** → Não, é só código → sem RFC, direto para implementação.
2. **"Alguma outra parte do sistema ou equipe depende disso para trabalhar?"** → Não → RFC de registro, sem necessidade de aprovação ativa. → Sim → siga para a pergunta 3.
3. **"Isso muda como um consumidor externo vai integrar, ou quebra algo que já está em uso?"** → Sim (muda a integração, sem quebrar) → RFC com notificação ativa e **confirmação explícita obrigatória** do consumidor, não apenas o prazo passando em silêncio. → Sim (quebra contrato existente) → mesma coisa, com janela maior (~1 semana).
4. **"Isso precisa de um recurso controlado por outra pessoa/área (infraestrutura, custo)?"** → Sim → RFC direcionado a quem tem autoridade sobre o recurso, aguardando aprovação ativa, sem prazo fixo.

## Teste de sanidade para decidir se documenta mesmo sem impacto externo

> "Se alguém entrar no projeto daqui a 6 meses e perguntar por que isso é assim, existe resposta documentada — ou só ficaria a critério de quem implementou no momento?"

Se a resposta for a segunda, vale o RFC leve (`rfcs/0000-TEMPLATE-LEVE.md`) — não para aprovação de terceiros, mas como registro para quem herdar o projeto depois.

---

## Princípios de fundo

- **Documento existe para registro, não para pedir permissão — exceto quando afeta diretamente outro consumidor.** Para mudanças sem impacto externo, silêncio após o prazo de aviso definido = decisão vigente (lazy consensus). Para mudanças que afetam como um consumidor externo integra ou usa o sistema (ex.: front-end), silêncio **não** equivale a aprovação — é necessário confirmação ativa de quem consome antes de prosseguir (ver tabela do Passo 3).
- **Riscos e incertezas ficam registrados no próprio RFC** (alternativas descartadas com motivo, precedente usado, e o que ainda está em aberto) — o objetivo é reduzir mal-entendido, não blindar a decisão contra discordância.
- **Itens de backlog sem rastreabilidade não se apagam, se fecham com motivo documentado**, deixando claro o critério usado.
- **Draft é rascunho de verdade** — sem formalidade até virar issue real.
- **Divergência de um padrão já registrado nunca é silenciosa** — questionar uma decisão existente é legítimo, mas passa sempre por um novo RFC referenciando o anterior, nunca por implementação por fora do que está documentado.