FROM node:18-alpine

WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json* ./
RUN npm install

# Copiar código-fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# Expor a porta para o servidor MCP
EXPOSE 3001

# Comando para iniciar o servidor
CMD ["npm", "run", "start"]