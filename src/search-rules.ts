import { Pool } from "pg"
import * as dotenv from "dotenv"

dotenv.config()

const apiKey = process.env.GEMINI_API_KEY

const pool = new Pool({
  host: "localhost",
  port: 5435,
  database: "dev_governance",
  user: "postgres",
  password: "postgres"
})

// Função para gerar o embedding da pergunta do usuário
async function generateEmbedding(text: string): Promise<number[]> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não encontrada no arquivo .env")
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-2",
      content: { parts: [{ text }] }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erro na API do Google (${response.status}): ${errorText}`)
  }

  const data = (await response.json()) as any
  const embedding = data.embedding?.values

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Formato de embedding inválido retornado pela API.")
  }

  return embedding
}

async function searchRules(queryText: string) {
  try {
    console.log(`\n🔎 Buscando regras para a consulta: "${queryText}"...`)

    // 1. Gera o vetor da pergunta
    const queryEmbedding = await generateEmbedding(queryText)
    const vectorString = `[${queryEmbedding.join(",")}]`

    // 2. Executa a busca por similaridade vetorial no Postgres usando pgvector (<=> operador de distância de cosseno)
    // Quanto menor a distância, mais relevante é o chunk. Pegamos os 2 mais relevantes.
    const query = `
      SELECT id, rule_name, content, (embedding <=> $1::vector) as distance
      FROM governance_chunks
      ORDER BY distance ASC
      LIMIT 2;
    `

    const result = await pool.query(query, [vectorString])

    console.log(
      `\n📊 Resultados mais relevantes encontrados (${result.rows.length}):\n`
    )

    for (const [index, row] of result.rows.entries()) {
      // Calculamos uma pontuação de similaridade aproximada (1 - distância)
      const similarity = (1 - row.distance).toFixed(4)
      console.log(`--------------------------------------------------`)
      console.log(`[${index + 1}] Regra: ${row.rule_name}`)
      console.log(`Pontuação de Similaridade: ${similarity}`)
      console.log(`Conteúdo:\n${row.content.substring(0, 300)}...\n`)
    }
  } catch (error) {
    console.error("Erro durante a busca semântica:", error)
  } finally {
    await pool.end()
  }
}

// Pergunta de exemplo para testar a busca nas suas regras globais
const userQuery =
  process.argv[2] ||
  "Como devem ser feitos os testes unitários e qual biblioteca usar?"

searchRules(userQuery)
