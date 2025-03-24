import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { Pool } from "pg";
import { Client } from "@modelcontextprotocol/sdk/client/index";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio";

// Configuração do cliente PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  user: process.env.POSTGRES_USER || "mcpuser",
  password: process.env.POSTGRES_PASSWORD || "mcp123",
  database: process.env.POSTGRES_DB || "mcpdb",
});

// Função para inicializar as tabelas
async function initializeTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tools (
        id TEXT PRIMARY KEY,
        tool_set JSONB NOT NULL,
        client_id TEXT NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        schema JSONB NOT NULL,
        handler TEXT NOT NULL,
        client_id TEXT NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configurations (
        id TEXT PRIMARY KEY,
        config JSONB NOT NULL,
        client_id TEXT NOT NULL
      )
    `);
    console.log("Tabelas verificadas/criadas com sucesso.");
  } catch (error) {
    console.error("Erro ao criar tabelas:", error);
    process.exit(1);
  }
}

// Testar a conexão com o banco e inicializar tabelas
pool.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao PostgreSQL:", err);
    process.exit(1);
  }
  console.log("Conectado ao PostgreSQL com sucesso.");
  initializeTables();
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configuração do cliente MCP
const client = new Client(
  {
    name: "mcp-client",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
    },
  }
);

// Conectar ao servidor MCP
async function connectToServer() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["/app/mcp-server/dist/server.js"],
  });
  await client.connect(transport);
  console.log("Cliente MCP conectado ao servidor.");
}

// Endpoints para ferramentas
app.post("/api/tools", async (req, res) => {
  const { id, toolSet, clientId } = req.body;
  if (!id || !toolSet || !Array.isArray(toolSet) || !clientId) {
    return res.status(400).json({ error: "ID, array of tools, and clientId are required" });
  }
  const serializedToolSet = JSON.stringify(toolSet);
  try {
    await pool.query(
      "INSERT INTO tools (id, tool_set, client_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET tool_set = $2, client_id = $3",
      [id, serializedToolSet, clientId]
    );
    res.status(201).json({ id, toolSet });
  } catch (error) {
    res.status(500).json({ error: "Failed to save tool set", details: error.message });
  }
});

// Endpoints para prompts
app.post("/api/prompts", async (req, res) => {
  const { id, name, schema, handler, clientId } = req.body;
  if (!id || !name || !schema || !handler || !clientId) {
    return res.status(400).json({ error: "ID, name, schema, handler, and clientId are required" });
  }
  try {
    await pool.query(
      "INSERT INTO prompts (id, name, schema, handler, client_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name = $2, schema = $3, handler = $4, client_id = $5",
      [id, name, JSON.stringify(schema), handler, clientId]
    );
    res.status(201).json({ id, name, schema, handler });
  } catch (error) {
    res.status(500).json({ error: "Failed to save prompt", details: error.message });
  }
});

// Endpoint para configurações
app.post("/api/configurations", async (req, res) => {
  const { id, config, clientId } = req.body;
  if (!id || !config || !clientId) {
    return res.status(400).json({ error: "ID, config, and clientId are required" });
  }
  try {
    await pool.query(
      "INSERT INTO configurations (id, config, client_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET config = $2, client_id = $3",
      [id, JSON.stringify(config), clientId]
    );
    res.status(201).json({ id, config });
  } catch (error) {
    res.status(500).json({ error: "Failed to save configuration", details: error.message });
  }
});

// Endpoint para processar requisições da IA
app.post("/api/process", async (req, res) => {
  const { toolId, params, clientId } = req.body;
  if (!toolId || !params || !clientId) {
    return res.status(400).json({ error: "toolId, params, and clientId are required" });
  }

  try {
    // Buscar a ferramenta no banco
    const toolResult = await pool.query(
      "SELECT tool_set FROM tools WHERE id = $1 AND client_id = $2",
      [toolId, clientId]
    );
    if (toolResult.rows.length === 0) {
      return res.status(404).json({ error: "Tool not found" });
    }
    const toolSet = toolResult.rows[0].tool_set;

    // Buscar a configuração no banco
    const configResult = await pool.query(
      "SELECT config FROM configurations WHERE client_id = $1",
      [clientId]
    );
    if (configResult.rows.length === 0) {
      return res.status(404).json({ error: "Configuration not found" });
    }
    const config = configResult.rows[0].config;

    // Enviar a requisição ao servidor MCP
    const result = await client.callTool({
      name: toolSet[0].function.name,
      arguments: params,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to process request", details: error.message });
  }
});

// Iniciar o cliente
connectToServer().then(() => {
  app.listen(port, () => {
    console.log(`Cliente MCP rodando em http://localhost:${port}`);
  });
});