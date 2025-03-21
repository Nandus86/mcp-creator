# MCP Creator

Uma aplicação para criar e gerenciar protocolos MCP (Model Context Protocol) baseado no [typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk).

## Requisitos

- Docker
- Portainer (opcional, para gerenciamento)
- Traefik (opcional, para roteamento e certificados HTTPS)

## Configuração

1. Clone este repositório
2. Edite o arquivo `docker-compose.yml` para definir as variáveis de ambiente:
   - `MCP_API_KEY`: Sua chave API do MCP
   - `MCP_BASE_URL`: URL base da API MCP

## Implantação

### Usando Docker Compose:

```bash
docker-compose up -d
```

### Usando Portainer:

1. Acesse seu Portainer
2. Vá para "Stacks" e clique em "Add stack"
3. Dê um nome para o stack (ex: "mcp-creator")
4. Cole o conteúdo do arquivo `docker-compose.yml` no editor
5. Clique em "Deploy the stack"

## Endpoints da API

A aplicação expõe os seguintes endpoints:

### Configurações

- `GET /api/configurations` - Listar todas as configurações
- `GET /api/configurations/:id` - Obter uma configuração específica
- `POST /api/configurations` - Criar uma nova configuração
- `PUT /api/configurations/:id` - Atualizar uma configuração existente
- `DELETE /api/configurations/:id` - Excluir uma configuração

### Ferramentas (Tools)

- `GET /api/tools` - Listar todos os conjuntos de ferramentas
- `GET /api/tools/:id` - Obter um conjunto específico de ferramentas
- `POST /api/tools` - Criar um novo conjunto de ferramentas
- `PUT /api/tools/:id` - Atualizar um conjunto existente de ferramentas
- `DELETE /api/tools/:id` - Excluir um conjunto de ferramentas

### Prompts

- `GET /api/prompts` - Listar todos os prompts
- `GET /api/prompts/:id` - Obter um prompt específico
- `POST /api/prompts` - Criar um novo prompt
- `PUT /api/prompts/:id` - Atualizar um prompt existente
- `DELETE /api/prompts/:id` - Excluir um prompt

### Execução MCP

- `POST /api/mcp/run` - Executar um prompt MCP com configurações e ferramentas específicas

## Exemplos de Uso

### Criar uma configuração:

```bash
curl -X POST https://mcp.nandus.com.br/api/configurations \
  -H "Content-Type: application/json" \
  -d '{
    "id": "default-config",
    "config": {
      "model": "gpt-4",
      "max_tokens": 1000,
      "temperature": 0.7
    }
  }'
```

### Criar um conjunto de ferramentas:

```bash
curl -X POST https://mcp.nandus.com.br/api/tools \
  -H "Content-Type: application/json" \
  -d '{
    "id": "basic-tools",
    "toolSet": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get current weather in a given location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "The city and state, e.g. San Francisco, CA"
              }
            },
            "required": ["location"]
          }
        }
      }
    ]
  }'
```

### Criar um prompt:

```bash
curl -X POST https://mcp.nandus.com.br/api/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "id": "weather-prompt",
    "prompt": "Por favor, forneça o clima atual para a seguinte localização: {{location}}"
  }'
```

### Executar um prompt MCP:

```bash
curl -X POST https://mcp.nandus.com.br/api/mcp/run \
  -H "Content-Type: application/json" \
  -d '{
    "configId": "default-config",
    "promptId": "weather-prompt",
    "toolIds": ["basic-tools"],
    "messages": [
      {
        "role": "user",
        "content": "Qual é o clima em São Paulo hoje?"
      }
    ]
  }'
```