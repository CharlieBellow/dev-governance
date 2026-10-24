# Documentação Técnica do Backend

> Este diretório contém o histórico de decisões técnicas do backend deste projeto. Se você é uma IA lendo este repositório para ajudar em alguma tarefa: **consulte esta pasta antes de sugerir mudanças de padrão, endpoint, ou arquitetura.** As decisões aqui documentadas têm precedência sobre suposições genéricas de "boas práticas", porque refletem escolhas já feitas e justificadas neste projeto específico.

## Estrutura

```
docs/
  rfcs/       → decisões de arquitetura e padrão (o "porquê" técnico de como o backend é estruturado)
  designs/    → contrato de features com consumidor externo (o "o quê" de uma funcionalidade específica)
```

## Como usar esta pasta

### Se você é uma pessoa entrando no projeto

1. Leia os RFCs em ordem numérica em `rfcs/` — eles contam a evolução das decisões de arquitetura do backend.
2. Antes de propor uma mudança de padrão (nova convenção de endpoint, nova forma de estruturar módulo, etc.), verifique se já existe um RFC cobrindo isso. Se sim, siga o padrão documentado. Se discordar, abra um novo RFC referenciando o antigo — não implemente por fora do padrão sem registrar o motivo.
3. Antes de implementar algo que consome uma API do backend (ex.: frontend), verifique `designs/` para o contrato mais atualizado.

### Se você é uma IA sendo usada para desenvolver ou revisar código deste projeto

**Regra central: documentação vem antes do código, não depois.** Quando a tarefa solicitada envolver decisão de padrão (novo endpoint, nova convenção, nova estrutura de módulo) ou contrato externo (API consumida pelo front ou por outro serviço), gere o rascunho de RFC e/ou design doc **antes** de escrever o código de implementação, não como registro posterior do que já foi feito. Documentação escrita depois do código tende a virar relatório, não decisão registrada — e perde o propósito de permitir revisão antes da mudança entrar em vigor.

1. **Antes de implementar, classifique a tarefa:**

   - Envolve decisão de padrão/arquitetura nova, ou muda algo que outros módulos deveriam seguir, **sem afetar contrato externo nem exigir infraestrutura nova**? → gere rascunho usando `rfcs/0000-TEMPLATE-LEVE.md`.
   - Envolve decisão de padrão/arquitetura nova **e** afeta consumo do front, quebra contrato existente, ou exige infraestrutura? → gere rascunho usando `rfcs/0000-TEMPLATE.md` (completo).
   - Tem contrato externo (rota consumida por front/serviço externo)? → gere rascunho de design doc primeiro (ou junto do RFC, se ambos se aplicarem).
   - É implementação direta, sem decisão de padrão nem contrato externo? → pode implementar sem gerar documento novo.
     Quando em dúvida entre RFC leve e completo, prefira o completo — é mais fácil enxugar na revisão do que descobrir depois que faltou notificar alguém.

2. **Verifique primeiro se já existe um RFC relevante em `rfcs/`** que define o padrão a seguir (ex.: separação de endpoints para relações N:N, estrutura de camadas DDD, convenção de nomenclatura de arquivos) antes de propor algo novo.

3. **Ao sugerir uma abordagem alternativa à documentada, sinalize explicitamente que está divergindo de um RFC existente** e cite qual, em vez de simplesmente implementar diferente sem menção.

4. **Preencha o RFC/design doc com base no código real do projeto** (arquivo, caminho, trecho relevante), nunca com generalidades do tipo "seguindo boas práticas de mercado". Cite precedente existente no projeto sempre que houver.

5. **Não decida sozinha a categoria de impacto nem a janela de aviso do RFC** (ver `guia-fluxo-documentacao-backend.md`) — proponha a classificação que parecer mais adequada, mas deixe explícito que é uma sugestão a ser confirmada por quem for revisar, já que isso depende de contexto de equipe que você não tem visibilidade completa.

6. **Preencha a seção "Riscos e perguntas em aberto" com incerteza genuína, não com uma objeção já respondida.** O objetivo não é blindar a decisão contra discordância — é registrar honestamente o que ainda não está resolvido, mesmo que ninguém tenha questionado ainda.

7. **Não substitua silenciosamente uma decisão já registrada por "prática comum de mercado"** — o objetivo desta pasta é evitar decisões implícitas ou reinterpretadas a cada nova sessão de trabalho. Se você avaliar que a prática de mercado é genuinamente melhor que o padrão documentado (ex.: o padrão registrado tem um problema técnico real, ou surgiu antes de existir RFC e nunca foi formalmente avaliado), **não implemente a alternativa por conta própria**: sinalize a divergência explicitamente, proponha um novo RFC referenciando o antigo, e explique tecnicamente por que a prática de mercado seria superior no contexto deste projeto — deixando a decisão final para quem revisar. A regra não é "o documentado está sempre certo", é "divergência nunca é silenciosa".

8. **Todo RFC/design doc gerado é rascunho até revisão humana.** Marque o campo `Status` do template como "Proposto" (RFC) ou "Em design" (design doc) até que a pessoa responsável confirme e ajuste. Não abra Pull Request nem marque pessoas específicas em nome de quem está pedindo a implementação — isso é decisão de quem revisa, não automática.

## Como abrir um novo documento

