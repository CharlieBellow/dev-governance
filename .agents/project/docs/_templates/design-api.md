# Design de API BE-D-<000X>: [Nome da feature]

> Copie este arquivo para `back/designs/BE-D-000X-nome-curto.md`. Use apenas quando a feature tem um **contrato externo** (API consumida pelo front, por outro serviço, etc.). Se a mudança é puramente interna, um RFC em `back/rfcs/` já é suficiente — não crie design redundante.
> Este documento é a **fonte da verdade do contrato**: o design de UI do front referencia este arquivo, nunca redefine o contrato.

| Campo | Valor |
|---|---|
| **Status** | Em design / Em implementação / Pronto / Descontinuado |
| **Autor** | |
| **Data** | AAAA-MM-DD |
| **Issue relacionada** | #___ |
| **RFC(s) relacionado(s)** | `back/rfcs/BE-000X-*.md` |
| **Consumidor(es)** | (ex.: front — tela X; serviço externo Y) |
| **Design(s) de UI que consomem** | `front/designs/FE-D-000X-*.md` |

---

## 1. Escopo

### 1.1 O que entra nesta versão

### 1.2 O que NÃO entra (fora de escopo por decisão, não por esquecimento)

## 2. Contrato da API

Para cada endpoint novo ou alterado:

### `MÉTODO /caminho/da/rota`

**Descrição:**

**Autorização:** (quem pode chamar — role/permissão)

**Request:**
```json
{
  "campo": "tipo — obrigatório/opcional — descrição"
}
```

**Resposta (sucesso):** `200` / `201`
```json
{
}
```

**Respostas de erro relevantes:**
| Status | Código de erro | Quando ocorre |
|---|---|---|
| | | |

**Regras de negócio aplicadas nesta rota:**
-

*(repita o bloco acima para cada endpoint novo/alterado)*

## 3. Modelo de dados

Novas entidades, campos adicionados ou relações alteradas. Se alterar entidade existente, destaque isso.

## 4. Pendências do lado do consumidor (ex.: front)

O que precisa ser implementado do outro lado para consumir esta feature. Liste de forma acionável — é o checklist da outra pessoa/time.

- [ ]
- [ ]

## 5. Casos de borda considerados

Situações não óbvias pensadas durante o design (concorrência, lista vazia, permissão insuficiente, registro duplicado) e como são tratadas.

## 6. Fora de escopo / trabalho futuro

O que foi conscientemente adiado, e por quê — para não ser confundido com esquecimento.
