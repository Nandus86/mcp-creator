FROM node:18-alpine

WORKDIR /app

# Instalar dependências
COPY package.json ./
RUN npm install

# Copiar código-fonte
COPY tsconfig.json ./
COPY src ./src

# Verificar que todos os arquivos estão presentes
RUN ls -la && ls -la src/

# Compilar TypeScript
RUN npx tsc

# Verificar compilação
RUN ls -la dist/

# Expor a porta para o servidor MCP
EXPOSE 3001

# Comando para iniciar o servidor
CMD ["node", "dist/server/index.js"]