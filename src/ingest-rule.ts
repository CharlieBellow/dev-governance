import { Pool } from "pg"
import * as dotenv from "dotenv"

dotenv.config()

const apiKey = process.env.GEMINI_API_KEY

// Configura a conexão com o seu Postgres local na porta 5435
const pool = new Pool({
  host: "localhost",
  port: 5435,
  database: "dev_governance",
  user: "postgres",
  password: "postgres"
})

async function ingestRule(ruleName: string, ruleContent: string) {
  try {
    console.log(
      `Gerando embedding via Fetch HTTP para a regra: "${ruleName}"...`
    )

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não encontrada no arquivo .env")
    }

    // Usando a API REST oficial e direta do Gemini para embeddings
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "models/application/json"
      },
      body: JSON.stringify({
        model: "gemini-embedding-2",
        content: {
          parts: [{ text: ruleContent }]
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(
        `Erro na API do Google (${response.status}): ${errorData}`
      )
    }

    const data = (await response.json()) as any
    const embedding = data.embedding?.values

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Formato de embedding inválido retornado pela API.")
    }

    console.log(
      `Embedding gerado com sucesso! Tamanho do vetor: ${embedding.length}`
    )

    // 2. Salva no banco de dados PostgreSQL
    const query = `
      INSERT INTO governance_chunks (rule_name, content, embedding)
      VALUES ($1, $2, $3)
      RETURNING id;
    `

    const vectorString = `[${embedding.join(",")}]`

    const result = await pool.query(query, [
      ruleName,
      ruleContent,
      vectorString
    ])
    console.log(`Regra salva no banco com ID: ${result.rows[0].id}`)
  } catch (error) {
    console.error("Erro durante a ingestão da regra:", error)
  } finally {
    await pool.end()
  }
}

const sampleRuleName = "clean-code-single-responsibility.md"
const sampleRuleContent =
  "A função deve fazer apenas uma coisa bem feita. Utilize princípios de clean code e boas práticas de código, aplicando Single Responsibility em nível de método."

ingestRule(sampleRuleName, sampleRuleContent)
