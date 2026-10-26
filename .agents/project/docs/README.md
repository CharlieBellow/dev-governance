# Documentação Técnica do Projeto

> Este diretório é a **fonte da verdade** das decisões técnicas deste projeto (back-end e front-end). Se você é uma IA lendo este repositório para ajudar em alguma tarefa: **consulte esta pasta antes de sugerir mudanças de padrão, endpoint, componente visual ou arquitetura.** As decisões aqui documentadas têm precedência sobre suposições genéricas de "boas práticas", porque refletem escolhas já feitas e justificadas neste projeto específico.

## Estrutura

> Todos os caminhos citados neste diretório são **relativos a `.agents/project/docs/`**, exceto quando começam com `.agents/`.

```
.agents/project/
  PROJECT_MAP.md                → GPS do projeto (estrutura de pastas)
  PROJECT_RULES.md              → stack e regras específicas do projeto
  tasks/                        → tasks de fatia vertical (NNN-slug.md), geradas a partir das specs
  docs/
    README.md                     → você está aqui (porta de entrada + regras para IA)
    guia-fluxo-documentacao.md    → processo passo a passo: quando abrir RFC/design, janelas de aviso
    convencoes-git.md             → branches, commits (Conventional Commits) e Pull Requests
    _templates/                   → modelos para copiar (RFC completo, RFC leve, design de API, design de UI)
    geral/rfcs/                   → decisões transversais (CI, fluxo de git, monorepo, ferramentas)   → prefixo GER-
    back/
      README.md                   → padrões vigentes do back + índice de RFCs/designs do back
      rfcs/                       → decisões de arquitetura do back (o "porquê")                       → prefixo BE-
      designs/                    → contratos de API consumidos por outra parte (o "o quê")
    front/
      README.md                   → padrões vigentes do front + índice de RFCs/designs do front
      design-system.md            → padrão visual oficial (tokens, componentes base, proibições)
      rfcs/                       → decisões de arquitetura do front                                   → prefixo FE-
      designs/                    → design de telas/features (componentes usados, estados, API consumida)
    specs/                        → specs técnicas de feature (geradas pela skill to-spec)
    progress/                     → diário de bordo por task (gerado pela skill update-progress)
```

### Como RFC, design, spec e task se relacionam

| Documento | Responde | Vida útil | Quem lê |
|---|---|---|---|
| **RFC** (`*/rfcs/`) | *Por que* o projeto faz assim (decisão de padrão) | Permanente — vale para features futuras | Todo o time, para sempre |
| **Design** (`*/designs/`) | *O que* é o contrato (API ou tela) | Enquanto a feature existir | Quem consome / mantém a feature |
| **Spec** (`specs/`) | *Como* esta feature será construída | Até a feature ser entregue | Quem implementa |
| **Task** (`../tasks/`) | *Qual fatia* implementar agora | Até a fatia ser concluída | Quem executa (pessoa ou agente) |

A spec **referencia** RFC e design — nunca redecide o que eles decidiram. A task **referencia** a spec. Assim a cadeia fica rastreável: `task → spec → design → RFC`.

**Por que separar `back/` e `front/` mas manter o processo na raiz?** O *processo* (quando documentar, como aprovar, como commitar) é um só para o projeto inteiro — duplicá-lo por área faria as cópias divergirem. Já o *conteúdo* é diferente: o contrato do back é a API; o contrato do front é o design system. Cada área tem seu próprio histórico de decisões e sua própria fonte da verdade.

## Onde fica a fonte da verdade de cada área

| Área | Fonte da verdade | O que ela impede |
|---|---|---|
| Back-end | `back/README.md` + `back/rfcs/` | Nova convenção de rota, nova estrutura de módulo, novo padrão de erro "por fora" |
| Contrato front↔back | `back/designs/` | Front consumir payload diferente do combinado; back mudar contrato sem aviso |
| Front-end | `front/design-system.md` + `front/rfcs/` | Componente visual fora do padrão, cor/espaçamento fora dos tokens, componente base duplicado |
| Transversal | `geral/rfcs/` + `convencoes-git.md` | Commits/branches fora do padrão, mudança de pipeline sem registro |

## Como usar esta pasta

### Se você é uma pessoa entrando no projeto

1. Leia `guia-fluxo-documentacao.md` e `convencoes-git.md`.
2. Leia o `README.md` da sua área (`back/` ou `front/`) e os RFCs dela em ordem numérica — eles contam a evolução das decisões.
3. Se for trabalhar no front, leia `front/design-system.md` **antes** de criar qualquer componente.
4. Antes de propor uma mudança de padrão, verifique se já existe um RFC cobrindo isso. Se sim, siga o padrão documentado. Se discordar, abra um novo RFC referenciando o antigo — **não implemente por fora do padrão sem registrar o motivo.**

