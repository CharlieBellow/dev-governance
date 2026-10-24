---
name: react-performance
description: Padrões de otimização de performance para React e Next.js, adaptados do React Best Practices da Vercel Engineering (https://github.com/vercel-labs/agent-skills). Organiza mais de 70 regras em 8 categorias por prioridade — waterfalls, tamanho de bundle, lado do servidor, busca no cliente, re-render, renderização, micro-performance de JS e avançado. Use ao escrever, revisar ou refatorar código React/Next.js pensando em performance.
metadata:
  origin: ECC
---

# Performance em React

Padrões de otimização de performance para React 18/19 e Next.js, adaptados do [`react-best-practices` da Vercel Labs](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) (MIT, v1.0.0). Esta skill organiza as regras por prioridade e oferece árvores de decisão para code review e refatoração.

## Quando Ativar

- Ao escrever ou revisar código React/Next.js pensando em performance
- Ao diagnosticar carregamento lento de páginas, interações lentas ou CPU alta no cliente
- Ao auditar tamanho de bundle ou regressões nos Core Web Vitals do Lighthouse
- Ao remover waterfalls em Server Components / API routes
- Ao reduzir re-renders no cliente
- Ao otimizar listas longas, animações ou hidratação
- Ao auditar escolhas de otimização em PRs que mexem em `app/`, `pages/`, `components/` ou camadas de dados

## Índice de Prioridades

| Prioridade | Categoria | Prefixo | Quando importa |
|---|---|---|---|
| 1 — CRÍTICA | Eliminar Waterfalls | `async-` | Sempre que um `await` é seguido por outro `await` independente |
| 2 — CRÍTICA | Otimização do Tamanho do Bundle | `bundle-` | JS do primeiro carregamento, imports por rota, bibliotecas de terceiros |
| 3 — ALTA | Performance no Servidor | `server-` | RSC, Server Actions, API routes, SSR |
| 4 — MÉDIA-ALTA | Busca de Dados no Cliente | `client-` | SWR / TanStack Query / `fetch` puro em hooks |
| 5 — MÉDIA | Otimização de Re-render | `rerender-` | Atualizações de estado frequentes, propagação pai-filho |
| 6 — MÉDIA | Performance de Renderização | `rendering-` | Listas longas, animações, hidratação |
| 7 — BAIXA-MÉDIA | Performance de JavaScript | `js-` | Loops críticos, alocações frequentes |
| 8 — BAIXA | Padrões Avançados | `advanced-` | Integração effect-event, refs estáveis |

## 1. Eliminar Waterfalls (CRÍTICA)

> "Waterfalls são o assassino de performance nº 1" — cada `await` sequencial adiciona uma latência de rede inteira.

### Condições baratas antes do await

Verifique condições síncronas (props, env, flags fixas) antes de aguardar dados remotos.

```ts
// INCORRETO
async function Page({ id }: { id: string }) {
  const flag = await getFlag("show-page");
  if (!flag || !id) return null;
  const data = await getData(id);
  // ...
}

// CORRETO — interrompa primeiro na condição síncrona barata
async function Page({ id }: { id: string }) {
  if (!id) return null;
  const flag = await getFlag("show-page");
  if (!flag) return null;
  const data = await getData(id);
}
```

### Adie os awaits até o uso

Mova o `await` para dentro do ramo que o utiliza.

```ts
// INCORRETO — aguarda antes de decidir se precisa dos dados
const user = await getUser(id);
if (mode === "guest") return renderGuest();
return renderUser(user);

// CORRETO
if (mode === "guest") return renderGuest();
const user = await getUser(id);
return renderUser(user);
```

### Promise.all para trabalho independente

```ts
// INCORRETO — sequencial
const user = await getUser(id);
const posts = await getPosts(id);
const followers = await getFollowers(id);

// CORRETO — em paralelo
const [user, posts, followers] = await Promise.all([
  getUser(id),
  getPosts(id),
  getFollowers(id),
]);
```

### Dependências parciais — comece cedo, aguarde tarde

```ts
// CORRETO — dispare todas as promises e aguarde cada resultado só quando precisar
const userP = getUser(id);
const postsP = getPosts(id);
const profile = await getProfile(id);
if (profile.private) return null;
const [user, posts] = await Promise.all([userP, postsP]);
```

### Suspense para streaming

Coloque as fronteiras de `<Suspense>` perto dos dados para que a página pinte o que puder enquanto subárvores mais lentas chegam via streaming. O custo: deslocamento de layout quando o conteúdo chega — reserve espaço (skeleton ou `min-height`).

### Server Components: paralelismo via composição

```tsx
// INCORRETO — awaits irmãos rodam em sequência dentro de um componente
export default async function Page() {
  const user = await getUser();
  const cart = await getCart();
  return <View user={user} cart={cart} />;
}

// CORRETO — divida em filhos, o React os executa em paralelo
export default async function Page() {
  return (
    <View>
      <UserSection />
      <CartSection />
    </View>
  );
}
```

## 2. Otimização do Tamanho do Bundle (CRÍTICA)

### Imports diretos, não barrels

Arquivos barrel `index.ts` forçam o bundler a percorrer todo o grafo de módulos, mesmo quando o tree-shaking remove a maior parte. Imports diretos economizam 200-800ms de JS no primeiro carregamento em muitos apps reais.

```ts
// INCORRETO
import { Button, Card, Modal } from "@/components";

// CORRETO
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
```

O Next.js 13.5+ tem o [Optimize Package Imports](https://nextjs.org/docs/app/api-reference/next-config-js/optimizePackageImports), que automatiza isso para os pacotes listados — use-o; imports diretos manuais continuam necessários para bibliotecas não listadas.

### Caminhos analisáveis estaticamente

```ts
// INCORRETO — impede a análise do bundler/trace
const mod = await import(`./pages/${name}`);

// CORRETO — explícito por ramo
const mod = name === "home" ? await import("./pages/home") : await import("./pages/about");
```

### Imports dinâmicos para componentes pesados

```tsx
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("./HeavyChart"), {
  loading: () => <Skeleton />,
  ssr: false, // quando for só do cliente
});
```

### Adie scripts de terceiros

Carregue analytics, logs e widgets de suporte DEPOIS da hidratação. Use `next/script` com `strategy="afterInteractive"` (padrão) ou `"lazyOnload"`.

### Carregamento condicional de módulos

```tsx
if (user.role === "admin") {
  const { AdminPanel } = await import("./admin/AdminPanel");
  // ...
}
```

### Pré-carregue no hover/foco

Dispare `<link rel="preload">` ou `import()` no hover para que o bundle já esteja em cache quando o usuário clicar.

## 3. Performance no Servidor (ALTA)

### Autentique Server Actions como API routes

Toda função `"use server"` é um endpoint público. Autentique E autorize dentro da action — nunca dependa da restrição feita no Client Component que a chama.

```ts
"use server";
export async function deleteUser(formData: FormData) {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  const targetId = String(formData.get("id"));
  if (session.user.role !== "admin" && session.user.id !== targetId) {
    throw new Error("Forbidden");
  }
  await db.user.delete({ where: { id: targetId } });
}
```

### `React.cache()` para deduplicação por requisição

```ts
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
```

O `React.cache` deduplica dentro de uma única requisição. Chamar `getUser("1")` em três Server Components no mesmo render = uma query ao banco.

### Cache LRU para dados entre requisições

Para dados que NÃO mudam por requisição (configuração, tabelas de consulta), use cache fora do React com um cache LRU ou `unstable_cache`.

### Evite serialização duplicada nas props de RSC

Quando um Server Component renderiza os mesmos dados em vários Client Components, os dados são serializados uma vez por consumidor. Suba o Client Component e passe children.

### Suba I/O estático para o escopo do módulo

```ts
// CORRETO — executa uma vez ao carregar o módulo
const fontData = readFileSync(fontPath);

export async function Page() {
  return <Banner font={fontData} />;
}
```

### Nada de estado mutável no nível do módulo em RSC/SSR

Estado de módulo no servidor é compartilhado entre todas as requisições — uma condição de corrida entre usuários. Use armazenamento com escopo de requisição (`headers()`, `cookies()`, contexto assíncrono).

### Minimize os dados passados aos Client Components

Serialize apenas o que o cliente precisa. Remova campos, pagine e projete colunas na camada do banco.

### Paralelize buscas aninhadas com Promise.all por item

```ts
const users = await getUsers();
const enriched = await Promise.all(
  users.map(async (u) => ({ ...u, posts: await getPostsFor(u.id) })),
);
```

### Use `after()` para trabalho não bloqueante

O `after()` do Next.js 15 executa trabalho depois que a resposta é enviada — logs, aquecimento de cache, analytics.

```ts
import { after } from "next/server";
export async function GET() {
  const data = await getData();
  after(() => logAnalytics(data));
  return Response.json(data);
}
```

## 4. Busca de Dados no Cliente (MÉDIA-ALTA)

### SWR / TanStack Query para deduplicação

Vários componentes chamando `useUser(id)` devem compartilhar uma requisição de rede e uma entrada de cache. Use SWR ou TanStack Query — nunca crie seu próprio `useEffect` + `fetch` para dados compartilhados.

### Deduplique listeners globais de eventos

```tsx
// INCORRETO — cada componente adiciona o seu
useEffect(() => {
  window.addEventListener("scroll", handler);
  return () => window.removeEventListener("scroll", handler);
}, []);

// CORRETO — um único listener compartilhado via hook + subject global
const useScroll = createScrollHook(); // subject singleton por baixo
```

### Listeners passivos para scroll

```ts
window.addEventListener("scroll", handler, { passive: true });
```

Melhora a fluidez do scroll; o listener não pode chamar `preventDefault()`.

### localStorage: versione e minimize

- Sempre guarde um campo `version`; incremente quando o schema mudar e migre ou descarte dados antigos
- Mantenha os payloads pequenos — o `localStorage` é síncrono e bloqueia a thread principal

## 5. Otimização de Re-render (MÉDIA)

### Não assine estado usado só em callbacks

```tsx
// INCORRETO — re-renderiza toda vez que count muda
const count = useStore((s) => s.count);
const handler = () => doSomething(count);

// CORRETO — lê uma vez na chamada
const handler = () => {
  const count = useStore.getState().count;
  doSomething(count);
};
```

### Extraia trabalho caro para componentes memoizados

```tsx
// CORRETO — o filho só re-renderiza quando `items` muda
const Heavy = memo(function Heavy({ items }: { items: Item[] }) {
  return <Chart data={transform(items)} />;
});
```

### Suba props padrão não primitivas

```tsx
// INCORRETO — um novo array a cada render quebra o memo
<List items={items ?? []} />

// CORRETO
const EMPTY: Item[] = [];
<List items={items ?? EMPTY} />
```

### Dependências primitivas em efeitos

```tsx
// INCORRETO — nova identidade de objeto a cada render
useEffect(() => {}, [{ id, name }]);

// CORRETO — primitivos
useEffect(() => {}, [id, name]);
```

### Assine booleanos derivados, não valores crus

```tsx
// INCORRETO — re-renderiza a cada mudança no carrinho
const cart = useStore((s) => s.cart);
const hasItems = cart.length > 0;

// CORRETO — re-renderiza só quando o estado de vazio muda
const hasItems = useStore((s) => s.cart.length > 0);
```

### Derive durante o render, nunca via `useEffect`

```tsx
// INCORRETO
const [full, setFull] = useState("");
useEffect(() => setFull(`${first} ${last}`), [first, last]);

// CORRETO
const full = `${first} ${last}`;
```

### `setState` funcional para callbacks estáveis

```tsx
// CORRETO
const increment = useCallback(() => setCount((c) => c + 1), []);
```

### Inicializador preguiçoso de estado para valores caros

```tsx
const [tree] = useState(() => parseTree(largeInput));
```

### Evite memo para primitivos simples

`useMemo(() => x + 1, [x])` é só custo. O memo compensa com identidade de objetos e computação cara.

### Separe hooks com dependências independentes

```tsx
// INCORRETO — os dois seletores rodam de novo se qualquer fonte mudar
const { a, b } = useSomething(source1, source2);

// CORRETO
const a = useA(source1);
const b = useB(source2);
```

### Mova a lógica de interação para event handlers

Event handlers só rodam na ação do usuário — o `useEffect` roda de novo sempre que as dependências mudam.

### `startTransition` para atualizações não urgentes

```tsx
const [pending, startTransition] = useTransition();
startTransition(() => setFilters(newFilters));
```

### `useDeferredValue` para renders caros

```tsx
const deferredQuery = useDeferredValue(query);
const results = useMemo(() => expensiveSearch(deferredQuery), [deferredQuery]);
```

### `useRef` para valores transitórios e frequentes

Para valores que mudam com frequência, mas não devem disparar re-render (timestamps, última tecla, acumuladores).

### Não defina componentes dentro de componentes

```tsx
// INCORRETO — Inner é um novo componente a cada render de Outer
function Outer() {
  const Inner = () => <span />;
  return <Inner />;
}
```

Cada render cria um novo tipo `Inner`, o que anula a reconciliação e desmonta os filhos.

## 6. Performance de Renderização (MÉDIA)

### Anime o wrapper, não o SVG

Transformar uma `<div>` em volta de um SVG é acelerado pela GPU; transformar o próprio SVG dispara repintura.

### `content-visibility: auto` para listas longas

```css
.row { content-visibility: auto; contain-intrinsic-size: auto 80px; }
```

O navegador pula a renderização fora da tela — grande ganho em listas com centenas de linhas.

### Suba JSX estático

```tsx
const STATIC_HEADER = <h1>Título</h1>;
function Page() {
  return <>{STATIC_HEADER}<Body /></>;
}
```

### SVG: reduza a precisão das coordenadas

`d="M10.123456,20.654321"` → `d="M10.12,20.65"`. Cada dígito custa bytes; a diferença visual é menor que um pixel.

### Hidratação sem piscar via script inline

Para valores necessários antes da hidratação (tema, idioma), use um `<script>` inline que define `document.documentElement.dataset.*` antes de o React montar.

### Suprima diferenças de hidratação esperadas de forma pontual

```tsx
<time suppressHydrationWarning>{new Date().toLocaleString()}</time>
```

Use APENAS em nós folha que sabidamente divergem — nunca em uma árvore com outros filhos.

### `<Activity>` para mostrar/esconder em vez de montar/desmontar

O `<Activity mode="visible|hidden">` do React 19 mantém o estado e os efeitos da árvore montados, mas escondidos — mais barato que desmontar/remontar em abas e accordions.

### Ternário em vez de `&&` para render condicional

```tsx
// INCORRETO — `0` é renderizado como nó de texto
{count && <Badge>{count}</Badge>}

// CORRETO
{count > 0 ? <Badge>{count}</Badge> : null}
```

### `useTransition` para estados de carregamento

Combine `startTransition` com a action; o React mostra a UI anterior como `isPending` enquanto o próximo estado é calculado.

### Resource hints do React DOM

```tsx
import { preload, preconnect } from "react-dom";
preload("/api/critical", { as: "fetch" });
preconnect("https://api.example.com");
```

### `defer` / `async` em tags `<script>`

`defer` para execução ordenada após o DOMContentLoaded; `async` para disparar sem esperar.

## 7. Performance de JavaScript (BAIXA-MÉDIA)

- **Agrupe mudanças de DOM/CSS** — aplique via troca de classe ou `cssText`, não propriedade por propriedade
- **`Map` para buscas repetidas** — `O(1)` vs varredura linear `O(n)`
- **Guarde o acesso a propriedades em loops** — `const len = arr.length`
- **Memoize funções puras** — `Map<key, result>` no nível do módulo
- **Guarde leituras do `localStorage`** — API síncrona; uma leitura por render
- **Combine `filter().map()` em uma passada** — `flatMap` ou um único `for`
- **Verifique o tamanho do array primeiro** antes de comparações caras
- **Retorno antecipado** nas funções
- **Suba RegExp** para fora dos loops — compilar não é de graça
- **Loop para mínimo/máximo** em vez de `sort()` — `O(n)` vs `O(n log n)`
- **`Set`/`Map` para pertinência** — `O(1)` vs `Array.includes` `O(n)`
- **`toSorted()` em vez de mutação** quando a imutabilidade importa
- **`flatMap` para mapear e filtrar em uma passada**
- **`requestIdleCallback`** para trabalho não crítico

## 8. Padrões Avançados (BAIXA)

### Dependências do `useEffectEvent`

Valores vindos do `useEffectEvent` são estáveis — NÃO os adicione às dependências do efeito.

### Refs de event handlers

Para callbacks estáveis passados a filhos memoizados:

```tsx
const handlerRef = useRef(handler);
useEffect(() => { handlerRef.current = handler; });
const stable = useCallback((arg) => handlerRef.current(arg), []);
```

### Inicialize uma vez por carregamento do app

Para singletons no nível do módulo (telemetria, logger), proteja com uma flag no escopo do módulo — não com `useEffect`.

### `useLatest` para refs de callback estáveis

```tsx
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
```

## Ferramentas Automatizadas

Muitas destas regras já são automatizadas:

- **Optimize Package Imports do Next.js 13.5+** — otimização de imports de barrels
- **React Compiler** (RFC, no canary) — memoização automática
- **Turbopack** — builds mais rápidos, tree-shaking melhor
- **Bundle Analyzer** (`@next/bundle-analyzer`) — visualiza o JS do primeiro carregamento

Quando o projeto usar o React Compiler, rebaixe as regras manuais de memoização `rerender-*` para "apenas revisão" — o compilador cuida delas. `useMemo`/`useCallback` manuais viram ruído desnecessário.

## Mapeamento Lighthouse / Web Vitals

| Métrica | Categorias mais relevantes |
|---|---|
| **LCP** (Largest Contentful Paint) | Waterfalls, Tamanho do Bundle, Resource Hints |
| **INP** (Interaction to Next Paint) | Re-render, Renderização, JavaScript |
| **CLS** (Cumulative Layout Shift) | Renderização (posição do Suspense, dimensões de imagens) |
| **TBT** (Total Blocking Time) | Tamanho do Bundle, JavaScript, Adiar Terceiros |
| **FID** (legado) | Tamanho do Bundle, Hidratação |

## Relacionados

- Skills: [react-patterns](../react-patterns/SKILL.md), [react-testing](../react-testing/SKILL.md), [frontend-patterns](../frontend-patterns/SKILL.md), [frontend-a11y](../frontend-a11y/SKILL.md), [nextjs-turbopack](../nextjs-turbopack/SKILL.md)
- Regras: [rules/react/](../../rules/react/)
- Agentes: `react-reviewer` aplica estas regras no code review; `react-build-resolver` trata falhas de build relacionadas
- Comandos: `/react-review`, `/react-build`, `/react-test`

## Atribuição

Adaptado da skill `react-best-practices` da Vercel Labs (Licença MIT, copyright Vercel Engineering, v1.0.0 janeiro de 2026). Fonte: [https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices).

Esta skill reestrutura e adapta o catálogo original de 70 regras em uma única referência navegável. Para o conjunto original completo, com exemplos estendidos, veja o repositório de origem.
