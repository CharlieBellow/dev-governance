# Design: [Nome da feature]

> Copie este arquivo para `docs/designs/nome-curto-da-feature.md`. Use este template apenas quando a feature tem um **contrato externo** (API consumida pelo front, por outro serviço, etc.). Se a mudança é puramente interna, um RFC em `docs/rfcs/` já é suficiente — não crie design doc redundante.

| Campo | Valor |
|---|---|
| **Status** | Em design / Em implementação / Pronto / Descontinuado |
| **Autor** | |
| **Data** | AAAA-MM-DD |
| **Issue relacionada** | #___ |
| **RFC(s) relacionado(s)** | `docs/rfcs/000X-*.md` |
| **Consumidor(es)** | (ex.: frontend, GLPI, serviço externo) |

---

## 1. Escopo

### 1.1 O que entra nesta versão

### 1.2 O que NÃO entra (fora de escopo por decisão, não por esquecimento)

## 2. Contrato da API

Para cada endpoint novo ou alterado:

### `MÉTODO /caminho/da/rota`

**Descrição:**

**Request:**
```json
{
  "campo": "tipo — obrigatório/opcional — descrição"
}
```

**Resposta (sucesso):**
```json
{
}
```

**Respostas de erro relevantes:**
| Status | Quando ocorre |
|---|---|
| | |

**Regras de negócio aplicadas nesta rota:**
-

*(repita o bloco acima para cada endpoint novo/alterado)*

## 3. Modelo de dados

Novas entidades, campos adicionados, ou relações alteradas. Se alterar entidade existente, destaque isso.

## 4. Pendências do lado do consumidor (ex.: frontend)

O que precisa ser implementado do outro lado para consumir esta feature. Liste de forma acionável — isso é o que a outra pessoa/time vai usar como checklist.

- [ ]
- [ ]

## 5. Casos de borda considerados

Situações não óbvias que foram pensadas durante o design (concorrência, arquivo vazio, permissão insuficiente, etc.) e como são tratadas.

## 6. Fora de escopo / trabalho futuro

O que foi conscientemente adiado, e por quê — para não ser confundido com esquecimento quando alguém perguntar no futuro.