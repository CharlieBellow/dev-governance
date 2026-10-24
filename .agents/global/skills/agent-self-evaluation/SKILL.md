---
name: agent-self-evaluation
description: Use após concluir qualquer tarefa não trivial. O agente avalia a própria saída em 5 eixos — precisão, completude, clareza, acionabilidade e concisão — com evidência concreta por critério. Produz um scorecard estruturado de 1 a 5 com sugestões específicas de melhoria.
origin: ECC
---

# Autoavaliação do Agente

Depois de concluir uma tarefa complexa, o agente para e avalia a própria saída com uma rubrica estruturada de 5 eixos. Isto NÃO é um portão de aprovado/reprovado — é uma etapa deliberada de reflexão que pega omissões, sinaliza excesso de confiança e revela pontos de melhoria antes que o usuário precise apontá-los.

## Quando Ativar

- Depois de escrever código que abrange 3+ arquivos ou 50+ linhas
- Depois de concluir um fluxo de várias etapas (implementar → testar → revisar)
- Depois de uma sessão de depuração que envolveu 3+ tentativas
- Depois de produzir um documento de design, decisão de arquitetura ou análise escrita
- Quando o usuário perguntar "quão bom foi isso?" ou "se avalie"
- Ao final de qualquer sessão, via hook Stop (se configurado — veja `references/hook-integration.md`)

## Conceitos Fundamentais

### Os 5 Eixos de Avaliação

| Eixo | Pergunta | O que ele pega |
|---|---|---|
| **Precisão** | Os fatos, afirmações e saídas estão corretos? | Alucinações, nomes de API errados, sintaxe incorreta, afirmações falsas |
| **Completude** | Cobriu tudo o que o usuário pediu? | Casos de borda esquecidos, caminhos de erro sem tratamento, requisitos esquecidos, subtarefas puladas |
| **Clareza** | A explicação é compreensível e bem estruturada? | Explicações confusas, jargão sem definição, falta de contexto, divagação |
| **Acionabilidade** | O usuário consegue agir sobre a saída imediatamente? | Sugestões vagas, passos faltando, "você deveria X" sem mostrar como, sem caminho de verificação |
| **Concisão** | Usou o mínimo de palavras/tokens necessário? | Redundância, explicação em excesso, repetir a pergunta do usuário literalmente, enchimento |

### Escala de Pontuação

```
5 — Excepcional: nenhuma melhoria razoável é possível
4 — Bom: apenas detalhes menores, sem lacunas substanciais
3 — Adequado: atende ao pedido, mas tem uma fraqueza notável em pelo menos um eixo
2 — Fraco: tem uma lacuna clara que afeta a usabilidade ou a correção
1 — Ruim: erra fundamentalmente o pedido ou contém erros significativos
```

### A Regra da Evidência

Toda nota abaixo de 5 DEVE citar evidência específica. Uma nota 3 não pode dizer apenas "poderia ser melhor" — ela precisa dizer exatamente o que está faltando ou errado. O mantra: **"Mostre a lacuna, não apenas a nomeie."**

## Fluxo de Trabalho

### Passo 1: Reunir o Material

Junte o que será avaliado:

```
- O pedido original do usuário (releia na conversa)
- Sua resposta/saída final (a entrega)
- Quaisquer saídas de ferramentas que comprovem a correção (resultados de testes, códigos de saída, saída do lint)
- Qualquer feedback do usuário recebido durante a tarefa (correções, "tente de novo", "não é isso")
```

### Passo 2: Pontuar Cada Eixo de Forma Independente

Passe pelos 5 eixos, um de cada vez. Para cada um:

1. Leia a pergunta do eixo
2. Encontre evidência (ou a falta dela) na saída
3. Atribua uma nota de 1 a 5
4. Se a nota for < 5, escreva uma nota de melhoria de uma frase citando a lacuna

NÃO faça primeiro uma média de cabeça para depois justificar de trás para frente. Pontue cada eixo do zero.

### Passo 3: Produzir o Relatório de Avaliação

Use o template de `templates/evaluation-report.md`. O relatório deve incluir:

```
- Resumo de uma linha
- Scorecard dos 5 eixos (nota + evidência por eixo)
- Nota geral (média simples, arredondada para 1 casa decimal)
- 1 a 3 melhorias específicas, ordenadas por impacto
- Autoverificação: "O usuário concordaria com esta avaliação?"
```

### Passo 4: Aplicar a Melhoria

Se algum eixo tiver nota 3 ou menor:

