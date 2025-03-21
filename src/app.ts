import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

// Tente importar o SDK MCP
let MCPClient, Tool;
try {
  const mcpModule = require('@modelcontextprotocol/typescript-sdk');
  MCPClient = mcpModule.MCPClient;
  Tool = mcpModule.Tool;
} catch (error) {
  console.warn('Aviso: Não foi possível importar @modelcontextprotocol/typescript-sdk');
  console.warn('Usando implementação simulada para desenvolvimento');
  
  // Implementação simulada do MCPClient para desenvolvimento
  MCPClient = class MCPClient {
    constructor(config) {
      this.config = config;
      this.chat = {
        completions: {
          create: async (params) => {
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
                    content: 'Esta é uma resposta simulada do MCP. Em produção, seria substituída pela resposta real da API.'
                  },
                  finish_reason: 'stop'
                }
              ]
            };
          }
        }
      };
    }
  };
  
  Tool = class Tool {
    constructor(params) {
      Object.assign(this, params);
    }
  };
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Store configurations, tools and prompts
let configurations: Record<string, any> = {};
let tools: Record<string, any[]> = {};
let prompts: Record<string, string> = {};

// Initialize MCP client
const mcpClient = new MCPClient({
  apiKey: process.env.MCP_API_KEY || '',
  baseUrl: process.env.MCP_BASE_URL || 'https://api.mcp.com'
});

// Endpoints for configurations
app.get('/api/configurations', (req, res) => {
  res.json(configurations);
});

app.get('/api/configurations/:id', (req, res) => {
  const config = configurations[req.params.id];
  if (!config) {
    return res.status(404).json({ error: 'Configuration not found' });
  }
  res.json(config);
});

app.post('/api/configurations', (req, res) => {
  const { id, config } = req.body;
  if (!id || !config) {
    return res.status(400).json({ error: 'ID and configuration are required' });
  }
  configurations[id] = config;
  res.status(201).json({ id, config });
});

app.put('/api/configurations/:id', (req, res) => {
  const { config } = req.body;
  if (!config) {
    return res.status(400).json({ error: 'Configuration is required' });
  }
  configurations[req.params.id] = config;
  res.json({ id: req.params.id, config });
});

app.delete('/api/configurations/:id', (req, res) => {
  if (!configurations[req.params.id]) {
    return res.status(404).json({ error: 'Configuration not found' });
  }
  delete configurations[req.params.id];
  res.status(204).send();
});

// Endpoints for tools
app.get('/api/tools', (req, res) => {
  res.json(tools);
});

app.get('/api/tools/:id', (req, res) => {
  const toolSet = tools[req.params.id];
  if (!toolSet) {
    return res.status(404).json({ error: 'Tool set not found' });
  }
  res.json(toolSet);
});

app.post('/api/tools', (req, res) => {
  const { id, toolSet } = req.body;
  if (!id || !toolSet || !Array.isArray(toolSet)) {
    return res.status(400).json({ error: 'ID and array of tools are required' });
  }
  tools[id] = toolSet;
  res.status(201).json({ id, toolSet });
});

app.put('/api/tools/:id', (req, res) => {
  const { toolSet } = req.body;
  if (!toolSet || !Array.isArray(toolSet)) {
    return res.status(400).json({ error: 'Array of tools is required' });
  }
  tools[req.params.id] = toolSet;
  res.json({ id: req.params.id, toolSet });
});

app.delete('/api/tools/:id', (req, res) => {
  if (!tools[req.params.id]) {
    return res.status(404).json({ error: 'Tool set not found' });
  }
  delete tools[req.params.id];
  res.status(204).send();
});

// Endpoints for prompts
app.get('/api/prompts', (req, res) => {
  res.json(prompts);
});

app.get('/api/prompts/:id', (req, res) => {
  const prompt = prompts[req.params.id];
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  res.json({ id: req.params.id, prompt });
});

app.post('/api/prompts', (req, res) => {
  const { id, prompt } = req.body;
  if (!id || !prompt) {
    return res.status(400).json({ error: 'ID and prompt are required' });
  }
  prompts[id] = prompt;
  res.status(201).json({ id, prompt });
});

app.put('/api/prompts/:id', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  prompts[req.params.id] = prompt;
  res.json({ id: req.params.id, prompt });
});

app.delete('/api/prompts/:id', (req, res) => {
  if (!prompts[req.params.id]) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  delete prompts[req.params.id];
  res.status(204).send();
});

// MCP endpoint to run prompts with tools
app.post('/api/mcp/run', async (req, res) => {
  try {
    const { configId, promptId, toolIds, messages } = req.body;
    
    if (!configId || !promptId || !messages) {
      return res.status(400).json({ error: 'Configuration ID, prompt ID, and messages are required' });
    }
    
    const config = configurations[configId];
    const prompt = prompts[promptId];
    
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    // Collect tools if provided
    let selectedTools: any[] = [];
    if (toolIds && Array.isArray(toolIds)) {
      toolIds.forEach(id => {
        if (tools[id]) {
          selectedTools = [...selectedTools, ...tools[id]];
        }
      });
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
      // Add other configuration options as needed
    });
    
    res.json(response);
  } catch (error) {
    console.error('MCP Error:', error);
    res.status(500).json({ 
      error: 'Failed to process MCP request', 
      details: error instanceof Error ? error.message : String(error) 
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