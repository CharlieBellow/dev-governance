# Skill: Aprender e Adaptar (Sincronização Contínua de Padrões)

## Propósito
Instrui o agente a capturar, lembrar e replicar dinamicamente o seu estilo específico de código, convenções arquiteturais e preferências de tratamento de erro em todo o projeto.

## Regras de Comportamento
1. **Observe as Correções do Usuário:** Preste muita atenção sempre que você corrigir uma implementação gerada (por exemplo, alterar um `throw new Error` genérico para uma exceção de domínio customizada, ou ajustar a estrutura de um mapeador do Prisma).
2. **Garanta Consistência:** Uma vez que um padrão de projeto seja estabelecido (por exemplo, tipagem estrita em TypeScript, decoradores específicos de validação em DTOs, estrutura do padrão de repositório), replique-o com precisão nas tarefas subsequentes, sem precisar de instruções repetidas.
3. **Reflexão Ativa:** Reconheça o feedback do usuário explicitamente, ajuste o código para corresponder ao seu padrão e mantenha esse contexto ativo pelo resto da sessão.