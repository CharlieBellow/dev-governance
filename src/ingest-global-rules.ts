import { Pool } from "pg"
import * as fs from "fs"
import * as path from "path"
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

// Função simples para fatiar o Markdown por títulos principais ou seções
function parseMarkdownIntoChunks(
  markdownContent: string
): { title: string; content: string }[] {
  const sections = markdownContent.split(/(^#{1,3}\s+.*$)/gm)
  const chunks: { title: string; content: string }[] = []

  let currentTitle = "Introdução / Geral"
  let currentContent = ""

  for (let i = 0; i < sections.length; i++) {
    const part = sections[i]
    if (part.match(/^#{1,3}\s+/)) {
      // Se já temos conteúdo acumulado, salvamos o chunk anterior
      if (currentContent.trim().length > 0) {
        chunks.push({ title: currentTitle, content: currentContent.trim() })
        currentContent = ""
      }
      currentTitle = part.replace(/^#{1,3}\s+/, "").trim()
    } else {
      currentContent += part
    }
  }

  // Adiciona o último bloco restante
  if (currentContent.trim().length > 0) {
    chunks.push({ title: currentTitle, content: currentContent.trim() })
  }

  // Se o arquivo não tiver títulos claros, retorna ele inteiro como um único chunk
  if (chunks.length === 0 && markdownContent.trim().length > 0) {
    chunks.push({ title: "GLOBAL_RULES.md", content: markdownContent.trim() })
  }

  return chunks
}

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

async function runIngestion() {
  try {
    const filePath = path.resolve(
      process.cwd(),
      ".agent/global/GLOBAL_RULES.md"
    )

    if (!fs.existsSync(filePath)) {
      console.error(`Arquivo não encontrado em: ${filePath}`)
      return
    }

    console.log(`Lendo o arquivo de regras em: ${filePath}`)
    const fileContent = fs.readFileSync(filePath, "utf-8")

    const chunks = parseMarkdownIntoChunks(fileContent)
    console.log(
      `Arquivo dividido em ${chunks.length} seções (chunks) para indexação.`
    )

    for (const [index, chunk] of chunks.entries()) {
      console.log(
        `\n[${index + 1}/${chunks.length}] Processando seção: "${chunk.title}"...`
      )

      const embedding = await generateEmbedding(chunk.content)
      console.log(
        `   -> Embedding gerado (${embedding.length} dimensões). Salvando no banco...`
      )

      const query = `
        INSERT INTO governance_chunks (rule_name, content, embedding)
        VALUES ($1, $2, $3)
        RETURNING id;
      `

      const vectorString = `[${embedding.join(",")}]`
      const ruleName = `GLOBAL_RULES.md - ${chunk.title}`

      const result = await pool.query(query, [
        ruleName,
        chunk.content,
        vectorString
      ])
      console.log(`   -> Salvo com sucesso! ID no banco: ${result.rows[0].id}`)
    }

    console.log(
      "\n✨ Ingestão completa de todas as regras globais concluída com sucesso!"
    )
  } catch (error) {
    console.error("Erro durante o processo de ingestão:", error)
  } finally {
    await pool.end()
  }
}

runIngestion()
