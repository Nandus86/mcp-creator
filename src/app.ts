import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Pool } from 'pg';

// Definição de tipos para evitar erros de TypeScript
interface Tool {
  type: string;
  function?: {
    name: string;
    description: string;
    parameters: any;
  };
  [key: string]: any;
}

interface MCPCompletionParams {
  messages: any[];
  model: string;
  max_tokens?: number;
  temperature?: number;
  tools?: any[];
  tool_choice?: any;
  stop?: string[];
  [key: string]: any;
}

interface MCPClient {
  chat: {
    completions: {
      create: (params: MCPCompletionParams) => Promise<any>;
    };
  };
}

// Implementação simulada ou importação do SDK
let mcpModule;
try {
  mcpModule = require('@modelcontextprotocol/typescript-sdk');
} catch (error) {
  console.warn('Aviso: Não foi possível importar @modelcontextprotocol/typescript-sdk');
  console.warn('Usando implementação simulada para desenvolvimento');

  // Implementação simulada
  mcpModule = {
    MCPClient: class implements MCPClient {
      constructor(config: any) {
        console.log('Inicializando MCPClient simulado com config:', config);
      }

      chat = {
        completions: {
          create: async (params: MCPCompletionParams) => {
            console.log('Simulando chamada MCP com parâmetros:', params);
            return {
              id: 'sim_' + Date.now(),
              object: 'chat.completion',
              created: Date.now(),
              model: params.model,
              choices: [
                {
                  index: 0,
                  message: {
                    role: 'assistant',
                    content: 'Esta é uma resposta simulada do MCP. Em produção, seria substituída pela resposta real da API.',
                  },
                  finish_reason: 'stop',
                },
              ],
            };
          },
        },
      };
    },

    Tool: class implements Tool {
      type: string;
      function?: any;

      constructor(params: any) {
        this.type = params.type || 'function';
        if (params.function) {
          this.function = params.function;
        }
        // Copiar outras propriedades
        Object.keys(params).forEach((key) => {
          if (key !== 'type' && key !== 'function') {
            this[key] = params[key];
          }
        });
      }
    },
  };
}

const { MCPClient, Tool } = mcpModule;

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

