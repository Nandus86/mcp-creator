import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import { Request, Response } from 'express';
import { z } from 'zod';

// Definir schema Zod para validação da requisição
const OdooRequestSchema = z.object({
  model: z.string(),
  method: z.string(),
  domain: z.array(z.array(z.any())).optional().default([[]]),
  fields: z.array(z.string()).optional().default([])
});

const RawOdooRequestSchema = z.object({
  jsonrpc: z.string(),
  method: z.string(),
  params: z.object({
    service: z.string(),
    method: z.string(),
    args: z.array(z.any())
  })
});

// Interface para parâmetros de requisição formatados
interface OdooRequestParams {
  model: string;
  method: string;
  domain: any[][];
  fields: string[];
}

// Interface para cabeçalhos Odoo
interface OdooHeaders {
  host: string;
  port: string;
  protocol: string;
  db: string;
  userId: number;
  password: string;
}

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Função auxiliar para extrair cabeçalhos Odoo
function getOdooHeaders(req: Request): OdooHeaders {
  return {
    host: req.headers['odoo-host'] as string || 'localhost',
    port: req.headers['odoo-port'] as string || '8069',
    protocol: req.headers['odoo-protocol'] as string || 'http',
    db: req.headers['odoo-db'] as string || 'odoo',
    userId: parseInt(req.headers['odoo-user-id'] as string || '2'),
    password: req.headers['odoo-password'] as string || ''
  };
}

// Endpoint principal para comunicação com Odoo
app.post('/api/odoo', async (req: Request, res: Response) => {
  try {
    // Validar requisição
    const validation = OdooRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: 400,
          message: 'Requisição inválida',
          data: validation.error.format()
        }
      });
    }
    
    const params = validation.data;
    const headers = getOdooHeaders(req);
    
    // Construir URL do Odoo
    const odooUrl = `${headers.protocol}://${headers.host}:${headers.port}/jsonrpc`;
    
    // Construir payload para o Odoo no formato requerido
    const odooPayload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          headers.db,
          headers.userId,
          headers.password,
          params.model,
          params.method,
          params.domain,
          { fields: params.fields }
        ]
      }
    };
    
    console.log(`Enviando requisição para ${odooUrl}`);
    
    // Enviar requisição para o Odoo
    const response = await axios.post(odooUrl, odooPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Retornar resposta do Odoo
    res.json(response.data);
    
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error);
    
    // Formatar erro de acordo com o padrão JSON-RPC
    let errorResponse = {
      jsonrpc: '2.0',
      error: {
        code: 500,
        message: 'Erro ao processar requisição para o Odoo',
        data: error.message ? { message: error.message } : undefined
      }
    };
    
    if (error.response) {
      errorResponse.error.data = error.response.data;
    }
    
    res.status(500).json(errorResponse);
  }
});

// Endpoint alternativo para seguir exatamente o curl de exemplo
app.post('/api/odoo-raw', async (req: Request, res: Response) => {
  try {
    // Validar requisição
    const validation = RawOdooRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: 400,
          message: 'Formato de payload inválido',
          data: validation.error.format()
        }
      });
    }
    
    const headers = getOdooHeaders(req);
    
    // Construir URL do Odoo
    const odooUrl = `${headers.protocol}://${headers.host}:${headers.port}/jsonrpc`;
    
    // Clonar o payload para não modificar o original
    const payload = JSON.parse(JSON.stringify(req.body));
    
    // Substituir o banco, ID do usuário e senha com os valores do header
    if (req.headers['odoo-db']) {
      payload.params.args[0] = headers.db;
    }
    
    if (req.headers['odoo-user-id']) {
      payload.params.args[1] = headers.userId;
    }
    
    if (req.headers['odoo-password']) {
      payload.params.args[2] = headers.password;
    }
    
    console.log(`Enviando requisição raw para ${odooUrl}`);
    
    // Enviar requisição para o Odoo
    const response = await axios.post(odooUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Retornar resposta do Odoo
    res.json(response.data);
    
  } catch (error: any) {
    console.error('Erro ao processar requisição raw:', error);
    
    // Formatar erro de acordo com o padrão JSON-RPC
    let errorResponse = {
      jsonrpc: '2.0',
      error: {
        code: 500,
        message: 'Erro ao processar requisição para o Odoo',
        data: error.message ? { message: error.message } : undefined
      }
    };
    
    if (error.response) {
      errorResponse.error.data = error.response.data;
    }
    
    res.status(500).json(errorResponse);
  }
});

// Verificação de saúde
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor MCP-Odoo rodando em http://localhost:${port}`);
});

export default app;