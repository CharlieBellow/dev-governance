# Design de UI FE-D-<000X>: [Nome da tela/feature]

> Copie este arquivo para `front/designs/FE-D-000X-nome-curto.md`. Use para tela nova, feature nova ou mudança relevante de fluxo em uma tela existente.
> **Regra deste documento:** a tela é montada com o que já existe em `front/design-system.md`. Se a seção 3.2 não ficar vazia, abra um RFC em `front/rfcs/` (categoria "Altera design system") **antes** de implementar.

| Campo | Valor |
|---|---|
| **Status** | Em design / Em implementação / Pronto / Descontinuado |
| **Autor** | |
| **Data** | AAAA-MM-DD |
| **Issue relacionada** | #___ |
| **Rota(s) da tela** | (ex.: `/responsibles`) |
| **Protótipo / referência visual** | (link do Figma ou equivalente, se houver) |
| **Design(s) de API consumidos** | `back/designs/BE-D-000X-*.md` |
| **RFC(s) relacionado(s)** | `front/rfcs/FE-000X-*.md` |

---

## 1. Escopo

### 1.1 O que entra nesta versão

### 1.2 O que NÃO entra (fora de escopo por decisão, não por esquecimento)

## 2. Fluxo do usuário

Passo a passo do que a pessoa faz na tela, do ponto de entrada ao resultado.

1.
2.

## 3. Composição com o design system

### 3.1 Componentes existentes utilizados

| Componente (do catálogo) | Variante/props | Onde é usado na tela |
|---|---|---|
| | | |

### 3.2 Componentes, variantes ou tokens que NÃO existem no design system

*(Deve ficar vazio. Se não ficar, liste aqui e referencie o RFC `FE-000X` que aprova a adição. Sem RFC aprovado, a tela não é implementada com esse elemento.)*

- N/A

### 3.3 Componentes específicos da feature

Componentes que só fazem sentido nesta tela (ex.: `ResponsiblesTable`). Eles **compõem** componentes do design system — não reimplementam estilo (sem cor/espaçamento literal, sem botão/input próprio).

| Componente | Composto por | Pasta |
|---|---|---|
| | | |

## 4. Estados da tela

| Estado | Comportamento / componente usado |
|---|---|
| Carregando | |
| Vazio | |
| Erro (rede / 4xx / 5xx) | |
| Sucesso / feedback de ação | |
| Sem permissão | |

## 5. Dados e integração

- Endpoints consumidos (conforme o design de API referenciado — não redefinir o contrato aqui):
- Estratégia de busca/cache/invalidação:
- Validação de formulário (schema):

Se o front precisa de algo que o design de API não oferece, **registre aqui e abra pedido de alteração no design do back** — não adapte o contrato por conta própria no front.

## 6. Acessibilidade e responsividade

- Navegação por teclado / foco:
- Rótulos e mensagens para leitores de tela:
- Comportamento em telas pequenas:

## 7. Casos de borda considerados

Situações não óbvias (lista muito longa, texto muito grande, ação dupla, permissão parcial) e como são tratadas.

## 8. Fora de escopo / trabalho futuro

O que foi conscientemente adiado, e por quê.
