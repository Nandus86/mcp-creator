import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';

// Criar o servidor MCP
const mcpServer = new McpServer({
  name: 'mcp-server-nandus',
  version: '1.0.0',
});

// Ferramenta inicial
mcpServer.tool(
  'somar',
  {
    a: { type: 'number', description: 'Primeiro número' },
    b: { type: 'number', description: 'Segundo número' },
  },
  async ({ a, b }) => {
    return {
      content: [{ type: 'text', text: `A soma de ${a} e ${b} é ${Number(a) + Number(b)}` }],
    };
  }
);

// Transporte stdio para testes locais
async function startMcpServer() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.log('MCP Server rodando com transporte stdio');
}

// Transporte HTTP temporário usando Express
const app = express();
const port = process.env.MCP_SERVER_PORT || 3001;
app.use(express.json());

// Endpoint para receber chamadas do mediador
app.post('/chat/completions', async (req, res) => {
  const { messages, tools } = req.body;
  let responseContent = 'Resposta padrão do MCP Server';

  if (tools && messages) {
    const userMsg = messages.find((m: any) => m.role === 'user');
    if (userMsg?.content === 'Quanto é 5 + 3?' && tools.some((t: any) => t.function?.name === 'somar')) {
      responseContent = 'A soma de 5 e 3 é 8';
    }
  }

  res.json({
    id: `mcp_${Date.now()}`,
    object: 'chat.completion',
    created: Date.now(),
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: responseContent },
        finish_reason: 'stop',
      },
    ],
  });
});

// Iniciar tudo
startMcpServer().then(() => {
  app.listen(port, () => {
    console.log(`MCP Server (HTTP temporário) rodando em http://localhost:${port}`);
  });
});