1. Diga o que você faria diferente
2. Se a lacuna puder ser corrigida em < 30 segundos (link faltando, frase confusa), corrija agora
3. Se a lacuna exigir retrabalho, sinalize explicitamente: "Este eixo teve nota [motivo] por causa de [evidência]. Refazer com [correção específica] provavelmente elevaria para [nota]."

## Exemplos

### Exemplo: Boa Avaliação (Nota 4+)

```
Tarefa: Adicionar lógica de retry ao cliente HTTP

Scorecard:
  Precisão:       5 — Todas as chamadas de API corretas. Verificado: os retries
                     usam backoff exponencial. Nenhum método alucinado.
  Completude:     4 — Cobriu o caminho feliz + 3 casos de erro. Faltando:
                     tratamento de timeout para conexões travadas.
  Clareza:        5 — Comentários no código explicam a fórmula do backoff.
                     A descrição da PR aponta o incidente que motivou a mudança.
  Acionabilidade: 5 — Um único merge. Sem tarefas pendentes. Testes passam.
  Concisão:       4 — 47 linhas no total. O loop de retry poderia ser extraído
                     para um helper, eliminando ~8 linhas.

Geral: 4.6 — Uma lacuna (tratamento de timeout). Corrigir antes do merge.
```

### Exemplo: Avaliação Fraca (Nota 2-3)

```
Tarefa: Adicionar lógica de retry ao cliente HTTP

Scorecard:
  Precisão:       2 — Usou urllib3, que não combina com nossa base
                     baseada em httpx. Biblioteca errada.
  Completude:     3 — Funciona para GET. POST/PUT não tratados (o usuário
                     disse "todas as requisições HTTP").
  Clareza:        4 — Código legível. Bons nomes de variáveis.
  Acionabilidade: 2 — "Adicionar testes" foi mencionado, mas nenhum arquivo de
                     teste foi criado. O usuário precisa escrever os testes antes do merge.
  Concisão:       3 — 120 linhas. A configuração de retry está duplicada em
                     3 lugares em vez de um único objeto RetryConfig compartilhado.

Geral: 2.8 — Biblioteca errada. Precisa reescrever com httpx.
  Corrija a precisão primeiro (trocar para httpx), depois estenda para todos
  os métodos HTTP e então consolide a configuração.
```

## Antipadrões

### "Tudo é 5"

```
FALHA: Precisão:   5 — Tudo certo.
       Completude: 5 — Tudo coberto.
       Clareza:    5 — Claro.
```

Nenhuma evidência citada. Isso é autoelogio, não avaliação. Um 5 de verdade exige provar que não há nada a melhorar.

### Penalizar demais por escopo extra

```
FALHA: Completude: 2 — Não tratou conexões WebSocket nem
       streaming gRPC (o usuário não pediu isso)
```

Avalie apenas em relação ao que o usuário realmente pediu, não ao que você poderia ter construído a mais.

### Usar a avaliação para reabrir discussões

```
FALHA: "Como eu disse antes, essa abordagem está errada. Nota: 1"
```

A avaliação é sobre a saída entregue, não sobre rediscutir decisões de design já tomadas. Se a abordagem estava errada, isso deveria ter sido pego antes da entrega.

### Misturar preferência pessoal com lacunas objetivas

```
FALHA: "Nota: 3. Não gosto de decorators em Python."
```

"Não gosto" não é evidência. Cite uma preocupação concreta de legibilidade, testabilidade ou correção, ou mantenha a nota em 4+.

## Boas Práticas

- **Avalie a saída, não o processo.** O usuário se importa com o que você entregou, não com quantas iterações levou.
- **Uma melhoria por eixo fraco.** Não liste 5 coisas para um eixo — escolha a lacuna de maior impacto.
- **Ligue as melhorias ao impacto no usuário.** "A falta de tratamento de erro faz a chamada de API do usuário falhar silenciosamente" é melhor que "adicionar tratamento de erro".
- **Seja específico sobre como fica o 'corrigido'.** "Refazer com o transport do httpx configurado para retries" é melhor que "corrigir o problema da biblioteca".
- **Use as saídas das ferramentas como evidência.** Se os testes passaram, cite-os. Se o lint está limpo, cite. Não chute — procure a prova.
- **Se não encontrar nenhuma lacuna, procure mais.** Nota máxima nos 5 eixos é rara. Pergunte: "Se eu fosse o usuário, o que me incomodaria nesta saída?"

## Skills Relacionadas

- `agent-eval` — Comparação direta entre diferentes agentes de código em tarefas de benchmark
- `verification-loop` — Verificação sistemática das saídas contra os resultados esperados
- `dg-security-review` — Checklist de revisão de código focada em segurança
