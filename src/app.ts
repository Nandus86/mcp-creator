import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { MCPClient, Tool } from '@modelcontextprotocol/typescript-sdk';
import { Pool } from 'pg';

const app = express();
const port = process.env.PORT || 3000;

// Configuração do cliente PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'mcpuser',
  password: process.env.POSTGRES_PASSWORD || 'mcp123',
  database: process.env.POSTGRES_DB || 'mcpdb',
});

// Testar a conexão com o banco
pool.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao PostgreSQL:', err);
    process.exit(1);
  }
  console.log('Conectado ao PostgreSQL com sucesso.');
});

app.use(cors());
app.use(bodyParser.json());

const mcpClient = new MCPClient({
  apiKey: process.env.MCP_API_KEY || 'sua-chave-aqui',
  baseUrl: process.env.MCP_BASE_URL || 'http://localhost:3001',
});

// Endpoint para adicionar ferramentas
app.post('/api/tools', async (req, res) => {
  const { id, toolSet } = req.body;
  if (!id || !Array.isArray(toolSet)) return res.status(400).json({ error: 'ID and toolSet required' });

  try {
    await pool.query(
      'INSERT INTO tools (id, tool_set) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET tool_set = $2',
      [id, JSON.stringify(toolSet)]
    );
    res.status(201).json({ id, toolSet });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save tool', details: error.message });
  }
});

// Endpoint para adicionar configurações
app.post('/api/configurations', async (req, res) => {
  const { id, config } = req.body;
  if (!id || !config) return res.status(400).json({ error: 'ID and config required' });

  try {
    await pool.query(
      'INSERT INTO configurations (id, config) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET config = $2',
      [id, JSON.stringify(config)]
    );
    res.status(201).json({ id, config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save configuration', details: error.message });
  }
});

// Endpoint para adicionar prompts
app.post('/api/prompts', async (req, res) => {
  const { id, prompt } = req.body;
  if (!id || !prompt) return res.status(400).json({ error: 'ID and prompt required' });

  try {
    await pool.query(
      'INSERT INTO prompts (id, prompt) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET prompt = $2',
      [id, prompt]
    );
    res.status(201).json({ id, prompt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save prompt', details: error.message });
  }
});

// Endpoint para executar o MCP
app.post('/api/mcp/run', async (req, res) => {
  const { configId, promptId, toolIds, messages } = req.body;
  if (!configId || !promptId || !toolIds || !messages) {
    return res.status(400).json({ error: 'configId, promptId, toolIds, and messages are required' });
  }

  try {
    // Carregar dados do banco
    const configResult = await pool.query('SELECT config FROM configurations WHERE id = $1', [configId]);
    const promptResult = await pool.query('SELECT prompt FROM prompts WHERE id = $1', [promptId]);
    const toolsResult = await pool.query('SELECT tool_set FROM tools WHERE id = ANY($1::text[])', [toolIds]);

    const config = configResult.rows[0]?.config;
    const prompt = promptResult.rows[0]?.prompt;
    const selectedTools = toolsResult.rows.flatMap((row: any) =>
      row.tool_set.map((tool: any) => new Tool(tool))
    );

    if (!config || !prompt || selectedTools.length !== toolIds.length) {
      return res.status(404).json({ error: 'Configuration, prompt, or tools not found' });
    }

    const response = await mcpClient.chatCompletions({
      config,
      prompt,
      tools: selectedTools,
      messages,
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process request', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`MCP application listening at http://localhost:${port}`);
});