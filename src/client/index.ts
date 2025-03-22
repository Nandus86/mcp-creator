import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { HttpClientTransport } from "@modelcontextprotocol/sdk/client/http.js";
import { OdooParams } from "../shared/types.js";
import readline from "readline";

// Interface para entrada de linha de comando
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para perguntar de forma assíncrona
const pergunta = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
};

async function main() {
  console.log("Cliente MCP para Odoo - Configuração");
  
  // URL do servidor MCP
  const serverUrl = await pergunta("URL do servidor MCP (padrão: http://localhost:3001): ") || "http://localhost:3001";
  
  // Informações do Odoo
  const enderecoOdoo = await pergunta("URL da API Odoo: ");
  const database = await pergunta("Nome do banco de dados Odoo: ");
  const userId = parseInt(await pergunta("ID do usuário Odoo: "), 10);
  const password = await pergunta("Senha do usuário Odoo: ");
  const model = await pergunta("Modelo Odoo a consultar: ");
  const method = await pergunta("Método a usar (padrão: search_read): ") || "search_read";
  
  // Campos
  const camposStr = await pergunta("Campos a retornar (separados por vírgula): ");
  const fields = camposStr.split(",").map(field => field.trim());
  
  // Configurar cliente MCP
  const transport = new HttpClientTransport({
    serverUrl: serverUrl,
    sseEndpoint: "/mcp/sse",
    postEndpoint: "/mcp/messages"
  });
  
  const client = new Client(
    {
      name: "Odoo MCP Client",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );
  
  try {
    console.log("Conectando ao servidor MCP...");
    await client.connect(transport);
    console.log("Conexão estabelecida!");
    
    // Parâmetros para chamada do Odoo
    const params: OdooParams = {
      enderecoOdoo,
      database,
      userId,
      password,
      model,
      method,
      fields
    };
    
    console.log("Enviando requisição para o Odoo via MCP...");
    
    // Chamar a ferramenta do servidor MCP
    const resultado = await client.callTool({
      name: "odoo-search-read",
      arguments: params
    });
    
    // Processar e exibir resultado
    const textoResultado = resultado.content.find(item => item.type === "text")?.text;
    
    if (resultado.isError) {
      console.error("Erro na requisição Odoo:");
      console.error(textoResultado);
    } else {
      console.log("Resultado da consulta Odoo:");
      console.log(textoResultado);
    }
    
  } catch (error: any) {
    console.error("Erro na execução do cliente MCP:", error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main();