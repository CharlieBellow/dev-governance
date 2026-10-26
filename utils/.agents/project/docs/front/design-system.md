# Design System — Fonte da Verdade Visual

> Este documento define **tudo o que pode ser usado visualmente** no front. O que não está aqui não existe até ser aprovado por RFC em `rfcs/` (categoria "Altera design system").
> Se você é uma IA: antes de criar ou alterar qualquer componente, verifique este catálogo. Se o que a tarefa pede não está aqui, **pare e proponha um RFC** — não crie o componente nem use valores literais.

| Campo | Valor |
|---|---|
| **Responsável pelo design** | (quem aprova RFCs da categoria "Altera design system") |
| **Referência visual oficial** | (link do Figma / biblioteca de design, se houver) |
| **Código-fonte dos componentes base** | (ex.: `src/components/ui/`) |
| **Arquivo de tokens** | (ex.: `src/app/globals.css`, `tailwind.config.ts`) |
| **Última atualização** | AAAA-MM-DD — RFC FE-000X |

---

## 1. Tokens

Use **sempre** o token, nunca o valor literal. Ex.: `bg-primary` / `var(--color-primary)`, nunca `#2563eb`.

### 1.1 Cores

| Token | Uso | Valor (claro / escuro) |
|---|---|---|
| `primary` | Ação principal, links | |
| `secondary` | Ações secundárias | |
| `destructive` | Ações destrutivas, erros | |
| `muted` | Fundos neutros, texto de apoio | |
| `background` / `foreground` | Fundo e texto padrão | |
| `border` | Bordas e divisores | |

### 1.2 Tipografia

| Token | Uso | Tamanho / peso / altura de linha |
|---|---|---|
| `heading-1` | Título da página | |
| `heading-2` | Título de seção | |
| `body` | Texto padrão | |
| `caption` | Legendas, metadados | |

**Fonte(s) permitida(s):**

### 1.3 Espaçamento, raio e sombra

| Categoria | Escala permitida |
|---|---|
| Espaçamento | (ex.: 4, 8, 12, 16, 24, 32, 48 — classes `p-1`…`p-12`) |
| Raio de borda | (ex.: `rounded-md` padrão, `rounded-full` apenas em avatar/badge) |
| Sombra | (ex.: `shadow-sm` em cards, `shadow-lg` apenas em overlays) |

### 1.4 Breakpoints

| Nome | Largura mínima |
|---|---|
| | |

## 2. Catálogo de componentes base

Componentes genéricos e reutilizáveis. **Só estes** podem ser usados para os papéis abaixo. Componentes de feature compõem estes — não os reimplementam.

| Componente | Caminho | Variantes permitidas | Quando usar | Quando NÃO usar | RFC |
|---|---|---|---|---|---|
| `Button` | `components/ui/button.tsx` | `default`, `secondary`, `destructive`, `ghost` · tamanhos `sm`, `md`, `lg` | Qualquer ação clicável | Navegação entre páginas (use `Link`) | herdado |
| `Input` | | | | | |
| `Select` | | | | | |
| `Dialog` | | | Confirmações e formulários curtos | Fluxos longos (use página) | |
| `Table` | | | | | |
| `Card` | | | | | |
| `Badge` | | | | | |
| `Toast` | | | Feedback de ação | Erros que bloqueiam o fluxo | |
| `Skeleton` | | | Estado de carregamento | | |
| `EmptyState` | | | Listas/tabelas vazias | | |

## 3. Padrões de composição

Como os componentes se combinam em situações recorrentes. Uma tela nova deve seguir estes padrões.

| Situação | Padrão |
|---|---|
| Página de listagem | (ex.: `PageHeader` + filtros + `Table` + paginação; vazio → `EmptyState`; carregando → `Skeleton`) |
| Formulário | (ex.: `Form` + campos com rótulo e mensagem de erro abaixo; botão principal à direita) |
| Confirmação de ação destrutiva | (ex.: `Dialog` com `Button variant="destructive"`) |
| Feedback de sucesso/erro | (ex.: `Toast`) |

## 4. Proibições

O revisor devolve o PR que fizer qualquer um destes itens sem RFC aprovado:

- ❌ Criar componente que duplica o papel de um componente base (ex.: `MyButton`, `CustomModal`, `<button className="...">` estilizado à mão).
- ❌ Adicionar variante nova a um componente base direto no código.
- ❌ Usar valor literal de cor, espaçamento, fonte, raio ou sombra (`#fff`, `13px`, `style={{ ... }}` visual, classes arbitrárias como `p-[13px]`).
- ❌ Instalar outra biblioteca de UI, de ícones ou de animação.
- ❌ Sobrescrever estilo de componente base via `className` para mudar sua identidade visual (cor, tamanho, forma). Ajustes de **layout** (margem externa, largura, posição) são permitidos.
- ❌ Alterar um componente base para atender a uma única tela.

## 5. Como evoluir este documento

1. A necessidade aparece (ex.: o design de UI de uma tela não fecha a seção 3.2 vazia).
2. Abra RFC em `rfcs/FE-000X-...` com categoria **"Altera design system"**, incluindo a alternativa "resolver com o que já existe" e por que não basta.
3. Após aprovação ativa do responsável pelo design, **o mesmo PR** que implementa o componente/token atualiza este arquivo (catálogo, tokens e campo "Última atualização").
4. Só então features podem usar o novo elemento.

## 6. Histórico de alterações

| Data | Alteração | RFC |
|---|---|---|
| AAAA-MM-DD | Versão inicial | — |
