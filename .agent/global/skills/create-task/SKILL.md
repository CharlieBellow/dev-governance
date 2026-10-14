# Skill: Criar Task Unificada (Spec + Execução)

## Descrição
Gera um novo arquivo unificado de Task + Spec técnica (`.md`) dentro da pasta `.agent/project/project-tasks/` do projeto atual, aplicando o template padrão de engenharia com validações Zod e Clean Architecture.

## **Como usar**
"Use a skill create-task para a task 001-"nome-task" com a issue: 'issue-informada'.

## Instruções Estritas para o Agente (Obrigatório)
Quando esta skill for acionada, o agente DEVE seguir rigorosamente estas regras para garantir economia de tokens:
1. **Restrição de Leitura:** Leia **apenas** o arquivo `.agent/project/PROJECT_MAP.md` e os arquivos estritamente necessários para entender o problema se houver indicação na issue. **NÃO** varra ou leia nenhum outro código-fonte do repositório.
2. **Parâmetros:** Receba o número, o nome da task e a descrição da Issue informados pelo usuário.
3. **Criação Cirúrgica:** Crie o arquivo exatamente em `.agent/project/project-tasks/[numero]-[nome-da-task]-task.md`.
4. **Preenchimento:** Preencha o arquivo utilizando o template padrão unificado abaixo, consultando apenas o necessário para desenhar a solução.
5. **Encerramento:** Não faça mais nada além de gerar e salvar esse arquivo, confirmando ao usuário em seguida.

---

## Template Padrão Unificado (Copiar e Preencher)

# Task + Spec: [NUMERO] - [NOME_DA_FEATURE]

## 🎯 1. Contexto e Problema (Spec)
- **Descrição da Issue:** [Descreva aqui o problema relatado ou funcionalidade solicitada]
- **Módulo Alvo / Camada Afetada:** [Ex: `src/domain/`, `src/application/use-cases/`]

## 🔒 2. Requisitos de Segurança e Zod
- **Validação de Entrada:** Especificar o schema Zod obrigatório para validar o payload de entrada (sem aceitar dados crus) (se aplicável).
- **Prevenção de Vazamento:** Garantir que nenhuma entidade de banco ou dado sensível retorne diretamente na resposta.

## 📋 3. Critérios de Aceite e Regras de Negócio
1. [Regra de negócio 1 pura e isolada de frameworks]
2. [Regra de negócio 2 com tipagem estrita em TypeScript, sem uso de `any`]

## 🛠️ 4. Passos de Execução para a IA (Task)
1. **Passo 1:** Criar/Atualizar os DTOs de validação com Zod.
2. **Passo 2:** Implementar a regra pura no Domínio/Caso de Uso (Clean Architecture).
3. **Passo 3:** Implementar a camada de infraestrutura/controller (se aplicável).
4. **Passo 4:** Criar os testes unitários correspondentes utilizando **Vitest**.
