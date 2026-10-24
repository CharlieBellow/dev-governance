# RFC Leve 0015: Ordenação padrão e determinística nas listagens de ordens de serviço

| Campo                    | Valor                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| **Status**               | Proposto                                                                                           |
| **Autor**                | Kauã Fellipe                                                                                       |
| **Data**                 | 2026-10-10                                                                                         |
| **Módulo(s) afetado(s)** | `servicebook` (repositório de `ServiceOrder`, controllers de listagem por requester e coordinator) |

Issue de origem: #163 (contexto: #154).

---

## 1. Problema

As listagens de OS são paginadas no backend (`skip`/`take`), mas várias não definem `ORDER BY`. Sem ordenação, o Postgres não garante a mesma ordem entre consultas, então a paginação fica instável: uma OS pode se repetir entre páginas ou não aparecer em nenhuma. Há relato de chamado que existe mas não aparece em "meus chamados", e foi pedido que as OS venham da mais recente para a mais antiga.

Situação em `src/modules/servicebook/infra/repositories/typeorm/service-order.typeorm.repository.ts`:

| Método                                                  | Endpoint                                                   | Ordenação hoje                                                        |
| ------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `findByRequesterId`                                     | `GET /servicebook/serviceorder/requester/:requesterId`     | nenhuma                                                               |
| `findByRequesterAndSubGroups`                           | mesmo endpoint, escopo de subgrupos                        | nenhuma                                                               |
| `findByCoordinatorId`                                   | `GET /servicebook/serviceorder/coordinator/:coordinatorId` | nenhuma                                                               |
| `list`                                                  | `GET /servicebook/serviceorder`                            | `createdAt` só se `sort` vier preenchido, sem desempate               |
| `findByResponsibleId` / `findByResponsibleAndSubGroups` | listagem por responsável                                   | não fechadas antes de fechadas, depois `createdAt ASC`, sem desempate |

Além disso, `findByResponsibleId` usa `.offset()/.limit()` com joins em coleções (`responsibles`, `followups`, `coordinators`). Nesse caso o `limit` age sobre as linhas multiplicadas pelos joins, não sobre as OS, e uma página pode vir com menos OS que `take` ou cortar uma OS. Os demais métodos usam `.skip()/.take()`, que o TypeORM resolve em duas etapas.

## 2. Decisão

1. **Toda consulta paginada de OS passa a ter ordenação determinística**: `createdAt <dir>` seguido de `id <dir>` como desempate, com a mesma direção.
2. **Padrão `DESC`** (da mais recente para a mais antiga) em `findByRequesterId`, `findByRequesterAndSubGroups`, `findByCoordinatorId` e `list`. No `list`, a ordenação passa a ser aplicada no repositório mesmo quando `sort` não vier (hoje só o padrão do DTO garante o `desc`).
3. **Parâmetro `sort=asc|desc`** (opcional) passa a ser aceito em `GET .../requester/:requesterId` e `GET .../coordinator/:coordinatorId`, com a mesma semântica do `sort` do `list`. Será um DTO próprio, que estende `ListPaginatedRequestDTO` e acrescenta apenas `sort`, para esses endpoints não aceitarem (e ignorarem) filtros que não implementam.
4. **Listagem por responsável mantém a ordem atual**: não fechadas primeiro, mais antigas primeiro (fila de trabalho). Acrescenta-se somente `id ASC` como desempate. Esses endpoints **não** passam a aceitar `sort`.
5. **`findByResponsibleId` troca `.offset()/.limit()` por `.skip()/.take()`**, alinhando-se aos outros métodos e à paginação por OS.

Sem `sort` na requisição, o contrato de resposta (formato do JSON) não muda; muda apenas a ordem dos itens e a estabilidade da paginação.

## 3. Alternativas descartadas (breve)

- Ordenar só no front: a paginação é no backend, então o front só reordenaria a página atual e a instabilidade entre páginas continuaria.
- Reaproveitar `ListPaginatedServiceOrderRequestDto` nos endpoints de requester e coordinator: o DTO carrega filtros (`status`, datas, `responsibleId`, etc.) que esses endpoints não implementam, o que daria um contrato enganoso.
- Aceitar `sort` também na listagem por responsável: não foi pedido, e a ordem atual é intencional.

## 4. Precedente no projeto

- O `sort` do `list` (`ListPaginatedServiceOrderRequestDto`, `sort?: 'asc' | 'desc' = 'desc'`, validado com `@IsIn`) é o modelo do novo parâmetro.
- A ordem do responsável (`CASE WHEN ... CLOSED THEN 1 ELSE 0 END ASC`, depois `createdAt ASC`) já existe no repositório e é mantida.

Sobre o consumo no front (`glpi-frontend`, branch `charliebellow-main`): nenhuma listagem de OS envia `sort` e nenhuma página reordena as OS no cliente, então o front não precisa mudar para receber o novo padrão. O `DataTable` tem ordenação por coluna, mas com `manualPagination` ela só reordena a página carregada.

## 5. Riscos em aberto

- **Classificação de impacto**: classifiquei como RFC leve por não quebrar contrato (o formato da resposta não muda e o `sort` é opcional). Quem revisar deve confirmar, já que a ordem padrão de "meus chamados" e da tela do coordenador muda para quem hoje depende (sem saber) da ordem arbitrária do banco.
- **`CASE WHEN` no `ORDER BY` com `skip/take` e joins** pode exigir ajuste de alias no TypeORM (ordenação por expressão não selecionada). Precisa ser validado em teste de integração com Postgres real, não só em memória.
- **Desempate por `id`**: depende do tipo da coluna `id` de `ServiceOrder`. Se não for monotônica (por exemplo, UUID aleatório), o desempate garante determinismo, mas não ordem cronológica entre OS criadas no mesmo instante. Basta para o objetivo (estabilidade), mas vale confirmar.
- **Performance**: ordenar por `createdAt` + `id` em tabelas grandes pode se beneficiar de índice. Não medido; avaliar se o volume justificar.

---
