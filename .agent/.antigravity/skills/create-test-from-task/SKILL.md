# Skill: Create Test From Task

## 🎯 Objetivo
Gerar arquivos de teste automatizados (unitários, de componente ou de integração leve) baseados estritamente na task fornecida, aplicando as melhores práticas de engenharia de software, Clean Architecture, DDD e as regras do harness do projeto.

---

## 🛠️ Regras e Princípios Obrigatórios

1. **Ordem de Ação:**
   - **Caracterização antes de correção:** Se for código legado, documente primeiro o comportamento atual nos testes.
   - **TDD:** Escreva o teste esperando o comportamento correto, valide a falha (se aplicável), e então implemente.
   - **Rastreio de Uso Real:** Sempre verifique o uso real da função/componente no código (`grep`) antes de escrever os mocks.

2. **As 4 Perguntas + 1 (Obrigatório para cobrir em todo `describe`/`it`):**
   1. **Caminho feliz:** O uso normal e óbvio.
   2. **Fronteiras:** Menor, maior, zero, limites permitidos.
   3. **Entradas malformadas:** String vazia, formato errado, tipo incorreto.
   4. **Relações (Round-trip):** Propriedades inversas ou invariantes que sempre devem valer.
   5. **"Que entrada esquisita quebraria isso?":** O teste de estresse de borda final.

3. **Definição de Camadas (Escolha a ferramenta certa):**
   - **Unitário (Vitest):** Funções puras, formatadores, validadores, schemas isolados.
   - **Componente (Vitest + RTL):** Formulários, exibição de erros na tela, submissão com payloads transformados.
   - **Hook / Integração leve (Vitest + RTL + Mock):** Tratamento de códigos de erro HTTP (400, 401, 403, 500) e mensagens.

---

## 📋 Template de Saída do Teste

O arquivo gerado deve seguir rigorosamente a estrutura abaixo (exemplo para Vitest):

```typescript
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
// Imports do componente ou função a ser testada

// 1. Mocks limpos e isolados (usando vi.hoisted / vi.mock)
// ...

describe("[NomeDoModulo / Componente / Funcao]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("1. Caminho Feliz", () => {
    it("deve executar o comportamento padrão com sucesso", () => {
      // Arrange, Act, Assert
    })
  })

  describe("2. Fronteiras e Entradas Malformadas (Sad Paths)", () => {
    it("deve rejeitar entradas vazias ou com formato inválido", () => {
      // ...
    })
  })

  describe("3. Comportamentos Específicos da Task", () => {
    it("deve cobrir o requisito existo descrito na spec/task", () => {
      // ...
    })
  })
})

<!-- *"Usando a skill `create-test-from-task` e o `PROJECT_MAP.md`, crie o arquivo de testes unitários para a task `003-Error-update-service-task.md` no módulo de serviços, aplicando rigorosamente as 4 perguntas + 1 e garantindo os cenários de caminho feliz e fronteiras." -->
```