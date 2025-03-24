import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { z } from "zod";
import fetch from "node-fetch";

// Create an MCP server
const server = new McpServer({
  name: "mcp-server",
  version: "1.0.0",
});

// Função para fazer chamadas à API externa
async function callExternalApi(params: any, config: any) {
  const { address, database, databaseId, password, model, method, fields } = params;
  const url = address || config.address;
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

// Registrar ferramentas dinamicamente
server.tool(
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
  async (params) => {
    // Configuração padrão (pode ser sobrescrita por uma configuração do banco)
    const config = {
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

// Iniciar o servidor
async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Servidor MCP iniciado com sucesso.");
}

startServer().catch((error) => {
  console.error("Erro ao iniciar o servidor:", error);
  process.exit(1);
});