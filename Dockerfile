FROM node:18-alpine

WORKDIR /app

# Instalar git (necessário para pacotes do GitHub)
RUN apk add --no-cache git

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install || (echo "Falha na instalação inicial, tentando novamente com flags de tolerância..." && npm install --no-fund --no-audit --legacy-peer-deps)

# Copiar código fonte
COPY tsconfig.json ./
COPY src ./src

# Construir código TypeScript
RUN npm run build

# Expor as portas em que as aplicações rodam
EXPOSE 3000  # Para o mediador (app.ts)
EXPOSE 3001  # Para o MCP Server (server.ts)

# Comando para executar a aplicação
CMD ["node", "dist/start.js"]