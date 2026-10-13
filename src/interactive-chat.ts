import { Pool } from "pg"
import * as readline from "readline"
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function generateEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-2",
      content: { parts: [{ text }] }
    })
  })

  const data = (await response.json()) as any
  return data.embedding.values
}

async function askGeminiWithContext(
  userQuery: string,
  contextChunks: string[]
): Promise<string> {
  // Usando o modelo atualizado indicado pelo erro da API
const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const combinedContext = contextChunks.join("\n\n---\n\n")
  const prompt = `
    Você é um Desenvolvedor Sênior orientando um desenvolvedor júnior com base estrita nas regras de governança abaixo.
    
    Regras de Governança Recuperadas:
    ${combinedContext}

    Pergunta do Desenvolvedor:
    ${userQuery}

    Instrução: Responda explicando o raciocínio detalhadamente, apontando boas práticas (Clean Code, DDD, etc.) com base nas regras fornecidas. Não dê respostas rasas.
  `

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  })

  const data = (await response.json()) as any

  if (data.error) {
    return `Erro retornado pela API do Gemini: ${JSON.stringify(data.error, null, 2)}`
  }

  const candidate = data.candidates?.[0]
  if (!candidate || !candidate.content?.parts?.[0]?.text) {
    return `Resposta inesperada da API: ${JSON.stringify(data, null, 2)}`
  }

  return candidate.content.parts[0].text
}

function promptUser() {
  rl.question(
    '\n💬 Faça sua pergunta sobre as regras (ou digite "sair"): ',
    async (query) => {
      if (query.toLowerCase() === "sair") {
        rl.close()
        await pool.end()
        console.log("Até logo!")
        return
      }

      try {
        console.log("🔄 Buscando contexto relevante no banco...")
        const queryEmbedding = await generateEmbedding(query)
        const vectorString = `[${queryEmbedding.join(",")}]`

        const dbResult = await pool.query(
          `SELECT content FROM governance_chunks ORDER BY embedding <=> $1::vector LIMIT 2;`,
          [vectorString]
        )

        const contextChunks = dbResult.rows.map((row) => row.content)

        console.log("🤖 Gerando resposta com o Gemini...")
        const answer = await askGeminiWithContext(query, contextChunks)

        console.log(`\n--- Resposta ---\n${answer}\n----------------`)
      } catch (error) {
        console.error("Erro no chat:", error)
      }

      promptUser()
    }
  )
}

console.log("=== Chat Interativo de Governança iniciado ===")
promptUser()
