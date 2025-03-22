import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Endpoint principal para comunicação com Odoo
app.post('/api/odoo', async (req, res) => {
  try {
    // Extrair informações do header
    const odooHost = req.headers['odoo-host'] || 'localhost';
    const odooPort = req.headers['odoo-port'] || '8069';
    const odooProtocol = req.headers['odoo-protocol'] || 'http';
    const dbName = req.headers['odoo-db'] || 'odoo';
    const userId = req.headers['odoo-user-id'] || 2;
    const password = req.headers['odoo-password'] || '';
    
    // Construir URL do Odoo
    const odooUrl = `${odooProtocol}://${odooHost}:${odooPort}/jsonrpc`;
    
    // Extrair outros parâmetros do body
    const { model, method, domain = [[]], fields = [] } = req.body;
    
    if (!model || !method) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: 400,
          message: 'Modelo e método são obrigatórios'
        }
      });
    }
    
    // Construir payload para o Odoo no formato requerido
    const odooPayload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          dbName,
          parseInt(userId),
          password,
          model,
          method,
          domain,
          { fields }
        ]
      }
    };
    
    console.log(`Enviando requisição para ${odooUrl}`);
    console.log('Payload:', JSON.stringify(odooPayload));
    
    // Enviar requisição para o Odoo
    const response = await axios.post(odooUrl, odooPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Retornar resposta do Odoo
    res.json(response.data);
    
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    
    // Formatar erro de acordo com o padrão JSON-RPC
    let errorResponse = {
      jsonrpc: '2.0',
      error: {
        code: 500,
        message: 'Erro ao processar requisição para o Odoo'
      }
    };
    
    // Adicionar detalhes do erro se disponíveis
    if (error.response) {
      errorResponse.error.data = error.response.data;
    } else if (error.message) {
      errorResponse.error.data = { message: error.message };
    }
    
    res.status(500).json(errorResponse);
  }
});

// Endpoint alternativo para seguir exatamente o curl de exemplo
app.post('/api/odoo-raw', async (req, res) => {
  try {
    // Extrair informações do header
    const odooHost = req.headers['odoo-host'] || 'localhost';
    const odooPort = req.headers['odoo-port'] || '8069';
    const odooProtocol = req.headers['odoo-protocol'] || 'http';
    
    // Construir URL do Odoo
    const odooUrl = `${odooProtocol}://${odooHost}:${odooPort}/jsonrpc`;
    
    // Usar o body exatamente como foi recebido
    const payload = req.body;
    
    // Verificar se o payload contém o formato esperado
    if (!payload || !payload.params || !payload.params.args || !Array.isArray(payload.params.args)) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: 400,
          message: 'Formato de payload inválido'
        }
      });
    }
    
    // Substituir o banco, ID do usuário e senha com os valores do header, se fornecidos
    if (req.headers['odoo-db']) {
      payload.params.args[0] = req.headers['odoo-db'];
    }
    
    if (req.headers['odoo-user-id']) {
      payload.params.args[1] = parseInt(req.headers['odoo-user-id']);
    }
    
    if (req.headers['odoo-password']) {
      payload.params.args[2] = req.headers['odoo-password'];
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
    
  } catch (error) {
    console.error('Erro ao processar requisição raw:', error);
    
    // Formatar erro de acordo com o padrão JSON-RPC
    let errorResponse = {
      jsonrpc: '2.0',
      error: {
        code: 500,
        message: 'Erro ao processar requisição para o Odoo'
      }
    };
    
    if (error.response) {
      errorResponse.error.data = error.response.data;
    } else if (error.message) {
      errorResponse.error.data = { message: error.message };
    }
    
    res.status(500).json(errorResponse);
  }
});

// Verificação de saúde
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor MCP-Odoo rodando em http://localhost:${port}`);
});