FROM node:18-alpine

WORKDIR /app

# Instalar git (necessário para pacotes do GitHub)
RUN apk add --no-cache git

# Copy package.json and package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install || (echo "Falha na instalação inicial, tentando novamente com flags de tolerância..." && npm install --no-fund --no-audit --legacy-peer-deps)

# Copiar código fonte
COPY tsconfig.json ./
COPY src ./src

# Construir código TypeScript com opção para ignorar erros e avisos
RUN npm run build || (echo "Compilação com erros, gerando JS diretamente..." && npx tsc --skipLibCheck --noEmitOnError false)

# Expor a porta em que a aplicação roda
EXPOSE 3000 
EXPOSE 3001 

# Comando para executar a aplicação
CMD ["node", "dist/start.js"]