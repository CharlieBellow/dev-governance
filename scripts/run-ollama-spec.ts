import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });
async function testGeminiFreeGeneration() {
  console.log('⚡ Consultando a API gratuita do Gemini (gemini-1.5-flash)...');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ Erro: GEMINI_API_KEY não configurada no arquivo .env');
    return;
  }

  const projectMapPath = path.join(process.cwd(), '.agent/project/PROJECT_MAP.md');
  const projectMap = fs.existsSync(projectMapPath) ? fs.readFileSync(projectMapPath, 'utf8') : '';

  const prompt = `
    Você é um Arquiteto de Software sênior. Com base estritamente no mapa do projeto de governança abaixo, crie uma spec técnica estruturada para uma nova issue: "Implementar uma função de validação de senha segura com regras de complexidade".
    
    Mapa do Projeto:
    ${projectMap}

    Instrução: Retorne apenas o conteúdo em formato Markdown estruturado como uma Spec.
  `;

  try {
    // Usando o endpoint oficial do Gemini Flash (Gratuito na API Key do AI Studio)
    // Altere de gemini-1.5-flash para gemini-2.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    const data = await response.json() as any;
    
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (generatedText) {
      console.log('\n--- RESPOSTA GERADA PELO GEMINI (GRATUITO) ---');
      console.log(generatedText);
      console.log('--------------------------------------------\n');
      
      const outputPath = path.join(process.cwd(), '.agent/project/project-specs/002-validar-senha-task.md');
      fs.writeFileSync(outputPath, generatedText);
      console.log(`✅ Spec gerada instantaneamente em: ${outputPath}`);
    } else {
      console.error('Erro na resposta da API do Gemini:', data);
    }
  } catch (error) {
    console.error('Erro de conexão com a API do Gemini:', error);
  }
}

testGeminiFreeGeneration();