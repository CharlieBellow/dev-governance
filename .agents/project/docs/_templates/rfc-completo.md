# RFC <ID>: [Título curto e específico da decisão]

> Copie este arquivo para a pasta da área com o próximo número disponível:
> `back/rfcs/BE-000X-nome-curto.md`, `front/rfcs/FE-000X-nome-curto.md` ou `geral/rfcs/GER-000X-nome-curto.md`.
> Preencha todas as seções e abra como Pull Request. Não delete nenhuma seção — se não se aplicar, escreva "N/A" e o motivo.

| Campo | Valor |
|---|---|
| **Status** | Proposto / Aceito / Implementado / Rejeitado / Substituído por <ID> |
| **Área** | ( ) Back &nbsp;&nbsp; ( ) Front &nbsp;&nbsp; ( ) Geral |
| **Autor** | |
| **Data** | AAAA-MM-DD |
| **Issue relacionada** | #___ |
| **Módulo(s)/componente(s) afetado(s)** | |
| **Categoria de impacto** | ( ) Interno, sem impacto em outra área &nbsp;&nbsp; ( ) Afeta outra área (sem quebrar) &nbsp;&nbsp; ( ) Quebra contrato existente &nbsp;&nbsp; ( ) Altera design system &nbsp;&nbsp; ( ) Requer infraestrutura nova |
| **Janela de aviso aplicada** | (ex.: 24h lazy consensus / 48–72h úteis com confirmação ativa / ~1 semana com confirmação ativa / aguardando aprovação de infra ou de design) |
| **Confirmação ativa recebida de** | (obrigatório para categorias com confirmação ativa; deixar em branco até a resposta chegar) |
| **Pessoas marcadas no PR** | @ |
| **Substitui / estende** | (ID de RFC anterior, se houver) |

---

## 1. Problema

Descreva o problema real que motivou esta decisão. Seja específico — não "o código está desorganizado", e sim o sintoma concreto (bug, ambiguidade, limitação, tela que o design system não cobre) que precisa ser resolvido.

## 2. Contexto

Tudo o que é necessário para quem for ler isso sem ter acompanhado a discussão: requisito relacionado, restrição técnica, decisão anterior que este RFC estende ou substitui.

## 3. Alternativas consideradas

Liste **todas** as alternativas avaliadas, incluindo as rejeitadas.

> **Front:** inclua sempre a alternativa "resolver com componentes/tokens já existentes no design system" e explique por que ela não basta.

### Alternativa A: [nome]
- Descrição breve.
- Prós:
- Contras:

### Alternativa B: [nome]
- Descrição breve.
- Prós:
- Contras:

*(adicione quantas forem necessárias)*

## 4. Decisão

Qual alternativa foi escolhida, e por quê — em termos que qualquer pessoa do time consiga entender a lógica central.

## 5. Precedente no projeto

Se esta decisão segue um padrão já estabelecido em outro módulo/componente, cite o arquivo/commit exato. Se não houver precedente, declare isso explicitamente ("Não há precedente direto neste projeto; a decisão se baseia em [prática de mercado / documentação externa]").

```
Exemplo:
src/modules/accounts/presentation/role/controllers/create-role-permissions.controller.ts
src/components/ui/button.tsx
```

## 6. Consequências

O que muda na prática — para o código, para quem consome (outra área, usuário final), para decisões futuras que dependem desta.

> **Front, se alterar o design system:** liste exatamente o que entra em `front/design-system.md` (componente, variante, token) e quais telas existentes precisam ser migradas.

### 6.1 Positivas

### 6.2 Negativas / trade-offs aceitos

## 7. Riscos e perguntas em aberto

Liste incertezas reais desta decisão — não uma objeção hipotética já respondida.

- Pontos não resolvidos ou não testados nesta decisão.
- Trade-offs aceitos sem certeza de que é o cenário mais provável.
- Pontos que, se contestados depois, justificam reabrir a discussão.

*(Se não houver risco relevante, registre "N/A — decisão de baixo risco" em vez de deixar em branco.)*

## 8. Escopo de aplicação futura

Esta decisão vale só para este módulo/componente, ou é convenção que todo código futuro da área deve seguir? Seja explícito — isso evita ambiguidade quando alguém novo entrar no projeto.

---

*A decisão entra em vigor ao final da janela de aviso indicada acima — por lazy consensus apenas na categoria "Interno"; nas demais, somente após a confirmação ativa registrada. Ver `.agents/project/docs/guia-fluxo-documentacao.md`.*
