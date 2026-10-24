# RFC 0004: Reconciliação `master`↔`dev` e promoção de `dev` a `main`

| Campo | Valor |
|---|---|
| **Status** | Proposto |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-08-18 |
| **Módulo(s) afetado(s)** | Todo o repositório — fluxo de branches, CI, branch protection. Módulos de código especificamente tocados pela triagem: `servicebook` (subgrupo/coordenador-responsável), `core/person` (exposição de dado), busca de pessoas/salas (acentuação) |
| **Categoria de impacto** | (x) Interno, sem impacto externo — **mas com ressalva, ver seção 7**: não afeta contrato consumido por front/outro serviço, porém toda a equipe depende do resultado para continuar trabalhando, o que foge do caso típico de RFC interna de baixo risco coberto pela tabela do guia de fluxo |
| **Janela de aviso aplicada** | Sugerida: **não lazy consensus de 24h** — pedir confirmação ativa de cada pessoa que hoje commita direto em `master` ou `dev`, antes do cutover (ver seção 7 — não decidido por mim, precisa de confirmação de quem revisar) |
| **Confirmação ativa recebida de** | *(em branco até a resposta chegar)* |
| **Pessoas marcadas no PR** | *(em branco — quem abrir o PR decide)* |

---

## 1. Problema

O repositório mantém duas branches de longa duração divergentes: `master` (o que está em produção hoje) e `dev` (onde uma reescrita arquitetural completa já aconteceu — de `useCases/PascalCase` para `domain/application/presentation/infra` — mais uma série de features novas). O diff direto entre as duas árvores é de **1150 arquivos, ~65,8 mil linhas alteradas** (`git diff dev master --stat`); usando o merge-base como referência do lado que a `dev` andou sozinha, **1119 arquivos, ~62,5 mil linhas** (`git diff master...dev --stat`).

Não é mais sustentável evoluir as duas em paralelo — cada nova feature ou fix precisaria ser escrito e testado duas vezes, uma vez por branch, em estruturas de pastas incompatíveis. E não dá pra reconciliar com merge automático: um cherry-pick a seco do commit `a3d3f2c` (mais antigo de um dos grupos identificados) confirma isso na prática — gera conflito de **modify/delete** em `src/modules/servicebook/servicebook.controllers.ts`, `src/modules/servicebook/repositories/IServiceSubGroupRepository.ts` e `src/modules/servicebook/useCases/servicesubgroup.usecases.ts` (caminhos que não existem mais na `dev`, foram reestruturados), além de conflito de conteúdo real em `service-sub-group.typeorm.repository.ts` e no repositório in-memory equivalente. O Git não tem base para resolver isso sozinho — cada um dos 26 commits só-`master` precisa de decisão humana: já está coberto na `dev` (implementado diferente), ou falta portar.

## 2. Contexto

Levantamento feito com `git log dev..master` / `git log master..dev` nesta análise:

- **`dev..master`**: 26 commits existem só em `master` e potencialmente faltam na `dev`.
- **`master..dev`**: 100 commits contando merges de PR; **58 com `--first-parent`** (ignorando o que cada PR trouxe internamente) — é essa a métrica que melhor descreve "quantos esforços distintos a `dev` acumulou".

Os 26 commits só-`master` não são 26 esforços independentes — agrupam em 4 blocos temáticos, verificados individualmente nesta análise:

