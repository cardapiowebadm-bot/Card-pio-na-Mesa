import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn("GEMINI_API_KEY is not defined. AI functions will return error.");
}

// Ensure AI is available
function getAiClient() {
  if (!ai) {
    throw new Error('GEMINI_API_KEY environment variable is not defined.');
  }
  return ai;
}

// AI Endpoints
app.post('/api/gemini/generate-description', async (req, res) => {
  try {
    const { name, category, details } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const client = getAiClient();
    const prompt = `Gere uma descrição profissional, atraente e extremamente apetitosa para um prato de restaurante com os seguintes dados:
Nome: ${name}
Categoria: ${category || 'Não especificada'}
Detalhes/Ingredientes: ${details || 'Nenhum detalhe fornecido'}

A descrição deve ser curta (máximo 3 frases), elegante e convencer o cliente a comprar. Escreva em Português do Brasil.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ result: response.text?.trim() });
  } catch (error: any) {
    console.error("AI Generate Description Error:", error);
    res.status(500).json({ error: error.message || 'Erro ao gerar descrição do prato.' });
  }
});

app.post('/api/gemini/suggest-names', async (req, res) => {
  try {
    const { ingredients, category } = req.body;
    if (!ingredients) {
      return res.status(400).json({ error: 'Ingredients are required' });
    }

    const client = getAiClient();
    const prompt = `Sugira 5 nomes criativos, gourmet e comerciais para pratos baseados nos seguintes ingredientes ou conceito:
Ingredientes/Conceito: ${ingredients}
Categoria: ${category || 'Geral'}

Retorne apenas uma lista simples de 5 itens numerados de 1 a 5, sem outros comentários ou introduções.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ result: response.text?.trim() });
  } catch (error: any) {
    console.error("AI Suggest Names Error:", error);
    res.status(500).json({ error: error.message || 'Erro ao sugerir nomes.' });
  }
});

app.post('/api/gemini/correct-text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const client = getAiClient();
    const prompt = `Corrija a gramática, ortografia e melhore o estilo e elegância do seguinte texto para um cardápio de restaurante de forma profissional:
Texto: "${text}"

Retorne apenas o texto corrigido e polido, sem aspas, explicações, observações ou introduções.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ result: response.text?.trim() });
  } catch (error: any) {
    console.error("AI Correct Text Error:", error);
    res.status(500).json({ error: error.message || 'Erro ao corrigir texto.' });
  }
});

app.post('/api/gemini/translate-menu', async (req, res) => {
  try {
    const { name, description, targetLanguage } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const lang = targetLanguage || 'Inglês';

    const client = getAiClient();
    const prompt = `Traduza o nome e a descrição do prato do cardápio a seguir para o idioma: ${lang}.
Nome Original: ${name}
Descrição Original: ${description || 'Sem descrição'}

Retorne a resposta EXCLUSIVAMENTE em formato JSON com as seguintes chaves:
{
  "name": "nome traduzido",
  "description": "descrição traduzida"
}
Não adicione tags markdown de código (como \`\`\`json), nem introduções ou explicações. Retorne apenas o JSON puro.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    let cleanedText = response.text?.trim() || '{}';
    // Remove markdown codeblock backticks if Gemini includes them
    cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();

    try {
      const parsed = JSON.parse(cleanedText);
      res.json(parsed);
    } catch (parseError) {
      console.error("JSON Parsing Error from Gemini:", cleanedText);
      res.json({ name: `${name} (${lang})`, description: `${description} (${lang})` });
    }
  } catch (error: any) {
    console.error("AI Translate Error:", error);
    res.status(500).json({ error: error.message || 'Erro ao traduzir cardápio.' });
  }
});

app.post('/api/gemini/suggest-promotions', async (req, res) => {
  try {
    const { products } = req.body; // Array of product objects: { name, price, category }
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    const client = getAiClient();
    const productsList = products.map(p => `- ${p.name} (R$ ${p.price}) [${p.category}]`).join('\n');

    const prompt = `Com base nesta lista de produtos disponíveis em meu restaurante:
${productsList}

Sugira 3 ideias de promoções atraentes, combos de vendas casadas (combos de prato + bebida, combos de casal, etc.) ou descontos estratégicos.
Para cada promoção sugira:
1. Um nome atrativo para a promoção
2. Quais produtos compõem o combo
3. O preço sugerido com o desconto estratégico
4. Um breve argumento de venda explicando por que essa promoção é lucrativa e atrativa.

Escreva de forma atraente, profissional e objetiva em Português do Brasil.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ result: response.text?.trim() });
  } catch (error: any) {
    console.error("AI Suggest Promotions Error:", error);
    res.status(500).json({ error: error.message || 'Erro ao sugerir promoções.' });
  }
});

// Setup Vite Dev Server / Static files
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.webmanifest')) {
          res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        } else if (filePath.endsWith('sw.js')) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
