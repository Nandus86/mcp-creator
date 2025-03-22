import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse";
import { OdooParams, OdooParamsSchema } from "../shared/types";
import { OdooService } from "./odoo-service";

// Criar o servidor Express
const app = express();
app.use(express.json());

// Criar o servidor MCP
const mcpServer = new McpServer({
  name: "Odoo MCP Connector",
  version: "1.0.0"
});

// Criar serviço Odoo
const odooService = new OdooService();

// Definir a ferramenta para consulta Odoo
mcpServer.tool(
  "odoo-search-read",
  OdooParamsSchema,
  async (params: OdooParams) => {
    try {
      console.log("Recebendo requisição para Odoo:", params);
      
      const result = await odooService.executeKw(params);
      
      if (result.error) {
        return {
          content: [{ type: "text", text: JSON.stringify(result.error, null, 2) }],
          isError: true
        };
      }
      
      return {
        content: [{ type: "text", text: JSON.stringify(result.result, null, 2) }]
      };
    } catch (error: any) {
      console.error("Erro ao processar requisição:", error);
      return {
        content: [{ type: "text", text: `Erro: ${error.message}` }],
        isError: true
      };
    }
  }
);

// Armazenar referências de transporte para gerenciamento de conexões
const transports = new Map<string, SSEServerTransport>();

// Endpoint SSE para conexão MCP
app.get("/mcp/sse", async (req, res) => {
  const connectionId = Date.now().toString();
  console.log(`Nova conexão MCP estabelecida: ${connectionId}`);
  
  // Configurar headers para SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Criar transporte SSE
  const transport = new SSEServerTransport("/mcp/messages", res);
  transports.set(connectionId, transport);
  
  // Configurar limpeza quando cliente desconectar
  req.on("close", () => {
    console.log(`Conexão fechada: ${connectionId}`);
    transports.delete(connectionId);
  });
  
  try {
    // Conectar o servidor MCP ao transporte
    await mcpServer.connect(transport);
  } catch (error) {
    console.error("Erro ao conectar servidor MCP:", error);
    res.end();
  }
});

// Endpoint para receber mensagens do cliente MCP
app.post("/mcp/messages", async (req, res) => {
  const connectionId = req.query.connectionId as string;
  const transport = transports.get(connectionId);
  
  if (!transport) {
    return res.status(404).json({ error: "Conexão não encontrada" });
  }
  
  try {
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Erro ao processar mensagem do cliente:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Iniciar o servidor na porta 3001
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor MCP rodando na porta ${PORT}`);
});