// Função para inicializar as tabelas
async function initializeTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tools (
        id TEXT PRIMARY KEY,
        tool_set JSONB NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configurations (
        id TEXT PRIMARY KEY,
        config JSONB NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL
      )
    `);
    console.log('Tabelas verificadas/criadas com sucesso.');
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
    process.exit(1);
  }
}

// Testar a conexão com o banco e inicializar tabelas
pool.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao PostgreSQL:', err);
    process.exit(1);
  }
  console.log('Conectado ao PostgreSQL com sucesso.');
  initializeTables();
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize MCP client
const mcpClient: MCPClient = new MCPClient({
  apiKey: process.env.MCP_API_KEY || '',
  baseUrl: process.env.MCP_BASE_URL || 'https://api.mcp.com',
});

// Endpoints for configurations
app.get('/api/configurations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM configurations');
    const configurations: Record<string, any> = {};
    result.rows.forEach((row) => {
      configurations[row.id] = row.config;
    });
    res.json(configurations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch configurations', details: error.message });
  }
});

app.get('/api/configurations/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT config FROM configurations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    res.json(result.rows[0].config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch configuration', details: error.message });
  }
});

app.post('/api/configurations', async (req, res) => {
  const { id, config } = req.body;
  if (!id || !config) {
    return res.status(400).json({ error: 'ID and configuration are required' });
  }
  try {
    await pool.query(
      'INSERT INTO configurations (id, config) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET config = $2',
      [id, config]
    );
    res.status(201).json({ id, config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save configuration', details: error.message });
  }
});

app.put('/api/configurations/:id', async (req, res) => {
  const { config } = req.body;
  if (!config) {
    return res.status(400).json({ error: 'Configuration is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE configurations SET config = $1 WHERE id = $2 RETURNING *',
      [config, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    res.json({ id: req.params.id, config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update configuration', details: error.message });
  }
});

app.delete('/api/configurations/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM configurations WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete configuration', details: error.message });
  }
});

// Endpoints for tools
app.get('/api/tools', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tools');
    const tools: Record<string, Tool[]> = {};
    result.rows.forEach((row) => {
      tools[row.id] = row.tool_set.map((tool: any) => new Tool(tool));
    });
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tools', details: error.message });
  }
});

app.get('/api/tools/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT tool_set FROM tools WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tool set not found' });
    }
    const toolSet = result.rows[0].tool_set.map((tool: any) => new Tool(tool));
    res.json(toolSet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tool set', details: error.message });
  }
});

app.post('/api/tools', async (req, res) => {
  const { id, toolSet } = req.body;
  if (!id || !toolSet || !Array.isArray(toolSet)) {
    return res.status(400).json({ error: 'ID and array of tools are required' });
  }
  // Serializar o toolSet para JSON puro
  const serializedToolSet = toolSet.map((tool: any) => {
    const toolInstance = tool instanceof Tool ? tool : new Tool(tool);
    return {
      type: toolInstance.type,
      function: toolInstance.function,
      ...Object.fromEntries(
        Object.entries(toolInstance).filter(([key]) => key !== 'type' && key !== 'function')
      ),
    };
  });
  try {
    await pool.query(
      'INSERT INTO tools (id, tool_set) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET tool_set = $2',
      [id, serializedToolSet]
    );
    res.status(201).json({ id, toolSet: serializedToolSet });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save tool set', details: error.message });
  }
});

app.put('/api/tools/:id', async (req, res) => {
  const { toolSet } = req.body;
  if (!toolSet || !Array.isArray(toolSet)) {
    return res.status(400).json({ error: 'Array of tools is required' });
  }
  // Serializar o toolSet para JSON puro
  const serializedToolSet = toolSet.map((tool: any) => {
    const toolInstance = tool instanceof Tool ? tool : new Tool(tool);
    return {
      type: toolInstance.type,
      function: toolInstance.function,
      ...Object.fromEntries(
        Object.entries(toolInstance).filter(([key]) => key !== 'type' && key !== 'function')
      ),
    };
  });
  try {
    const result = await pool.query(
      'UPDATE tools SET tool_set = $1 WHERE id = $2 RETURNING *',
      [serializedToolSet, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tool set not found' });
    }
    res.json({ id: req.params.id, toolSet: serializedToolSet });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tool set', details: error.message });
  }
});

app.delete('/api/tools/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tools WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tool set not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tool set', details: error.message });
  }
});

// Endpoints for prompts
app.get('/api/prompts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prompts');
    const prompts: Record<string, string> = {};
    result.rows.forEach((row) => {
      prompts[row.id] = row.prompt;
    });
    res.json(prompts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prompts', details: error.message });
  }
});

app.get('/api/prompts/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT prompt FROM prompts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.json({ id: req.params.id, prompt: result.rows[0].prompt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prompt', details: error.message });
  }
});

app.post('/api/prompts', async (req, res) => {
  const { id, prompt } = req.body;
  if (!id || !prompt) {
    return res.status(400).json({ error: 'ID and prompt are required' });
  }
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

app.put('/api/prompts/:id', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE prompts SET prompt = $1 WHERE id = $2 RETURNING *',
      [prompt, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.json({ id: req.params.id, prompt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update prompt', details: error.message });
  }
});

app.delete('/api/prompts/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM prompts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete prompt', details: error.message });
  }
});

// MCP endpoint to run prompts with tools
app.post('/api/mcp/run', async (req, res) => {
  try {
    const { configId, promptId, toolIds, messages } = req.body;

    if (!configId || !promptId || !messages) {
      return res.status(400).json({ error: 'Configuration ID, prompt ID, and messages are required' });
    }

    // Carregar dados do banco
    const configResult = await pool.query('SELECT config FROM configurations WHERE id = $1', [configId]);
    const promptResult = await pool.query('SELECT prompt FROM prompts WHERE id = $1', [promptId]);

    if (configResult.rows.length === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    if (promptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const config = configResult.rows[0].config;
    const prompt = promptResult.rows[0].prompt;

    // Collect tools if provided
    let selectedTools: Tool[] = [];
    if (toolIds && Array.isArray(toolIds)) {
      const toolsResult = await pool.query('SELECT tool_set FROM tools WHERE id = ANY($1::text[])', [toolIds]);
      selectedTools = toolsResult.rows.flatMap((row: any) =>
        row.tool_set.map((tool: any) => new Tool(tool))
      );
    }

    // Run MCP client with provided configuration
    const response = await mcpClient.chat.completions.create({
      messages,
      model: config.model || 'gpt-4',
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      tools: selectedTools.length > 0 ? selectedTools : undefined,
      tool_choice: config.tool_choice,
      stop: config.stop,
    });

    res.json(response);
  } catch (error) {
    console.error('MCP Error:', error);
    res.status(500).json({
      error: 'Failed to process MCP request',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(port, () => {
  console.log(`MCP application listening at http://localhost:${port}`);
});