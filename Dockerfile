FROM node:20-alpine

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
EXPOSE 3000
EXPOSE 3001

# Comando para executar a aplicação
CMD ["node", "dist/start.js"]