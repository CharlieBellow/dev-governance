---
name: react-patterns
description: Padrões de React 18/19, incluindo disciplina de hooks, fronteiras entre server/client components, Suspense + error boundaries, form actions, busca de dados, árvores de decisão para gerenciamento de estado e composição com acessibilidade em primeiro lugar. Use ao escrever ou revisar componentes React.
metadata:
  origin: ECC
---

# Padrões React

Padrões idiomáticos de React 18/19 para construir árvores de componentes robustas, acessíveis e performáticas.

## Quando Ativar

- Ao escrever ou modificar function components, custom hooks ou árvores de componentes React
- Ao revisar arquivos JSX/TSX
- Ao projetar o formato do estado ou a composição de componentes
- Ao migrar class components ou código antigo com muito `forwardRef`/`useEffect`
- Ao escolher entre estado local, estado elevado, context e stores externas
- Ao trabalhar com Server Components / Client Components (Next.js App Router, RSC)
- Ao implementar formulários com actions do React 19 ou inputs controlados
- Ao conectar busca de dados com TanStack Query / SWR / RSC

## Princípios Fundamentais

### 1. O Render é uma Função Pura de Props e Estado

```tsx
// Bom: derivar durante o render
function Cart({ items }: { items: CartItem[] }) {
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  return <span>{formatMoney(total)}</span>;
}

// Ruim: estado derivado guardado separadamente
function Cart({ items }: { items: CartItem[] }) {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    setTotal(items.reduce((sum, i) => sum + i.price * i.qty, 0));
  }, [items]);
  return <span>{formatMoney(total)}</span>;
}
```

Estado derivado em `useEffect` adiciona um ciclo de render, pode dessincronizar e esconde o fluxo de dados.

### 2. Efeitos Colaterais Fora do Render

Efeitos, mutações, chamadas de rede e assinaturas ficam em event handlers ou em `useEffect` — nunca no corpo do render.

### 3. Composição em vez de Herança

O React não tem modelo de herança para componentes. Componha com `children`, render props ou props de componente.

## Disciplina de Hooks

Veja [rules/react/hooks.md](../../rules/react/hooks.md) para o conjunto completo de regras. Destaques:

- Apenas no nível superior, nunca condicionais
- Faça cleanup de toda assinatura, interval e listener
- Use updater funcional (`setX(prev => prev + 1)`) quando o novo estado depende do anterior
- Posição padrão: não memoize — adicione `useMemo`/`useCallback` só quando um profiler ou uma cadeia de dependências provar que importa
- Extraia um custom hook só quando a mesma sequência de hooks aparecer em 2+ componentes

## Árvore de Decisão: Onde Fica o Estado

```
Usado por um componente?
  -> useState dentro dele

Usado pelo pai + alguns descendentes?
  -> elevar para o ancestral comum mais próximo

Usado em ramos distantes E com leituras de baixa frequência (tema, auth, idioma)?
  -> React Context

Atualizações de alta frequência compartilhadas pela árvore?
  -> store externa (Zustand, Jotai, Redux Toolkit)

Vem de um servidor?
  -> biblioteca de estado do servidor (TanStack Query, SWR, fetch em RSC)
```

A maioria das páginas não precisa de context nem de store global. Resista à abstração até que elevar estado repetidamente se torne doloroso.

## Server / Client Components (RSC)

```tsx
// Server Component - padrão, assíncrono, nunca envia JS próprio ao cliente
export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();
  return <ProductView product={product} />;
}

// Client Component - opte com "use client"
"use client";
export function AddToCartButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => addToCart(productId))}
    >
      {pending ? "Adicionando..." : "Adicionar ao carrinho"}
    </button>
  );
}
```

Fronteiras:

- Server -> Client: passe props serializáveis ou `children`
- Client -> Server: chame Server Actions via `<form action={...}>` ou de forma imperativa a partir de event handlers
- Nunca faça `import` de um Server Component em um arquivo de Client Component — componha-os via `children`

## Suspense + Error Boundaries

```tsx
<ErrorBoundary fallback={<ErrorView />}>
  <Suspense fallback={<UserSkeleton />}>
    <UserDetail id={id} />
  </Suspense>
</ErrorBoundary>
```

- Coloque as fronteiras de Suspense perto dos dados, não na raiz da rota — revele o conteúdo progressivamente
- Error Boundary continua sendo uma API de classe; use `react-error-boundary` para um wrapper amigável a hooks
- Uma fronteira captura erros lançados durante o render, o ciclo de vida e os construtores dos filhos — NÃO em event handlers ou código assíncrono

## Formulários

### Form actions do React 19 (preferido em código novo)

```tsx
"use client";
import { useActionState } from "react";

const initial = { error: null as string | null };

async function updateUserAction(_prev: typeof initial, formData: FormData) {
  "use server";
  const parsed = UserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Entrada inválida" };
  await db.user.update({ where: { id: parsed.data.id }, data: parsed.data });
  return { error: null };
}

export function UserForm() {
  const [state, formAction, pending] = useActionState(updateUserAction, initial);
  return (
    <form action={formAction}>
      <input name="name" required />
      <button type="submit" disabled={pending}>Salvar</button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

### Inputs controlados

Use controlados quando o valor alimenta outra parte da UI, é formatado a cada tecla ou implementa validação em tempo real.

### Formulários complexos

Para formulários de várias etapas, arrays dinâmicos de campos ou validação entre campos: use uma biblioteca (React Hook Form, TanStack Form). Gerenciar o estado de formulários na mão além da complexidade trivial é uma armadilha de manutenção.

## Matriz de Decisão para Busca de Dados

| Necessidade | Ferramenta |
|---|---|
| Dados por requisição no Next.js App Router | `await fetch()` em RSC |
| Cache no cliente + mutações + invalidação | TanStack Query |
| Cache leve no cliente + revalidação | SWR |
| Assinaturas em tempo real | Server-Sent Events, WebSockets ou a API de assinatura da biblioteca |
| Disparo único sem esperar retorno | `fetch()` em um event handler |

Evite `useEffect` + `fetch` para dados da aplicação — condições de corrida, sem cache, sem retry, sem integração com Suspense.

## Receitas de Composição

### Slot via `children`

```tsx
<Layout>
  <Header />
  <Main>{content}</Main>