| Grupo | Commits | Situação verificada |
|---|---|---|
| Coordenador/responsável de subgrupo (Service Book) | `a3d3f2c`, `8163468`, `2a37107`, `5dd8bb0`, `1d0fb20`, `9383a66`, `229cb25`, `e2eda2b`, `5f20d56` (9) | **Parcialmente coberto.** A `dev` tem `update-service-sub-group.usecase.ts` ([src/modules/servicebook/application/service-subgroup/usecases/update-service-sub-group/update-service-sub-group.usecase.ts](../../src/modules/servicebook/application/service-subgroup/usecases/update-service-sub-group/update-service-sub-group.usecase.ts)), mas ele só faz substituição bruta das listas `coordinatorsIds`/`responsiblesIds` via PATCH genérico. **Não encontrado** equivalente para os efeitos colaterais de `8163468` ("assign responsible to all SOs upon adding to subgroup") e `2a37107` ("user removed as responsible must be removed from all SOs") — nenhum usecase de Service Order reage a mudança de subgrupo. Também não encontrado equivalente de `dbf8604`/`1d0fb20` (atribuição automática de role ao virar coordenador/responsável). **Precisa reimplementar a cascata, não só confirmar cobertura.** |
| Busca/acentuação (`unaccent`) | `5c9bfdb`, `c1de914` (2) | **Gap confirmado.** Zero ocorrências de `unaccent` em `src/` na `dev` (`grep -rIn unaccent src` vazio). Nenhuma migration equivalente a `1774958462932-EnableUnaccent.ts`. Maior bloco de trabalho real do grupo. |
| Roles / PII | `11519f3`, `3adaa86`, `dbf8604`, `3c53303`, `1d0fb20` (5) | **Gap confirmado e prioritário.** `11519f3` ("do not expose social name") adiciona um interceptor que remove `socialName` da resposta da API de Person. Na `dev`, [src/modules/core/application/person/dtos/person-response.dto.ts](../../src/modules/core/application/person/dtos/person-response.dto.ts) **ainda expõe `socialName` diretamente**, sem interceptor equivalente. Se nome social for dado sensível (é PII), é o item de maior risco dos 26. `3adaa86` é uma migration de seed de roles — precisa verificar se o modelo de roles pós-CASL (RFC 0002) já cobre o mesmo conjunto antes de portar cegamente. |
| Resto (fixes pontuais de 1–9 linhas) | ~10 commits, incl. `20a2b27`, `951b25e`, `4b610d9`, `e6738dc`, `1674f78`, `71fd648`, `b86ea4d`, `9e05c84`, `6d6b720`, `4f84009`, `4e697e5` | **Triagem parcial feita.** Confirmado que `20a2b27` ("fix pagination not working") tem homônimo exato já na `dev`: `a1ebdb2`, mesma mensagem, mesmo diff de uma linha (`forbidNonWhitelisted: false` em `src/main.ts`), aplicado 2h15 antes. **Os demais ~9 desse grupo não foram verificados individualmente nesta análise** — ver seção 7. |

Este RFC assume o processo de fluxo já documentado em [`docs/guia-fluxo-documentacao-backend.md`](../guia-fluxo-documentacao-backend.md) (feature branch + PR) como o padrão-alvo pós-cutover, não uma proposta nova.

## 3. Alternativas consideradas

### Alternativa A: `git merge master dev` direto
- Deixar o Git tentar resolver a divergência automaticamente.
- Prós: zero esforço de triagem manual.
- Contras: inviável na prática — a reestruturação de pastas faz o Git tratar quase todo arquivo tocado por `master` como modify/delete. Testado com `a3d3f2c`: conflito em 3 arquivos por delete de caminho + 2 arquivos por conteúdo, e esse é só 1 de 26 commits.

### Alternativa B: Descartar `master` inteiramente, sem triagem
- Promover `dev` a `main` direto, sem revisar os 26 commits.
- Prós: mais rápido, zero esforço de triagem.
- Contras: perderia silenciosamente correções reais confirmadas nesta análise — a exposição de PII (`socialName`) e a cascata de responsável/coordenador em Service Orders não têm equivalente na `dev`. Descartar sem checar significa reintroduzir bugs já corrigidos em produção.

### Alternativa C: Triagem manual por bloco temático, portar o que falta, depois arquivar `master` (escolhida)
- Descrita na seção 4.
- Prós: preserva o que a `master` corrigiu que a `dev` ainda não tem; usa os agrupamentos temáticos pra não tratar 26 commits como 26 decisões independentes; mantém rastreabilidade via referência ao hash original.
- Contras: trabalho manual, sem rede de segurança automática do Git (nenhum "todos os conflitos resolvidos" formal — depende de revisão humana confirmar cobertura, como já mostrou o achado da cascata de subgrupo).

### Alternativa D: Manter as duas branches vivas indefinidamente, com portagem contínua
- Continuar como está, indo portando fixes de uma pra outra sob demanda.
- Prós: nenhum esforço concentrado de reconciliação.
- Contras: é o problema descrito na seção 1 — já demonstrado insustentável (~29-33 mil linhas de gap por commit e crescendo a cada semana que as branches continuam divergindo).

## 4. Decisão

Alternativa C: triagem manual, commit a commit, dos 26 commits só-`master`, por bloco temático (tabela da seção 2), portando pra estrutura `domain/application/presentation/infra` da `dev` o que estiver de fato faltando — como commits próprios, referenciando o hash original da `master` na mensagem para rastreabilidade. Depois da triagem: arquivar a `master` atual via tag (não apagar), promover `dev` a `main`, e ajustar branch protection pra apontar pra ela antes do cutover. CD fica fora de escopo deste RFC: o deploy é feito em servidor local e o acesso a essa infra está atualmente indisponível, confirmado por quem tem visibilidade dela — só CI entra no cutover, e mesmo essa peça é tratada como pendência separada (ver seção 7). Daqui pra frente, todo trabalho segue feature branch + PR de auditoria — processo já documentado em `docs/guia-fluxo-documentacao-backend.md`, este RFC apenas formaliza que ele passa a ser o único caminho (sem mais commit direto em branch principal).

