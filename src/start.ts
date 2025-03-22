import { spawn } from 'child_process';
import './odoo-server';

// Iniciar o mediador (app.ts)
const mediator = spawn('node', ['dist/app.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '3000' },
});
mediator.on('error', (err) => console.error('Erro no mediador:', err));

// Iniciar o servidor MCP (server.ts)
const mcpServer = spawn('node', ['dist/server.js'], {
  stdio: 'inherit',
  env: { ...process.env, MCP_SERVER_PORT: '3001' },
});
mcpServer.on('error', (err) => console.error('Erro no MCP Server:', err));