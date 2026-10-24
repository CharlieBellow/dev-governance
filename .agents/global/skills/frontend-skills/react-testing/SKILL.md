---
name: react-testing
description: Testes de componentes React com React Testing Library, Vitest/Jest, MSW para mock de rede, asserções de acessibilidade com axe e o critério para decidir entre testes de componente e execuções end-to-end com Playwright/Cypress. Use ao escrever ou corrigir testes de componentes, hooks ou páginas React.
metadata:
  origin: ECC
---

# Testes em React

Padrões completos de testes em React para testes de componente focados em comportamento, testes de custom hooks, asserções de acessibilidade e mock no nível da rede.

## Quando Ativar

- Ao escrever testes para componentes, custom hooks ou páginas React
- Ao adicionar cobertura de testes a componentes legados sem testes
- Ao migrar do Enzyme ou de padrões da era de class components para o React Testing Library
- Ao configurar Vitest ou Jest em um novo projeto React
- Ao mockar requisições HTTP nos testes
- Ao verificar violações de acessibilidade
- Ao decidir quais testes ficam no RTL, no Playwright Component Testing ou no E2E completo

## Princípio Fundamental

Teste o que o usuário vê e faz, não detalhes de implementação.

Um teste deve:

- Renderizar o componente com os mesmos providers que ele tem em produção
- Interagir com ele via queries acessíveis (role, label) e `userEvent`
- Verificar a saída visível e os efeitos colaterais observáveis (callback chamado, requisição enviada)

Um teste NÃO deve:

- Inspecionar o estado do componente, as props passadas aos filhos ou quais hooks foram chamados
- Mockar o próprio React ou hooks do framework
- Verificar a quantidade de renders ou a estrutura do DOM além do que afeta o usuário

## Escolha da Biblioteca

| Runner | Quando | Observação |
|---|---|---|
| **Vitest** | Vite, Remix, setups modernos | Mais rápido, ESM nativo, API compatível com Jest |
| **Jest** | Next.js, CRA, repositórios estabelecidos | Padrão em muitos projetos React |
| **Playwright Component Testing** | Precisa de engine de navegador real | Use quando o JSDOM não tem o recurso necessário |
| **Cypress Component Testing** | Navegador real, Cypress já em uso | Alternativa ao Playwright CT |

Escolha um. Não rode RTL + Vitest E Playwright CT no mesmo repositório, a menos que tenha uma separação clara de responsabilidades.

## Prioridade das Queries

O React Testing Library expõe queries em três níveis — use de cima para baixo:

1. **Acessíveis a todos**: `getByRole`, `getByLabelText`, `getByPlaceholderText`, `getByText`, `getByDisplayValue`
2. **Semânticas**: `getByAltText`, `getByTitle`
3. **Test IDs (saída de emergência)**: `getByTestId`

```tsx
// Melhor
screen.getByRole("button", { name: /save/i });

// OK para inputs
screen.getByLabelText("Email");

// Último recurso
screen.getByTestId("save-btn");
```

Variantes:

- `getBy*` — lança erro se não encontrar
- `queryBy*` — retorna `null` (use para "verificar ausência")
- `findBy*` — assíncrona, retorna uma Promise (use para elementos que aparecem após trabalho assíncrono)

## Interação do Usuário com `userEvent`

```tsx
import userEvent from "@testing-library/user-event";

test("envia o formulário", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<UserForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText("Email"), "user@example.com");
  await user.click(screen.getByRole("button", { name: /save/i }));

  expect(onSubmit).toHaveBeenCalledWith({ email: "user@example.com" });
});
```

- Sempre use `await` nas chamadas do userEvent
- Chame `userEvent.setup()` uma vez por teste e reutilize o `user` retornado
- O `userEvent` simula uma sequência real do navegador; o `fireEvent` dispara um único evento sintético — prefira `userEvent`

## Padrões Assíncronos

```tsx
// Elemento que aparece após trabalho assíncrono
expect(await screen.findByText("Loaded")).toBeInTheDocument();

// Asserção de efeito colateral
await waitFor(() => expect(saveSpy).toHaveBeenCalled());

// Elemento que deve sumir
await waitForElementToBeRemoved(() => screen.queryByText("Loading"));
```

Nunca use `setTimeout` + asserção — fica instável. Use os matchers acima.