## 5. Precedente no projeto

Não há precedente direto de reconciliação de branches divergentes neste projeto — é a primeira vez que `master` e `dev` divergiram a esse ponto. A decisão se apoia em:
- Teste empírico de cherry-pick feito nesta análise (seção 1), não em prática de mercado genérica.
- O processo de feature branch + PR que substitui o fluxo atual já está documentado como padrão-alvo em [`docs/guia-fluxo-documentacao-backend.md`](../guia-fluxo-documentacao-backend.md)
- A convenção de arquivar em vez de apagar segue o mesmo princípio de "itens sem rastreabilidade não se apagam, se fecham com motivo documentado" já registrado no guia de fluxo (seção "Princípios de fundo").

## 6. Consequências

### 6.1 Positivas

- Uma única branch principal (`main`) passa a ser a fonte de verdade — fim do custo de escrever/testar cada mudança duas vezes em estruturas incompatíveis.
- Fecha gaps de comportamento reais identificados na triagem, não só cosméticos: exposição de PII (`socialName`) e cascata de responsável/coordenador em Service Orders.
- Formaliza o fluxo feature-branch + PR pra todo mundo, alinhado ao que já está documentado em `docs/guia-fluxo-documentacao-backend.md`.

### 6.2 Negativas / trade-offs aceitos

- Trabalho manual sem rede de segurança automática: cobertura "aparente" pode enganar, como mostrou o caso do grupo coordenador/responsável (CRUD parece coberto, cascata de negócio não está). Cada bloco precisa de verificação de comportamento, não só de existência de arquivo.
- Commits portados perdem a linha de histórico original do Git (`git blame`/`git log` na `dev` mostra só o commit novo, com o hash antigo apenas referenciado em texto na mensagem, não linkado estruturalmente).
- Dado a impossibilidade atual de implementar CD — deploy é em servidor local e o acesso a essa infra foi confirmado como indisponível no momento — este RFC cobre apenas CI. CD fica como pendência para quando o acesso à infra de deploy for resolvido, tratado fora deste escopo.
- Período de triagem é uma janela onde, se surgir um hotfix urgente de produção, é preciso decidir onde ele entra primeiro (ver seção 7).

## 7. Riscos e perguntas em aberto

- **Cobertura dos ~9 commits pontuais do grupo "resto" não verificados individualmente nesta análise** — só `20a2b27` foi confirmado como já coberto por homônimo. Os demais (`951b25e`, `4b610d9`, `e6738dc`, `1674f78`, `71fd648`, `b86ea4d`, `9e05c84`, `6d6b720`, `4f84009`, `4e697e5`) ainda podem esconder gaps do mesmo tipo que apareceu no grupo coordenador/responsável.
- **Política de hotfix de produção durante a janela de triagem** não está definida: `master` continua sendo o que está em produção até o cutover. Se aparecer um bug crítico em produção nesse meio-tempo, ele entra em `master` e depois vira mais um item pra triar contra a `dev`, ou entra direto pelos dois lados? Não decidido aqui.
- **Nome da tag de arquivamento** (`master-archive` foi só sugestão no levantamento original) não confirmado.
- **Implementar CI provavelmente é uma tarefa à parte, não um item mecânico deste cutover.** Antes de definir o que roda no pipeline, precisa de um estudo da suíte de testes atual pra determinar uma cobertura mínima aceitável — sem isso, CI vira só "roda o que existe" sem critério de qualidade real por trás. Esse estudo não foi feito nesta análise; tratar como issue separada, não como pré-requisito bloqueante do cutover de `dev` pra `main`.

## 8. Escopo de aplicação futura

Esta decisão estabelece o padrão permanente do repositório, não uma exceção pontual:
- `main` passa a ser a única branch de longa duração de onde produção é servida; `master` é arquivada (tag), nunca mais recebe commit.
- Todo trabalho futuro — feature, fix, chore — passa por feature branch + PR de auditoria, sem exceção de "é só uma linha". Isso vale para qualquer pessoa da equipe, não só para quem executar esta migração.
- O critério de arquivar-em-vez-de-apagar branches obsoletas (tag, não delete) passa a ser a convenção padrão do repositório para futuras descontinuações de branch, seguindo o mesmo princípio já usado para itens de backlog sem rastreabilidade.

---