</Layout>
```

### Slots nomeados

```tsx
<Page header={<Nav />} sidebar={<Filters />}>
  <Results />
</Page>
```

### Compound components (estado compartilhado via Context)

```tsx
<Tabs defaultValue="profile">
  <Tabs.List>
    <Tabs.Trigger value="profile">Perfil</Tabs.Trigger>
    <Tabs.Trigger value="settings">Configurações</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="profile"><Profile /></Tabs.Panel>
  <Tabs.Panel value="settings"><Settings /></Tabs.Panel>
</Tabs>
```

### Render prop / function-as-child

Útil quando o pai precisa passar parâmetros para a saída renderizada:

```tsx
<DataLoader id={id}>
  {({ data, isLoading }) => isLoading ? <Spinner /> : <UserCard user={data} />}
</DataLoader>
```

Alternativa moderna: um hook (`useData(id)`) que retorna o mesmo formato — geralmente mais limpo.

## Performance

### Quando o `React.memo` Realmente Ajuda

Envolva um componente em `React.memo` apenas quando:

1. Ele re-renderiza com frequência
2. Suas props costumam ser as mesmas entre renders
3. Seu render é mensuravelmente caro

`React.memo` adiciona uma checagem de igualdade a cada render. Se as props mudam na maioria dos renders, a checagem é puro custo.

### Evitando Cascatas de Render

- Desça o estado em vez de subir, sempre que possível
- Divida o context: um context por responsabilidade, para que uma mudança em `themeContext` não re-renderize os consumidores de auth
- Use `useSyncExternalStore` para bibliotecas de estado externo — obrigatório para render concorrente seguro

### Listas

- Forneça props `key` estáveis (id do banco, não o índice do array)
- Virtualize listas longas com `@tanstack/react-virtual` ou `react-window` quando a quantidade de itens visíveis passar de ~50 com linhas não triviais

## Composição com Acessibilidade em Primeiro Lugar

- Sempre renderize HTML semântico (`<button>`, `<a>`, `<nav>`, `<main>`) antes de recorrer a atributos `role`
- Todo elemento interativo precisa ser alcançável pelo teclado
- Inputs de formulário precisam de label — `<label htmlFor>` ou `aria-label` se o rótulo visual for um ícone
- Gerencie o foco em mudanças de rota e na abertura/fechamento de modais
- Rode `axe` nos testes de componente (veja [skills/react-testing](../react-testing/SKILL.md))
- Referência cruzada: [frontend-a11y](../frontend-a11y/SKILL.md) e a skill `accessibility` cobrem os critérios da WCAG e bibliotecas de padrões

## Roteamento

Esta skill não depende de roteador. Os padrões acima funcionam com React Router, TanStack Router, Next.js App Router e Remix Router. Padrões específicos de cada roteador (loaders, actions, layouts aninhados) seguem a documentação do roteador — são responsabilidades do framework sobre o núcleo do React.

## Fora do Escopo (Seções de Referência)

- **Especificidades do Next.js**: carregamento de dados no App Router, Route Handlers, Middleware, Parallel Routes — assunto separado, use a documentação do Next.js
- **React Native**: os padrões específicos de plataforma diferem o bastante para justificar uma skill `react-native-patterns` separada (ainda não existe)
- **Remix**: as convenções de loader/action se sobrepõem às de RSC, mas seguem a documentação do Remix

## Relacionados

- Regras: [rules/react/](../../rules/react/) — estilo de código, hooks, padrões, segurança, testes
- Skills: [react-performance](../react-performance/SKILL.md) para o conjunto de regras de performance derivado da Vercel, [frontend-patterns](../frontend-patterns/SKILL.md) para questões de UI entre frameworks, `accessibility`, `angular-developer` para comparação entre frameworks
- Agentes: `react-reviewer` para revisão de código, `react-build-resolver` para erros de build/bundler
- Comandos: `/react-review`, `/react-build`, `/react-test`

## Exemplos

### Custom hook para busca com debounce

```tsx
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function SearchBox() {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const { data } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchApi(debounced),
    enabled: debounced.length > 0,
  });
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Results items={data ?? []} />
    </>
  );
}
```

### UI otimista com `useOptimistic` do React 19

```tsx
"use client";
import { useOptimistic } from "react";

export function MessageList({ messages }: { messages: Message[] }) {
  const [optimistic, addOptimistic] = useOptimistic(
    messages,
    (state, newMessage: Message) => [...state, newMessage],
  );

  async function send(formData: FormData) {
    const text = String(formData.get("text"));
    addOptimistic({ id: "pending", text, sender: "me" });
    await saveMessage(text);
  }

  return (
    <>
      <ul>{optimistic.map((m) => <li key={m.id}>{m.text}</li>)}</ul>
      <form action={send}>
        <input name="text" />
        <button type="submit">Enviar</button>
      </form>
    </>
  );
}
```

### Dividindo o context para evitar cascatas de render

```tsx
// Dois contexts: um muda raramente, outro com frequência
const ThemeContext = createContext<Theme>("light");
const NotificationsContext = createContext<Notification[]>([]);

// Um componente que só consome ThemeContext NÃO re-renderiza quando as notificações mudam
```