### Se você é uma IA sendo usada para desenvolver ou revisar código deste projeto

**Regra central: documentação vem antes do código, não depois.** Quando a tarefa envolver decisão de padrão ou contrato com outra parte do sistema, gere o rascunho de RFC e/ou design **antes** de escrever o código. Documentação escrita depois do código vira relatório, não decisão registrada — e perde o propósito de permitir revisão antes da mudança entrar em vigor.

1. **Identifique a área** (back, front ou geral) e leia o `README.md` dessa área. No front, leia também `front/design-system.md`.

2. **Classifique a tarefa antes de implementar:**

   | Situação | Ação |
   |---|---|
   | Implementação direta, segue padrões já documentados, sem contrato externo | Implementar sem documento novo |
   | Decisão de padrão nova, **interna** à área, sem afetar outra área nem exigir infraestrutura | Rascunho com `_templates/rfc-leve.md` |
   | Decisão de padrão que afeta outra área, quebra contrato existente ou exige infraestrutura | Rascunho com `_templates/rfc-completo.md` |
   | Rota/endpoint consumido por outra parte (front, outro serviço) | Rascunho com `_templates/design-api.md` em `back/designs/` |
   | Tela/feature nova no front | Rascunho com `_templates/design-ui.md` em `front/designs/` |
   | **Componente visual que não existe no design system, nova variante, novo token ou valor fora dos tokens** | **Pare.** Não implemente. Rascunho de RFC em `front/rfcs/` (categoria "Altera design system") |

   Em dúvida entre RFC leve e completo, prefira o completo — é mais fácil enxugar na revisão do que descobrir depois que faltou avisar alguém.

3. **Verifique primeiro se já existe um RFC relevante** na área (e em `geral/rfcs/`) antes de propor algo novo.

4. **Divergência nunca é silenciosa.** Ao sugerir abordagem diferente da documentada, sinalize explicitamente que está divergindo e cite o RFC (ex.: "isso diverge de `BE-0003`"). Se avaliar que a prática de mercado é genuinamente melhor que o padrão registrado, **não implemente a alternativa por conta própria**: proponha um novo RFC referenciando o antigo e explique tecnicamente por que seria superior *neste* projeto. A regra não é "o documentado está sempre certo", é "divergência nunca é silenciosa".

5. **No front, reutilize antes de criar.** Antes de criar um componente, procure no catálogo de `front/design-system.md` um componente base que resolva o caso (inclusive por composição). Nunca use cor, espaçamento, fonte, raio ou sombra literal (`#3b82f6`, `13px`) quando existir token. Se a tela pedir algo que o design system não cobre, isso é decisão de design — vai para RFC, não para o código.

6. **Preencha RFC/design com base no código real do projeto** (arquivo, caminho, trecho), nunca com generalidades do tipo "seguindo boas práticas de mercado". Cite precedente existente sempre que houver.

7. **Não decida sozinha a categoria de impacto nem a janela de aviso** — proponha a classificação mais adequada, mas deixe explícito que é sugestão a ser confirmada por quem revisar.

8. **"Riscos e perguntas em aberto" é para incerteza genuína**, não para uma objeção já respondida. O objetivo é registrar honestamente o que não está resolvido, não blindar a decisão.

9. **Todo RFC/design gerado é rascunho até revisão humana.** Marque `Status` como "Proposto" (RFC) ou "Em design" (design). Não abra Pull Request nem marque pessoas em nome de quem pediu — isso é decisão de quem revisa.

10. **Ao concluir, atualize os índices** (`back/README.md` ou `front/README.md`, ou a tabela de `geral/` abaixo) com o novo documento e seu status.

## Como abrir um novo documento

1. Escolha o template em `_templates/`.
2. Copie para a pasta da área com o próximo número disponível **daquela área**:
   - `geral/rfcs/GER-0001-nome-curto.md`
   - `back/rfcs/BE-0001-nome-curto.md` · `back/designs/BE-D-0001-nome-curto.md`
   - `front/rfcs/FE-0001-nome-curto.md` · `front/designs/FE-D-0001-nome-curto.md`
3. Preencha, adicione ao índice e abra como Pull Request (ver `convencoes-git.md` — commits do tipo `docs(rfc): ...`).

## Status possíveis

- **RFC:** `Proposto` → `Aceito` → `Implementado` · ou `Rejeitado` · ou `Substituído por <ID>`
- **Design:** `Em design` → `Em implementação` → `Pronto` · ou `Descontinuado`

Um RFC substituído **não é apagado**: muda o status e aponta para o novo. O histórico do "porquê" é o valor desta pasta.

## Índice de RFCs gerais (transversais)

| RFC | Título | Status |
|---|---|---|
| — | *(nenhum ainda)* | — |

Índices de back e front: ver [`back/README.md`](back/README.md) e [`front/README.md`](front/README.md).
