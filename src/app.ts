import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { Pool } from "pg";
import { Client, StdioClientTransport, McpServer, ResourceTemplate, StdioServerTransport } from "@modelcontextprotocol/sdk";
import { z } from "zod";
import fetch from "node-fetch";

// Definição dos tipos para params e config
interface ApiParams {
  address?: string;
  database?: string;
  databaseId?: number;
  password?: string;
  model?: string;
  method?: string;
  fields?: string[];
}

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
    if (error instanceof Error) {
      console.error("Erro ao criar tabelas:", error.message);
    } else {
      console.error("Erro ao criar tabelas:", error);
    }
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

// Configuração do servidor MCP
const mcpServer = new McpServer({
  name: "mcp-server",
  version: "1.0.0",
});

// Função para fazer chamadas à API externa
async function callExternalApi(params: ApiParams, config: ApiParams) {
  const { address, database, databaseId, password, model, method, fields } = params;
  const url = address || config.address;
  if (!url) {
    throw new Error("API address is required but was not provided in params or config");
  }
  const body = {
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "object",
      method: "execute_kw",
      args: [
        database || config.database,
        databaseId || config.databaseId,
        password || config.password,
        model || config.model,
        method || config.method,
        [[]],
        { fields: fields || config.fields || [] },
      ],
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
  };
}

// Registrar ferramentas dinamicamente no servidor MCP
mcpServer.tool(
  "api_call",
  z.object({
    address: z.string().optional(),
    database: z.string().optional(),
    databaseId: z.number().optional(),
    password: z.string().optional(),
    model: z.string().optional(),
    method: z.string().optional(),
    fields: z.array(z.string()).optional(),
  }),
  async (params: ApiParams) => {
    // Configuração padrão (pode ser sobrescrita por uma configuração do banco)
    const config: ApiParams = {
      address: process.env.API_ADDRESS || "https://default-api.com",
      database: process.env.DATABASE_NAME || "default_db",
      databaseId: parseInt(process.env.DATABASE_ID || "1", 10),
      password: process.env.DATABASE_PASSWORD || "default_password",
      model: "default.model",
      method: "read",
      fields: ["name"],
    };

    return callExternalApi(params, config);
  }
);

// Configuração do cliente MCP
const mcpClient = new Client(
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

// Conectar o cliente ao servidor MCP
async function connectClientToServer() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["/app/dist/app.js"],
  });
  await mcpClient.connect(transport);
  console.log("Cliente MCP conectado ao servidor.");
}

// Iniciar o servidor MCP
async function startServer() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.log("Servidor MCP iniciado com sucesso.");
}

// Configuração do Express (Cliente)
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

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
    if (error instanceof Error) {
      res.status(500).json({ error: "Failed to save tool set", details: error.message });
    } else {
      res.status(500).json({ error: "Failed to save tool set", details: String(error) });
    }
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
    if (error instanceof Error) {
      res.status(500).json({ error: "Failed to save prompt", details: error.message });
    } else {
      res.status(500).json({ error: "Failed to save prompt", details: String(error) });
    }
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
    if (error instanceof Error) {
      res.status(500).json({ error: "Failed to save configuration", details: error.message });
    } else {
      res.status(500).json({ error: "Failed to save configuration", details: String(error) });
    }
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
    const result = await mcpClient.callTool({
      name: toolSet[0].function.name,
      arguments: params,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: "Failed to process request", details: error.message });
    } else {
      res.status(500).json({ error: "Failed to process request", details: String(error) });
    }
  }
});

// Iniciar o cliente e o servidor
Promise.all([startServer(), connectClientToServer()]).then(() => {
  app.listen(port, () => {
    console.log(`Aplicação MCP rodando em http://localhost:${port}`);
  });
});