## Mock de Rede com MSW

O Mock Service Worker faz mock na camada de rede. O componente, os hooks e a biblioteca de fetch se comportam exatamente como em produção.

### Setup

```ts
// test/setup.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) =>
    HttpResponse.json({ id: params.id, name: "Alice" }),
  ),
  http.post("/api/users", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: "new-id", ...body }, { status: 201 });
  }),
];

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Configure `onUnhandledRequest: "error"` para que qualquer requisição sem mock faça o teste falhar de forma visível — passar em silêncio é pior que ficar vermelho.

### Sobrescrita por teste

```tsx
test("renderiza erro em caso de 500", async () => {
  server.use(
    http.get("/api/users/:id", () => new HttpResponse(null, { status: 500 })),
  );
  render(<UserPage id="1" />);
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Envolvendo com Providers

Envolva os providers uma única vez em um `test-utils.tsx`:

```tsx
// test-utils.tsx
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
    options,
  );
}

export * from "@testing-library/react";
```

Depois, faça `import { renderWithProviders, screen } from "test-utils"` em todo arquivo de teste.

## Testando Custom Hooks

```tsx
import { renderHook, act } from "@testing-library/react";

test("useCounter incrementa e decrementa", () => {
  const { result } = renderHook(() => useCounter(0));

  expect(result.current.count).toBe(0);

  act(() => result.current.increment());
  expect(result.current.count).toBe(1);

  act(() => result.current.decrement());
  expect(result.current.count).toBe(0);
});

test("useCounter aceita valor inicial", () => {
  const { result } = renderHook(() => useCounter(10));
  expect(result.current.count).toBe(10);
});

test("useUser busca os dados do usuário", async () => {
  // Instancie o QueryClient UMA vez por teste, fora do wrapper, para que sobreviva aos re-renders.
  // Criá-lo dentro da closure do wrapper reseta o cache a cada render e deixa os testes instáveis.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(() => useUser("1"), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual({ id: "1", name: "Alice" });
});
```

- Envolva chamadas que mudam estado em `act`
- Teste apenas pela API pública do hook
- Para hooks que usam context, passe um `wrapper`

## Asserções de Acessibilidade

```tsx
import { axe, toHaveNoViolations } from "jest-axe"; // ou vitest-axe
expect.extend(toHaveNoViolations);

test("UserCard não tem violações de a11y", async () => {
  const { container } = render(<UserCard user={mockUser} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

Rode o axe nos testes de todo componente interativo. Ele detecta:

- Inputs de formulário sem label
- Uso inválido de ARIA
- Contraste de cor ruim (limitado — o JSDOM não tem engine de CSS real, então só funciona para estilos inline; contraste visual é assunto do Playwright)
- Imagens sem texto alternativo
- Violações na ordem dos headings

Referência cruzada: [frontend-a11y](../frontend-a11y/SKILL.md) e a skill `accessibility` para o guia mais amplo de testes de a11y.

## Quando NÃO Usar Testes de Snapshot

Snapshots da saída renderizada:

- Quebram a cada mudança de estilo
- São aprovados sem olhar durante a revisão
- Testam detalhe de implementação (estrutura do DOM), não comportamento

Usos aceitáveis de snapshot:

- Funções puras de serialização de dados (`formatInvoice(invoice)` -> string estável)
- Arquivos de configuração gerados (ex.: saída de config do webpack)

Para regressão visual de componentes, use screenshots do Playwright/Cypress ou Percy/Chromatic — diffs visuais reais, não strings de DOM.

## Quando Recorrer ao Playwright / Cypress

O JSDOM (usado pelo Vitest/Jest) não consegue:

- Renderizar layout real (flexbox, grid, queries de viewport)
- Executar animações nativas do navegador e transições CSS
- Testar comportamento de scroll, drag-and-drop, colar da área de transferência
- Lidar com iframes, popups, downloads e fluxos cross-origin
- Rodar rede real em ambiente controlado com suporte completo ao DevTools

Para qualquer um desses, use o Playwright Component Testing (teste de componente em navegador real) ou E2E completo. Veja a [skill e2e-testing](../../e2e-testing/SKILL.md).

Critério de decisão:

- Um hook, um componente de apresentação, um formulário com lógica -> RTL
- Um componente cujo layout importa ou que usa APIs do navegador ausentes no JSDOM -> Playwright CT
- Um fluxo completo do usuário entre várias páginas -> E2E com Playwright/Cypress

## Metas de Cobertura

| Camada | Meta |
|---|---|
| Utilitários puros | >=90% |
| Custom hooks | >=85% |
| Componentes de apresentação | >=80% — comportamento, não linhas |
| Componentes contêiner | >=70% — caminhos principais + estados de erro |
| Páginas | Cobertas separadamente por E2E; no mínimo smoke test |

Configure via `vitest.config.ts` / `jest.config.js`:

```ts
// vitest.config.ts
test: {
  coverage: {
    provider: "v8",
    reporter: ["text", "html", "lcov"],
    thresholds: {
      lines: 80,
      functions: 80,
      branches: 70,
      statements: 80,
    },
  },
}
```

## Antipadrões

- `container.querySelector("...")` — contorna as queries de acessibilidade e deixa testes passarem quando usuários reais falhariam
- Verificar a quantidade de renders — detalhe de implementação
- `jest.mock("react", ...)` — nunca faça mock do React. Refatore o componente
- Mockar componentes filhos por padrão — teste a integração, não o isolamento. Faça mock só quando o filho tiver efeitos colaterais pesados
- Ignorar avisos de `act()` — eles sinalizam bugs reais (atualização de estado após desmontar, falta de tratamento assíncrono)
- Compartilhar estado mutável entre testes — fica instável quando a ordem dos testes muda
- Testes que passam mesmo removendo o `it.skip()` — seu teste não verifica de fato o que você pensa

## Fluxo de TDD

```
RED      -> Escreva um teste que falha para o próximo requisito
GREEN    -> Escreva o mínimo de código do componente para passar
REFACTOR -> Melhore o componente, os testes continuam verdes
REPEAT   -> Próximo requisito
```

Para novos componentes:

1. Defina o tipo das props e a assinatura do componente
2. Escreva o primeiro teste para o caso mais simples
3. Verifique que ele falha pelo motivo certo
4. Implemente apenas o suficiente para passar
5. Adicione o próximo caso de teste
6. Refatore quando o terceiro teste parecido revelar um padrão

## Comandos de Teste

```bash
# Vitest
vitest                            # modo watch
vitest run                        # execução única
vitest run --coverage             # com cobertura
vitest run path/to/file.test.tsx  # arquivo único

# Jest
jest --watch
jest --coverage
jest path/to/file.test.tsx

# Modo CI
CI=true vitest run --coverage
```

## Relacionados

- Regras: [rules/react/testing.md](../../rules/react/testing.md)
- Skills: [react-patterns](../react-patterns/SKILL.md), `accessibility`, `e2e-testing`, `tdd-workflow`
- Agentes: `react-reviewer` (revisa a qualidade dos testes durante o code review), `tdd-guide` (garante o processo de TDD)
- Comandos: `/react-test`, `/react-review`

## Exemplos

### Envio de formulário com MSW e userEvent

```tsx
test("envia o formulário de usuário e mostra sucesso", async () => {
  server.use(
    http.post("/api/users", () =>
      HttpResponse.json({ id: "1", name: "Alice" }, { status: 201 }),
    ),
  );

  const user = userEvent.setup();
  renderWithProviders(<UserForm />);

  await user.type(screen.getByLabelText("Name"), "Alice");
  await user.type(screen.getByLabelText("Email"), "alice@example.com");
  await user.click(screen.getByRole("button", { name: /save/i }));

  expect(await screen.findByText(/saved successfully/i)).toBeInTheDocument();
});
```

### Testando um error boundary

```tsx
function Broken() {
  throw new Error("boom");
}

test("error boundary renderiza o fallback", () => {
  // Silencia o console.error do React para o throw esperado e depois restaura, para que
  // o spy não vaze entre testes e esconda erros reais em outros lugares.
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  } finally {
    errorSpy.mockRestore();
  }
});
```

### Testando uma fronteira de Suspense

```tsx
test("mostra o loading e depois o conteúdo", async () => {
  renderWithProviders(
    <Suspense fallback={<div>Loading...</div>}>
      <UserDetail id="1" />
    </Suspense>,
  );

  expect(screen.getByText("Loading...")).toBeInTheDocument();
  expect(await screen.findByText("Alice")).toBeInTheDocument();
});
```
