# Spec 001: Criar Nova Tarefa

## 1. Identificação da Tarefa
- **Nome da Feature:** Criar Tarefa (Create Task)
- **Camada Afetada:** Domínio e Caso de Uso

## 2. Contexto e Objetivo
- **O que precisa ser feito:** Permitir que um usuário crie uma nova tarefa informando um título obrigatório.
- **Regra de Negócio Central:** 
  - O título da tarefa não pode estar vazio nem conter apenas espaços em branco.
  - Toda tarefa nasce com o status de pendente (`isCompleted: false`).

## 3. Contrato Técnico (Entradas e Saídas)
- **Dados de Entrada:** 
  - `title` (string, obrigatório)
- **Dados de Saída:**
  - Retorna o objeto da tarefa criado com ID único, `title` e `isCompleted`.
- **Exceções Esperadas:**
  - Lançar erro de domínio se o título for inválido (ex: `InvalidTaskTitleException`).

## 4. Testes Obrigatórios
- [ ] Teste unitário garantindo que a tarefa é criada com sucesso com dados válidos.
- [ ] Teste unitário garantindo que um erro é lançado se o título for vazio.