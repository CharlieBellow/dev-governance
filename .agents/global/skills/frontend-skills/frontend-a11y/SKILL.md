---
name: frontend-a11y
description: Padrões de acessibilidade para React e Next.js — HTML semântico, atributos ARIA, labels de formulário, navegação por teclado, gerenciamento de foco e suporte a leitores de tela. Use ao construir ou revisar formulários, modais, dropdowns, tooltips ou abas, ao corrigir apontamentos de lint de a11y ou de code review, ou ao implementar navegação por teclado e gerenciamento de foco.
metadata:
  origin: community
---

# Padrões de Acessibilidade no Frontend

Padrões práticos de acessibilidade para React e Next.js. Cobre os problemas mais apontados em code review: formulários sem label, uso incorreto de ARIA, elementos interativos não semânticos e navegação por teclado quebrada.

## Quando Ativar

- Ao construir ou revisar componentes de formulário (`<input>`, `<select>`, `<textarea>`)
- Ao criar elementos interativos (modais, dropdowns, tooltips, abas)
- Ao usar `<div>` ou `<span>` com `onClick`
- Ao adicionar atributos `aria-*` a qualquer elemento
- Ao implementar navegação por teclado ou gerenciamento de foco
- Ao receber feedback de acessibilidade de ferramentas de code review (CodeRabbit, ESLint a11y)
- Ao construir componentes que precisam funcionar com leitores de tela

## Acessibilidade em Formulários

A falta do par `htmlFor` / `id` e mensagens de erro desconectadas são os problemas mais apontados em code review.

### Conexão do Label

```tsx
// RUIM: o label não tem ligação com o input — leitores de tela não conseguem associá-los
<label>E-mail</label>
<input type="email" />

// BOM: htmlFor corresponde ao id do input
<label htmlFor="email">E-mail</label>
<input id="email" type="email" />
```

### Campos Obrigatórios

```tsx
// RUIM: asterisco apenas visual não comunica nada aos leitores de tela
<label htmlFor="email">E-mail *</label>
<input id="email" type="email" />

// BOM: required ativa a validação nativa do navegador; aria-required sinaliza aos leitores de tela
<label htmlFor="email">
  E-mail <span aria-hidden="true">*</span>
</label>
<input id="email" type="email" required aria-required="true" />
```

### Mensagens de Erro

```tsx
// RUIM: o texto de erro existe visualmente, mas não está ligado ao input
<input id="email" type="email" />
<span className="error">E-mail inválido</span>

// BOM: aria-describedby conecta o input à sua mensagem de erro
// aria-invalid sinaliza o estado inválido aos leitores de tela
<input
  id="email"
  type="email"
  aria-describedby="email-error"
  aria-invalid={!!error}
/>
{error && (
  <span id="email-error" role="alert">
    {error}
  </span>
)}
```

### Formulário Acessível Completo

```tsx
interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = 'O e-mail é obrigatório';
    if (!password) newErrors.password = 'A senha é obrigatória';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="email">
          E-mail <span aria-hidden="true">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          aria-required="true"
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={!!errors.email}
          autoComplete="email"
        />
        {errors.email && (
          <span id="email-error" role="alert">
            {errors.email}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="password">
          Senha <span aria-hidden="true">*</span>
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          aria-required="true"
          aria-describedby={errors.password ? 'password-error' : undefined}
          aria-invalid={!!errors.password}
          autoComplete="current-password"
        />
        {errors.password && (
          <span id="password-error" role="alert">
            {errors.password}
          </span>
        )}
      </div>

      <button type="submit">Entrar</button>
    </form>
  );
}
```

## HTML Semântico

Use o elemento que corresponde à intenção. Leitores de tela e usuários de teclado dependem da semântica nativa.

```tsx
// RUIM: a div não tem role, suporte a teclado nem nome acessível
<div onClick={handleClick}>Enviar</div>

// BOM: o button recebe foco, é ativado com Enter/Espaço e é anunciado como "botão"
<button type="button" onClick={handleClick}>Enviar</button>
```

```tsx
// RUIM: navegação não semântica
<div onClick={() => navigate('/home')}>Início</div>

// BOM: a âncora suporta clique direito, clique do meio e navegação por teclado
<a href="/home">Início</a>
```

```tsx
// RUIM: hierarquia de headings pulada (h1 para h4)
<h1>Painel</h1>
<h4>Atividade Recente</h4>

// BOM: níveis de heading em sequência
<h1>Painel</h1>
<h2>Atividade Recente</h2>
```

## Atributos ARIA

Use ARIA apenas quando a semântica nativa do HTML não for suficiente. ARIA errado é pior que nenhum ARIA.

### aria-label vs aria-labelledby

```tsx
// aria-label: label em string inline — use quando não houver texto de label visível
<button aria-label="Fechar modal">
  <XIcon />
</button>

// aria-labelledby: referencia o texto de outro elemento — use quando houver label visível
<section aria-labelledby="section-title">
  <h2 id="section-title">Pedidos Recentes</h2>
  {/* conteúdo */}
</section>
```

### aria-describedby