- **RFC leve** (decisão interna, sem impacto externo nem infraestrutura nova): copie `rfcs/0000-TEMPLATE-LEVE.md`, renomeie para o próximo número disponível, preencha e abra como Pull Request.
- **RFC completo** (decisão que afeta consumo do front, quebra contrato existente, ou exige infraestrutura): copie `rfcs/0000-TEMPLATE.md`, renomeie, preencha e abra como Pull Request.
- **Design doc** (contrato de feature com consumidor externo): copie `designs/0000-TEMPLATE.md`, renomeie, preencha e referencie o(s) RFC(s) relacionado(s).

## Regra prática para decidir o que documentar

Ver "Teste de sanidade" em [guia-fluxo-documentacao-backend.md](guia-fluxo-documentacao-backend.md#teste-de-sanidade-para-decidir-se-documenta-mesmo-sem-impacto-externo).

## Índice de RFCs

| RFC                                                                       | Título                                                                            | Status              |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------- |
| [0000](rfcs/0000-TEMPLATE.md)                                             | Template completo                                                                 | —                   |
| [0000](rfcs/0000-TEMPLATE-LEVE.md)                                        | Template leve (decisão interna)                                                   | —                   |
| [0001](rfcs/0001-endpoints-dedicados-pessoas-autorizadas-sala.md)         | Endpoints dedicados para gerenciar pessoas autorizadas de uma sala                | Implementado |
| [0002](rfcs/0002-unificacao-autorizacao-casl.md)                          | Unificação do padrão de autorização em CASL                                       | Implementado |
| [0003](rfcs/0003-camada-erro-app-error.md)                                | Camada de erro de domínio (`AppError`) desacoplada do HTTP                        | Aceito              |
| [0004](rfcs/0004-reconciliacao-master-dev-e-promocao-a-main.md)           | Reconciliação `master`↔`dev` e promoção de `dev` a `main`                        | Implementado |
| [0005](rfcs/0005-endpoints-dedicados-coordenador-responsavel-subgrupo.md) | Endpoints dedicados para gerenciar coordenadores/responsáveis de subgrupo         | Implementado |
| [0008](rfcs/0008-correcao-grafia-occurrence-humanresources.md)            | Correção de grafia "ocurrence" → "occurrence" em HumanResources                   | Implementado |
| [0006](rfcs/0006-pipeline-ci-github-actions.md)                           | Pipeline de CI (build, lint, testes) via GitHub Actions                           | Implementado |
| [0007](rfcs/0007-tratamento-de-erro-e-lifecycle-do-provider-glpi.md)      | Tratamento de erro e lifecycle de sessão do provider GLPI                         | Implementado |
| [0009](rfcs/0009-rota-person-com-personlinks-fluxo-personlink.md)         | Rota dedicada para retornar Person com personLinks no fluxo de CRUD de PersonLink | Implementado |
| [0010](rfcs/0010-rota-adicionar-responsavel-subgrupo-por-email.md)        | Rota dedicada para adicionar responsible de subgrupo por email                    | Implementado |
| [0011](rfcs/0011-aprovadores-de-sala-substitui-authorized-persons.md)     | Pessoas da sala passam a ser aprovadores de agendamento (`authorizedPersons` → `approvers`) | Implementado |
| [0012](rfcs/0012-perfil-do-usuario-via-users-profile.md)                  | Perfil do próprio usuário via `/users/profile` (leitura e edição)                 | Implementado |
| [0013](rfcs/0013-leitura-de-usuarios-restrita-a-admin.md)                 | Leitura de usuários (`GET /users*`) restrita a ADMIN                              | Implementado |
| [0014](rfcs/0014-provider-de-email-smtp-e-fila-de-envio.md)              | Provider de email via SMTP (Gmail) com fila BullMQ/Redis, avisos e grupos de email | Aceito |
| [0015](rfcs/0015-ordenacao-padrao-listagens-ordens-de-servico.md)         | Ordenação padrão e determinística nas listagens de ordens de serviço              | Implementado |

## Índice de Design Docs

| Design                                                                | Feature                                                         | Status    |
| --------------------------------------------------------------------- | --------------------------------------------------------------- | --------- |
| [0001](designs/0001-endpoints-coordenador-responsavel-subgrupo.md)    | Endpoints dedicados de coordenador/responsável de subgrupo      | Aceito     |
| [0002](designs/0002-correcao-grafia-occurrence-humanresources.md)     | Correção de grafia "ocurrence" → "occurrence" em HumanResources | Aceito     |
| [0003](designs/0003-rota-person-com-personlinks-fluxo-personlink.md)  | Rota Person com personLinks para o fluxo de CRUD de PersonLink  | Aceito     |
| [0004](designs/0004-rota-adicionar-responsavel-subgrupo-por-email.md) | Rota de adicionar responsible de subgrupo por email             | Aceito     |
| [0005](designs/0005-avisos-por-email.md)                              | Avisos por email e grupos de email (estáticos e dinâmicos)      | Aceito     |
| [0000](designs/0000-TEMPLATE.md)                                      | Template                                                        | —         |

## Guia de fluxo completo

Para o processo passo a passo (quando abrir RFC vs. design doc, janelas de aviso por tipo de impacto, etc.), veja `guia-fluxo-documentacao-backend.md` na raiz da documentação do projeto.
