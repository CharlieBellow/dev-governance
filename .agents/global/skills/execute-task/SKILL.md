---
name: execute-task
description: "Executa uma task de .agents/project/tasks/ de forma isolada, lendo só o PROJECT_MAP.md, a task e os RFC/design que ela referencia, com Clean Architecture, DDD, validação Zod, testes Vitest obrigatórios e relatório de entrega. Use quando o usuário pedir para executar/implementar uma task pelo nome ou número."
---

# Skill: Executar Task Unificada

## Descrição
Instrui o agente Sênior a executar uma Task/Spec específica de forma isolada, garantindo o uso de Clean Architecture, Domain-Driven Design, validações com Zod e cobertura obrigatória de testes com Vitest.

## Como Acionar
Use o comando: `Execute a task [NNN]-[nome-da-task]-ISS[issue].md` (ou só pelo número: `Execute a task 001`)

## ⚙️ Diretrizes Obrigatórias de Execução para o Agente
Quando esta skill for acionada, você (agente) DEVE seguir estritamente o protocolo abaixo:

1. **Leitura Cirúrgica (Economia de Tokens):** 
   - Leia APENAS o arquivo `.agents/project/PROJECT_MAP.md`, o arquivo da Task em `.agents/project/tasks/[NNN]-[nome-da-task]-ISS[issue].md` e **somente** os RFC/design/spec que a task referencia.
   - NUNCA varra o repositório inteiro.
1.1. **Portão de Governança:**
   - Se `Bloqueado por` cita uma task não concluída ou um RFC que não está `Aceito`, **pare** e informe o bloqueio — não implemente.
   - Implemente o contrato **exatamente** como está no design referenciado. Se a implementação exigir desviar dele, pare e proponha alteração do design/RFC (skill `rfc-workflow`).
2. **Postura Pedagógica (Sênior para Júnior):**
   - Explique o raciocínio técnico passo a passo antes de escrever o código.
   - Detalhe os padrões de projeto aplicados (ex: Repository Pattern, Value Objects) e os potenciais erros evitados.
3. **Segurança e Validação (Zod):**
   - Certifique-se de que todas as entradas de dados passem por validações estritas usando **Zod** nos DTOs.
   - Garanta o isolamento total do Domínio (sem frameworks ou ORMs nas regras de negócio puras).
4. **Definition of Done (Testes Obrigatórios com Vitest):**
   - Escreva e valide os testes unitários correspondentes utilizando **Vitest** antes de encerrar.
5. **Relatório de Entrega:**
   - Ao finalizar, entregue um relatório estruturado contendo:
     - O que foi feito e os padrões seguidos.
     - A lista exata de arquivos modificados ou criados.
     - A confirmação de que os testes passaram no Vitest.