```tsx
// Fornece uma descrição complementar além do label
<button
  aria-describedby="delete-warning"
  onClick={handleDelete}
> Excluir conta
</button>
<p id="delete-warning">Esta ação não pode ser desfeita.</p>
```

### aria-live para Conteúdo Dinâmico

```tsx
// Use aria-live para anunciar conteúdo que é atualizado sem recarregar a página
// polite: espera o usuário terminar a ação atual antes de anunciar
// assertive: interrompe imediatamente — use apenas para erros urgentes

export function StatusMessage({ message, isError }: { message: string; isError?: boolean }) {
  return (
    <div role="status" aria-live={isError ? 'assertive' : 'polite'} aria-atomic="true">
      {message}
    </div>
  );
}
```

### aria-expanded e aria-controls

```tsx
export function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div>
      <button aria-expanded={isOpen} aria-controls={contentId} onClick={() => setIsOpen(prev => !prev)}>
        {title}
      </button>
      <div id={contentId} hidden={!isOpen}>
        {children}
      </div>
    </div>
  );
}
```

## Navegação por Teclado

Todo elemento interativo precisa ser alcançável e operável apenas pelo teclado.

### Dropdown Customizado

```tsx
export function Dropdown({ options, onSelect }: { options: string[]; onSelect: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();

  if (!options.length) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) onSelect(options[activeIndex]);
        setIsOpen(prev => !prev);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-controls={listId}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => setIsOpen(prev => !prev)}
    >
      <span>{options[activeIndex]}</span>
      {isOpen && (
        <ul id={listId} role="listbox">
          {options.map((option, index) => (
            <li
              key={option}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Gerenciamento de Foco

O foco precisa se mover de forma lógica quando o estado da UI muda — principalmente em modais e transições de rota.

### Restauração do Foco em Modais

> Este exemplo cobre o foco inicial e a restauração. Para um focus trap completo (ciclo de Tab/Shift+Tab dentro do modal), use uma biblioteca como [`focus-trap-react`](https://github.com/focus-trap/focus-trap-react), que trata casos de borda como conteúdo dinâmico e portals aninhados.

```tsx
export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Salva o elemento focado atualmente e move o foco para dentro do modal
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else {
      // Devolve o foco ao elemento que abriu o modal
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} onKeyDown={e => e.key === 'Escape' && onClose()}>
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose}>Fechar</button>
    </div>
  );
}
```

## Imagens e Ícones

```tsx
// RUIM: ícone decorativo anunciado como imagem sem label
<img src="/icon.svg" />

// BOM: imagem decorativa escondida dos leitores de tela
<img src="/decoration.png" alt="" aria-hidden="true" />

// BOM: imagem significativa com texto alternativo descritivo
<img src="/chart.png" alt="A receita mensal aumentou 23% de janeiro a março" />

// BOM: botão de ícone com label acessível
<button aria-label="Excluir item">
  <TrashIcon aria-hidden="true" />
</button>
```

## Movimento Reduzido

Respeite os usuários que pediram movimento reduzido nas configurações do sistema operacional.

```tsx
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// Uso
export function AnimatedCard({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      style={{
        transition: reduceMotion ? 'none' : 'transform 300ms ease'
      }}
    >
      {children}
    </div>
  );
}
```

## Antipadrões

```tsx
// RUIM: onClick em elemento não interativo, sem suporte a teclado
<div onClick={handleClick}>Clique aqui</div>

// RUIM: aria-label em uma div sem role
<div aria-label="Navegação">...</div>

// RUIM: placeholder usado no lugar do label
<input placeholder="Digite seu e-mail" />

// RUIM: tabIndex positivo cria uma ordem de tabulação imprevisível
<button tabIndex={3}>Enviar</button>

// RUIM: aria-hidden em um elemento focável — usuários de teclado ficam presos
<button aria-hidden="true">Abrir</button>

// RUIM: role="button" em div sem handler de teclado
<div role="button" onClick={handleClick}>Enviar</div>
// Faltando: tabIndex={0}, onKeyDown para Enter/Espaço
```

## Checklist

Antes de enviar qualquer componente interativo para revisão:

- [ ] Todo `<input>`, `<select>` e `<textarea>` tem um `<label>` conectado via `htmlFor`/`id`
- [ ] Mensagens de erro estão ligadas com `aria-describedby` e marcadas com `role="alert"`
- [ ] Nenhum `onClick` em `<div>` ou `<span>` sem `role`, `tabIndex` e `onKeyDown`
- [ ] Botões só com ícone têm `aria-label`
- [ ] Imagens decorativas usam `alt=""` e `aria-hidden="true"`
- [ ] Modais devolvem o foco ao fechar (para focus trap completo com ciclo de Tab/Shift+Tab, use uma biblioteca como `focus-trap-react`)
- [ ] Atualizações de conteúdo dinâmico usam `aria-live`
- [ ] `prefers-reduced-motion` é respeitado nas animações

## Skills Relacionadas

- `frontend-patterns` — padrões gerais de componentes e estado em React
- `accessibility` — critérios da WCAG 2.2 para Web, iOS e Android
- `design-system` — consistência de design tokens e componentes
- `motion-foundations` e `motion-patterns`: padrões de animação com considerações de acessibilidade
