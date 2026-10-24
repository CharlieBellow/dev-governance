# RFC 0009: Rota dedicada para retornar Person com personLinks no fluxo de CRUD de PersonLink

| Campo | Valor |
|---|---|
| **Status** | Proposto |
| **Autor** | Kauã Fellipe |
| **Data** | 2026-09-14 |
| **Módulo(s) afetado(s)** | `core/person` (rota, usecase e DTO novos) |
| **Categoria de impacto** | (x) Afeta consumo do front — endpoint novo e aditivo; não altera nem remove nenhum contrato já consumido hoje |
| **Janela de aviso aplicada** | Sugerida: nenhuma janela de lazy consensus é necessária, por ser endpoint aditivo — a confirmar por quem revisar |
| **Confirmação ativa recebida de** | N/A — decisão tomada diretamente pelo autor. A issue original já previa como próximo passo "confirmar com o time (#119, incluindo o Ítalo) onde a rota deve viver"; esta RFC é esse alinhamento, registrado como decisão em vez de conversa avulsa |
| **Pessoas marcadas no PR** | @ (a definir por quem abrir o PR) |

---

## 1. Problema

No fluxo de CRUD de `PersonLink`, o front cria o vínculo (`POST /core/personlink`, retorna 201 com o `PersonLink` criado) e, em seguida, precisa exibir o `Person` completo já com os `personLinks` associados — e não existe hoje nenhuma rota que devolva essa combinação. `GET /core/person/:id` (`find-person-by-id.controller.ts`) devolve `Person`, mas sempre no formato enxuto (`PersonResponseDto`), sem a lista de vínculos.

## 2. Contexto

Relatado durante a validação pós-merge dev/master. Investigação de código já feita antes desta RFC (ver discussão prévia com IA nesta sessão, não registrada em documento até agora):

- `TypeOrmPersonRepository.findById` (`src/modules/core/infra/repositories/typeorm/typeorm-person.repository.ts`) **já carrega** a relation `personLinks` (e sub-relations `personLinks.course`, `personLinks.department`, `personLinks.employeeRole`, `personLinks.functionalLevel`) a cada busca por id. Quem descarta esse dado hoje é o `PersonResponseDto` (`src/modules/core/application/person/dtos/person-response.dto.ts`), que mapeia campo a campo e nunca copia `personLinks`. Ou seja: o dado já existe de graça na consulta atual, falta só uma representação de saída que não o descarte.
- `Person.personLinks` é `@OneToMany` declarada na própria entidade `Person` (`src/modules/core/domain/entities/person.entity.ts`); `PersonLink.person` é `@ManyToOne` simples do lado de `PersonLink`. Ou seja, a coleção pertence ao agregado `Person`, não a `PersonLink` — mesma geometria de `Room.authorizedPersons` (RFC 0001): o agregado "pai" possui a coleção da entidade relacionada.
- Regra de negócio combinada para esta mudança: o retorno "cheio" (`Person` + `personLinks`) é exclusivo do fluxo de CRUD de `personLinks` no front. Em qualquer outro lugar do sistema, `Person` deve continuar sendo devolvido enxuto (`PersonResponseDto`/`PersonSummaryDto`, sem relations).

## 3. Alternativas consideradas

### Alternativa A: Nova rota dentro do módulo `person`, sem tocar na rota canônica (escolhida)

- Descrição: `GET /core/person/:id/with-person-links` — controller, DTO de resposta e composição de usecase próprios, no diretório de `person`. `GET /core/person/:id` e `PersonResponseDto` continuam exatamente como hoje.
- Prós: segue o precedente já registrado na RFC 0001 — o agregado dono da relação (`Person`) hospeda a rota que a expõe, independentemente de quem consome; reaproveita a consulta que o repositório já faz hoje (`findById` já carrega `personLinks`) — nenhuma query nova; mantém `person` como único módulo que decide como `Person` pode ser representado, o que já é o padrão do módulo (`PersonResponseDto` vs. `PersonSummaryDto`, dois formatos de saída para a mesma entidade); a regra "enxuto no resto do sistema" fica garantida por construção — é uma rota adicional, não uma variação condicional da existente.
- Contras: o motivo de a rota existir ("uso exclusivo do fluxo de CRUD de personLink") não é imposto pela estrutura de pastas — fica documentado em nome de rota/comentário/este RFC, não impedido tecnicamente; nada barra, no nível de código, que outro fluxo comece a consumi-la no futuro.

### Alternativa B: Nova rota dentro do módulo `person-link`

- Descrição: algo como `GET /core/personlink/person/:personId`, vivendo inteiramente em `presentation/person-link`, retornando `Person` com `personLinks`.
- Prós: colocaliza a rota com seu único consumidor real — quem lê a pasta `person-link` já entende que é específica desse fluxo, sem depender de nome/comentário/RFC para sinalizar a restrição; garante, por construção, que o módulo `person` nunca é tocado.
- Contras: quebra a convenção de nomenclatura de recurso usada no projeto — a URL não corresponderia ao recurso devolvido (`Person`, sob `/personlink`), divergindo da própria RFC 0001, que ancora a rota pelo dono da relação, não pelo consumidor; `person-link` passaria a depender do formato de representação de `Person` (precisaria de algo equivalente a `PersonResponseDto`, só que com `personLinks`), então o ganho de responsabilidade única é parcial: tira-se a rota de `person`, mas `person-link` passa a carregar conhecimento sobre como `Person` deve ser exposto — hoje monopólio do módulo `person`.

### Alternativa C: Mesma rota `GET /core/person/:id`, formato condicional (ex.: `?withLinks=true`)

