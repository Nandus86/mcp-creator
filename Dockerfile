FROM node:18-alpine

WORKDIR /app

# Instalar git (necessário para pacotes do GitHub)
RUN apk add --no-cache git

# Copy package.json and package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Se o SDK do MCP não estiver disponível via npm, instale diretamente do GitHub
RUN if ! npm list @modelcontextprotocol/typescript-sdk; then \
    npm install github:modelcontextprotocol/typescript-sdk; \
    fi

# Copiar código fonte
COPY tsconfig.json ./
COPY src ./src

# Construir código TypeScript
RUN npm run build

# Expor a porta em que a aplicação roda
EXPOSE 3000

# Comando para executar a aplicação
CMD ["npm", "start"]