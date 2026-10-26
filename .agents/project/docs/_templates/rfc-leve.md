# RFC Leve <ID>: [Título curto e específico da decisão]

> Use este template quando a decisão for **interna à área, sem afetar outra área, sem alterar o design system e sem exigir infraestrutura nova**. Copie para `back/rfcs/BE-000X-nome-curto.md`, `front/rfcs/FE-000X-nome-curto.md` ou `geral/rfcs/GER-000X-nome-curto.md`.
> Se durante a escrita a decisão se mostrar maior (afeta outra área, cria componente/token visual, ou exige infraestrutura), migre para `rfc-completo.md`.

| Campo | Valor |
|---|---|
| **Status** | Proposto / Aceito / Implementado / Rejeitado / Substituído por <ID> |
| **Área** | ( ) Back &nbsp;&nbsp; ( ) Front &nbsp;&nbsp; ( ) Geral |
| **Autor** | |
| **Data** | AAAA-MM-DD |
| **Módulo(s)/componente(s) afetado(s)** | |

---

## 1. Problema

Descreva o problema real que motivou esta decisão.

## 2. Decisão

O que foi decidido, e por quê.

## 3. Alternativas descartadas (breve)

- [Alternativa]: [motivo da rejeição em uma linha]

*(Se não houve alternativa real avaliada, escreva "N/A".)*

## 4. Precedente no projeto

Se segue um padrão já estabelecido em outro módulo, cite o arquivo/commit. Se não houver, declare isso.

## 5. Riscos em aberto

Liste incertezas reais, se houver.

*(Se não houver risco relevante, registre "N/A — decisão de baixo risco".)*

---

*RFC leve segue lazy consensus: entra em vigor em 24h ou "documentando e seguindo", salvo objeção registrada no PR antes desse prazo. Ver `.agents/project/docs/guia-fluxo-documentacao.md`.*