- Descrição: uma única rota, dois contratos de resposta dependendo de um parâmetro.
- Prós: nenhuma rota nova para o consumidor integrar.
- Contras: é exatamente o padrão que a RFC 0001 já rejeitou para `Room` (lá, seção 3, Alternativas A/B) — mistura, na mesma rota, dois formatos de contrato condicionados por parâmetro; contraria diretamente a regra combinada nesta issue ("`Person` enxuto no resto do sistema"), já que o enxuto deixaria de ser a única forma de chamar essa rota; risco de algum consumidor esquecer o parâmetro e depender do enxuto por acidente, ou vice-versa.

### Alternativa D: Não devolver "Person cheio"; expor uma rota de listagem de `personLinks` por pessoa

- Descrição: `GET /core/person/:id/person-links` (ou equivalente em `personlink`), devolvendo só `PersonLink[]`. O front mantém o `Person` enxuto que já tem em tela e combina com a lista separada.
- Prós: é o padrão mais literalmente idêntico ao de `Room.authorizedPersons` (RFC 0001) — lá também é uma lista do lado relacionado, não uma entidade "pai" reformatada com a coleção embutida; elimina de vez a necessidade de uma variante "Person com links", reduzindo a régua a uma decisão já resolvida no projeto.
- Contras: muda a forma já definida para este fluxo ("retorne o `Person` com os `personLinks`") — exigiria uma chamada adicional no front (mesmo trade-off aceito pela RFC 0001 para `Room`) em vez de uma única resposta; não foi a forma escolhida para este fluxo.

## 4. Decisão

Alternativa A. O critério decisivo é o mesmo já registrado na RFC 0001: a rota que expõe uma coleção relacionada deve morar sob o agregado que a declara — `Person.personLinks` é `@OneToMany` do lado de `Person`, então a rota mora em `person`, independentemente de o único consumidor hoje ser o fluxo de `personLink`. A Alternativa B inverteria essa dependência (o módulo cujo fluxo consome a informação passaria a possuir conhecimento sobre como representar a entidade de outro módulo), o que é uma inversão maior do que o módulo `person` simplesmente ganhar mais uma variante de saída — algo que ele já faz (`PersonResponseDto`/`PersonSummaryDto`).

A rota é nova e aditiva: `GET /core/person/:id` e `PersonResponseDto` não são alterados.

## 5. Precedente no projeto

```
src/modules/core/presentation/room/controllers/list-authorized-persons.controller.ts
src/modules/core/application/person/dtos/person-response.dto.ts
src/modules/core/application/person/dtos/person-summary.dto.ts
```

`GET /core/room/:id/authorized-persons` (RFC 0001) já resolve um caso da mesma forma: uma rota que expõe, sob o caminho do agregado dono da relação, uma representação de `Person` diferente da canônica — ali como lista (`PersonResponseDto[]`), aqui como objeto único enriquecido (`Person` + `personLinks`). `PersonResponseDto`/`PersonSummaryDto` já são precedente direto, dentro do próprio módulo `person`, de que a mesma entidade pode ter mais de um formato de saída dependendo do consumidor, sem que isso exija sair do módulo.

## 6. Consequências

### 6.1 Positivas

- Front deixa de precisar de uma segunda chamada ad-hoc ou de montar a informação no cliente — recebe `Person` + `personLinks` numa única resposta, no formato já pedido pela issue original.
- Nenhuma mudança em `GET /core/person/:id`, `PersonResponseDto` ou em qualquer consumidor existente de `Person` — risco de regressão zero nas rotas atuais.
- Reaproveita a consulta que `PersonRepository.findById` já faz hoje — sem custo de nova query nem nova relation a carregar.
- Consistente com o padrão já existente no módulo (`PersonResponseDto` vs. `PersonSummaryDto`): mais um DTO de saída para a mesma entidade, não uma ramificação de responsabilidade.

### 6.2 Negativas / trade-offs aceitos

- A garantia de "uso exclusivo do fluxo de `personLink`" é só documental (nome da rota + este RFC) — nada no código impede outro fluxo de consumir esta rota no futuro. Ver seção 7.
- Cria uma terceira forma de representar `Person` na API (`PersonResponseDto`, `PersonSummaryDto`, e agora esta) — mais uma opção para quem for integrar decidir entre.

## 7. Riscos e perguntas em aberto

- Nenhum mecanismo técnico impede que a rota nova seja consumida fora do fluxo de `personLink` no futuro — a restrição combinada nesta issue é convenção de uso, não uma trava de código (guard, policy ou anything do tipo). Se isso se mostrar insuficiente na prática, é candidato a um RFC futuro (ex.: nome de rota mais explícito, ou controle de acesso por rota).
- Nenhuma das rotas de `person` hoje tem `@CheckPolicies` específico por operação — a rota nova herda a mesma limitação de autorização que já existe no módulo, não é uma regressão introduzida por esta RFC nem resolvida por ela.
- Nome definitivo da rota e do DTO (ver design doc) ainda não testado contra convenção de nomenclatura de outros consumidores do front — se o time de front tiver preferência diferente, é ajuste de implementação, não motivo para reabrir esta decisão de posicionamento.

## 8. Escopo de aplicação futura

Esta decisão reforça, mais uma vez, a convenção já registrada na RFC 0001 (seção 8): a rota que expõe uma relação pertence ao módulo que declara essa relação no seu lado "um" (dono da coleção), não ao módulo que a consome. Não estabelece convenção nova além dessa — é aplicação do mesmo critério a um caso onde a saída é um objeto único enriquecido, não uma lista.

---

*Este RFC segue o modelo de "lazy consensus": a decisão entra em vigor ao final da janela de aviso indicada acima, salvo objeção registrada no Pull Request antes desse prazo.*
