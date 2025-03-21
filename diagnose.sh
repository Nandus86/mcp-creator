#!/bin/sh
# Script de diagnóstico para a aplicação MCP Creator

echo "=== Diagnóstico do MCP Creator ==="

echo "\n=> Verificando estrutura de diretórios"
ls -la

echo "\n=> Verificando node_modules"
ls -la node_modules || echo "node_modules não encontrado"

echo "\n=> Verificando módulo MCP"
ls -la node_modules/@modelcontextprotocol || echo "Módulo MCP não encontrado na pasta padrão"
find node_modules -name "typescript-sdk" || echo "Módulo typescript-sdk não encontrado"

echo "\n=> Verificando arquivos de compilação"
ls -la dist || echo "Diretório dist não encontrado"

echo "\n=> Executando ambiente node"
node -v
npm -v

echo "\n=> Verificando caminho de execução do node"
which node
which npm

echo "\n=> Tentando resolver módulo MCP"
node -e "try { require('@modelcontextprotocol/typescript-sdk'); console.log('Módulo MCP carregado com sucesso'); } catch(e) { console.error('Erro ao carregar módulo MCP:', e.message); }"

echo "\n=== Fim do diagnóstico ==="