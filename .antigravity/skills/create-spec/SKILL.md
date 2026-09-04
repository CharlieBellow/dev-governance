# Skill: Criar Nova Spec

## Descrição
Gera um novo arquivo de especificação técnica (`.md`) dentro da pasta `specs/` do projeto atual, utilizando o template padrão de blueprint de engenharia.

## Como executar (via Script Bash ou instrução para o Agente)
Quando esta skill for acionada, o script deve:
1. Garantir que a pasta `specs/` existe na raiz do projeto.
2. Ler o nome da feature passado como argumento (ex: `001-autenticacao`).
3. Copiar o arquivo `template.md` para `specs/<nome-da-feature>.md`.
4. Substituir a tag `[NOME_DA_FEATURE]` pelo nome informado.

### Script Bash de Atalho (Opcional para o seu terminal)
Adicione esta função no seu `.bashrc` ou `.zshrc` se quiser rodar direto no Linux:

```bash
mkSpec() {
  local feature_name=$1
  if [ -z "$feature_name" ]; then
    echo "Erro: Informe o nome da spec. Ex: mkSpec 001-usuario"
    return 1
  fi
  
  mkdir -p specs
  cp .antigravity/skills/create-spec/template.md "specs/${feature_name}.md"
  echo "Spec criada com sucesso em: specs/${feature_name}.md"
}

```
como usar: > *"Use a skill `create-spec` para mim e crie uma especificação chamada `002-validar-pagamento`"*