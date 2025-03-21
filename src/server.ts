import express from 'express';

const app = express();
const port = process.env.MCP_SERVER_PORT || 3001;
app.use(express.json());

// Middleware para autenticação
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedApiKey = process.env.MCP_API_KEY || '06c453d8-18ca-4e33-b321-81ae2be84ff1';
  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
});

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

// Iniciar o servidor
app.listen(port, () => {
  console.log(`MCP Server (HTTP) rodando em http://localhost:${port}`);
});