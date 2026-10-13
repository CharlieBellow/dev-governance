# PARA RODAR O PROJETO:

Rodar o comando no terminal para subir o docker:

docker run -d \
  --name local-vector-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=dev_governance \
  -p 5435:5432 \
  pgvector/pgvector:pg16


Assim que rodar o comando, você pode verificar se o container subiu com `docker ps`. Depois, se quiser garantir que a extensão está ativa no banco dev_governance, basta entrar nele e rodar:

SQL: 
CREATE EXTENSION IF NOT EXISTS vector;

## Conexão Visual no DBeaver
Para abrir e visualizar as tabelas e os vetores por aqui, siga estes passos no DBeaver:

Abra o DBeaver e clique no ícone de Nova Conexão (canto superior esquerdo ou Ctrl + N / Cmd + N).

Selecione PostgreSQL e clique em Avançar.

Preencha os dados de acesso:

Host: localhost

Port: 5435 (Atenção: lembre-se de alterar de 5432 para 5435, que foi a porta que mapeamos no comando do Docker).

Database: dev_governance

Username: postgres

Password: postgres

Clique em Test Connection (Testar Conexão). Se for a primeira vez usando essa imagem do Postgres no Docker nesta máquina, o DBeaver pode pedir para baixar os drivers oficiais. Basta aceitar e baixar.

Quando aparecer "Connected", clique em Concluir.


# Rodar comandos SQL:

-- 1. Garante que a extensão vector está ativa no banco
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Cria a tabela para armazenar as regras e os vetores de 3072 dimensões
CREATE TABLE IF NOT EXISTS governance_chunks (
    id SERIAL PRIMARY KEY,
    rule_name TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(3072)
);

-- 3. (Opcional, mas recomendado para performance futura) 
-- Cria um índice HNSW para buscas vetoriais ultrarrápidas baseadas em Distância de Cosseno (vector_cosine_ops)
-- Nota: O índice HNSW é excelente, mas só vale a pena rodar se já houver dados na tabela ou você pode criá-lo depois.
CREATE INDEX IF NOT EXISTS governance_chunks_embedding_idx 
ON governance_chunks 
USING hnsw (embedding vector_cosine_ops);

## Inserir a chave da API Key do Gemini

GEMINI_API_KEY=sua_chave

## Ingetar as regras:

pnpm ts-node src/ingest-global-rules.ts

## Testar as regras:

pnpm ts-node src/search-rules.ts "Quais os padrões de projeto e arquitetura devo seguir no backend?"

## Rodar o chat:

