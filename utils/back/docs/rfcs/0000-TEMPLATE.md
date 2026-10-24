# RFC 000X: [Título curto e específico da decisão]

> Copie este arquivo para `docs/rfcs/000X-nome-curto-da-decisao.md`, preencha todas as seções e abra como Pull Request. Não delete nenhuma seção, mesmo que curta — se não se aplicar, escreva "N/A" e o motivo.

| Campo | Valor |
|---|---|
| **Status** | Proposto / Aceito / Rejeitado / Substituído por RFC-000X |
| **Autor** | |
| **Data** | AAAA-MM-DD |
| **Módulo(s) afetado(s)** | |
| **Categoria de impacto** | ( ) Interno, sem impacto externo &nbsp;&nbsp; ( ) Afeta consumo do front &nbsp;&nbsp; ( ) Quebra contrato existente com o front &nbsp;&nbsp; ( ) Requer infraestrutura nova |
| **Janela de aviso aplicada** | (ex.: 24h lazy consensus / 48–72h úteis com confirmação ativa do consumidor / ~1 semana com confirmação ativa / aguardando aprovação de infra) |
| **Confirmação ativa recebida de** | (obrigatório para categorias com confirmação ativa; deixar em branco até a resposta chegar) |
| **Pessoas marcadas no PR** | @ |

---

## 1. Problema

Descreva o problema real que motivou esta decisão. Seja específico — não "o código está desorganizado", e sim o sintoma concreto (bug, ambiguidade, limitação) que precisa ser resolvido.

## 2. Contexto

Qualquer informação necessária para quem for ler isso sem ter acompanhado a discussão: requisito relacionado (referencie NEC/RF/RN da documentação original do projeto, se aplicável), restrição técnica, decisão anterior que este RFC estende ou substitui.

## 3. Alternativas consideradas

Liste **todas** as alternativas avaliadas, incluindo as rejeitadas.

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

Qual alternativa foi escolhida, e por quê — em termos que qualquer pessoa do time (mesmo sem profundo conhecimento técnico) consiga entender a lógica central.

## 5. Precedente no projeto

Se esta decisão segue um padrão já estabelecido em outro módulo, cite o arquivo/commit exato. Se não houver precedente, declare isso explicitamente ("Não há precedente direto neste projeto; a decisão se baseia em [prática de mercado / RFC / documentação externa]").

```
Exemplo:
src/modules/accounts/presentation/role/controllers/create-role-permissions.controller.ts
```

## 6. Consequências

O que muda na prática depois desta decisão — para o código, para quem consome a API (se houver), para decisões futuras que dependem desta.

### 6.1 Positivas

### 6.2 Negativas / trade-offs aceitos

## 7. Riscos e perguntas em aberto

Liste incertezas reais desta decisão — não uma objeção hipotética já respondida.

- Pontos não resolvidos ou não testados nesta decisão.
- Trade-offs aceitos sem certeza de que é o cenário mais provável.
- Pontos que, se contestados depois, justificam reabrir a discussão em vez de remeter a uma resposta fixada aqui.

*(Se não houver risco relevante, registre "N/A — decisão de baixo risco" em vez de deixar em branco.)*

## 8. Escopo de aplicação futura

Esta decisão vale só para este módulo, ou é convenção que módulos futuros devem seguir? Seja explícito — isso evita ambiguidade quando alguém novo entrar no projeto.

---

*Este RFC segue o modelo de "lazy consensus": a decisão entra em vigor ao final da janela de aviso indicada acima, salvo objeção registrada no Pull Request antes desse prazo.*