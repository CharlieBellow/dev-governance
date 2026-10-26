# Documentação do Front-end

> Processo geral (quando documentar, janelas de aviso): [`../guia-fluxo-documentacao.md`](../guia-fluxo-documentacao.md). Regras para IA: [`../README.md`](../README.md#se-você-é-uma-ia-sendo-usada-para-desenvolver-ou-revisar-código-deste-projeto).

Este arquivo resume os **padrões vigentes** do front. O padrão visual (tokens e componentes) fica em [`design-system.md`](design-system.md) — **leia-o antes de criar qualquer componente.** Código que não segue estes padrões só entra com um RFC novo referenciando o anterior.

## Regra de ouro

> **Antes de criar, reutilize. Antes de inventar, documente.**
> Componente novo de UI genérica (botão, input, modal, card, badge, tabela...) ou valor visual fora dos tokens **não nasce dentro de uma feature** — nasce de um RFC aprovado e entra primeiro no design system.

## Padrões vigentes

> Preencha conforme o projeto. Um padrão sem RFC de origem é marcado como "herdado" — candidato a RFC leve de registro.

| Tema | Padrão adotado | RFC de origem |
|---|---|---|
| Framework / roteamento | Next.js App Router, Server Components por padrão; `"use client"` só quando necessário, conforme `GLOBAL_RULES.md` | herdado |
| Biblioteca de UI base | *(ex.: shadcn/ui sobre Radix + Tailwind)* | |
| Estilização | Apenas tokens do design system; sem valores literais de cor/espaçamento/fonte | herdado |
| Estrutura de pastas | *(ex.: `components/ui/` = design system · `components/<feature>/` = específicos · `app/` = rotas)* | |
| Data fetching / cache | *(ex.: TanStack Query / Server Actions)* | |
| Formulários / validação | *(ex.: React Hook Form + Zod)* | |
| Ícones | *(ex.: lucide-react — nenhuma outra lib de ícones)* | |
| Testes | Vitest + Testing Library para componentes e hooks | herdado |
| Acessibilidade | Semântica HTML, foco visível, rótulos ARIA quando necessário | herdado |

## Índice de RFCs do front

| RFC | Título | Status |
|---|---|---|
| — | *(nenhum ainda — copie `../_templates/rfc-leve.md` ou `../_templates/rfc-completo.md` para `rfcs/FE-0001-nome.md`)* | — |

## Índice de designs de UI

| Design | Tela/feature | API consumida | Status |
|---|---|---|---|
| — | *(nenhum ainda — copie `../_templates/design-ui.md` para `designs/FE-D-0001-nome.md`)* | — | — |
