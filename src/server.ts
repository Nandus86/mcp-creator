import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { z } from "zod";
import { Pool } from "pg";

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
      CREATE TABLE IF NOT EXISTS server_tools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        schema JSONB NOT NULL,
        handler TEXT NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS server_resources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        template JSONB NOT NULL,
        handler TEXT NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS server_prompts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        schema JSONB NOT NULL,
        handler TEXT NOT NULL
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

// Função para serializar schemas Zod para JSON
function serializeZodSchema(schema: any): any {
  if (!schema) return null;
  return schema._def; // Serializa a definição do schema Zod
}

// Função para desserializar schemas Zod do JSON
function deserializeZodSchema(serializedSchema: any): any {
  if (!serializedSchema) return null;
  // Para simplificar, vamos recriar o schema manualmente com base no nome da ferramenta/recurso/prompt
  return serializedSchema;
}

// Função para carregar e registrar ferramentas do banco
async function loadTools(server: McpServer) {
  const result = await pool.query("SELECT * FROM server_tools");
  for (const row of result.rows) {
    const { name, schema: serializedSchema, handler } = row;
    const schema = deserializeZodSchema(serializedSchema);

    if (handler === "add") {
      server.tool(
        name,
        { a: z.number(), b: z.number() },
        async ({ a, b }) => ({
          content: [{ type: "text", text: String(a + b) }],
        })
      );
    }
    console.log(`Ferramenta ${name} carregada do banco.`);
  }
}

// Função para carregar e registrar recursos do banco
async function loadResources(server: McpServer) {
  const result = await pool.query("SELECT * FROM server_resources");
  for (const row of result.rows) {
    const { name, template: serializedTemplate, handler } = row;
    const template = new ResourceTemplate(
      serializedTemplate.template,
      serializedTemplate.options
    );

    if (handler === "greeting") {
      server.resource(
        name,
        template,
        async (uri, { name }) => ({
          contents: [
            {
              uri: uri.href,
              text: `Hello, ${name}!`,
            },
          ],
        })
      );
    }
    console.log(`Recurso ${name} carregado do banco.`);
  }
}

// Função para carregar e registrar prompts do banco
async function loadPrompts(server: McpServer) {
  const result = await pool.query("SELECT * FROM server_prompts");
  for (const row of result.rows) {
    const { name, schema: serializedSchema, handler } = row;
    const schema = deserializeZodSchema(serializedSchema);
    console.log(`Prompt ${name} carregado do banco.`);
  }
}

// Create an MCP server
const server = new McpServer({
  name: "Demo",
  version: "1.0.0",
});

// Função para inicializar o servidor
async function initializeServer() {
  // Adicionar a ferramenta de soma
  const toolSchema = { a: z.number(), b: z.number() };
  await pool.query(
    `INSERT INTO server_tools (id, name, schema, handler) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (id) DO UPDATE SET name = $2, schema = $3, handler = $4`,
    ["tool_add", "add", serializeZodSchema(toolSchema), "add"]
  );

  // Adicionar o recurso de saudação
  const resourceTemplate = new ResourceTemplate("greeting://{name}", {
    list: undefined,
  });
  await pool.query(
    `INSERT INTO server_resources (id, name, template, handler) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (id) DO UPDATE SET name = $2, template = $3, handler = $4`,
    [
      "resource_greeting",
      "greeting",
      { template: "greeting://{name}", options: { list: undefined } },
      "greeting",
    ]
  );

  // Carregar ferramentas, recursos e prompts do banco
  await loadTools(server);
  await loadResources(server);
  await loadPrompts(server);

  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Servidor MCP iniciado com sucesso.");
}

// Iniciar o servidor
initializeServer().catch((error) => {
  console.error("Erro ao iniciar o servidor:", error);
  process.exit(1);
});