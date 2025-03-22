# MCP Odoo Connector

Este projeto implementa um servidor e cliente MCP (Model Context Protocol) para interação com APIs Odoo.

## Sobre

O MCP Odoo Connector facilita a comunicação entre sistemas de IA baseados em MCP e servidores Odoo, permitindo que agentes de IA interajam com dados e funções do Odoo de forma padronizada.

## Requisitos

- Node.js 18+
- Docker e Docker Compose
- Um servidor Odoo acessível

## Instalação

### Com Docker (recomendado)

1. Clone este repositório
2. Execute:

```bash
docker-compose up -d
```

### Sem Docker

1. Clone este repositório
2. Instale as dependências:

```bash
npm install
```

3. Compile o código TypeScript:

```bash
npm run build
```

4. Inicie o servidor:

```bash
npm start
```

## Uso

### Servidor MCP

O servidor MCP expõe uma ferramenta chamada `odoo-search-read` que permite consultar dados no Odoo.

Ele é acessível em: `http://localhost:3001/mcp/sse`

### Cliente MCP

Para testar o cliente MCP:

```bash
npm run client
```

O cliente solicitará informações sobre o servidor Odoo e executará uma consulta.

## Estrutura do Projeto

- `src/server/` - Código do servidor MCP
- `src/client/` - Cliente de teste para o MCP
- `src/shared/` - Tipos e utilitários compartilhados

## Configuração Personalizada

Você pode modificar as configurações no arquivo `docker-compose.yml` para alterar:

- Porta de exposição do servidor
- Variáveis de ambiente
- Volumes para persistência

## Licença

MIT