FROM node:20-alpine

WORKDIR /app

# Copiar package.json e package-lock.json (se existir)
COPY package*.json ./

# Instalar dependências (incluindo devDependencies)
RUN npm install

# Copiar o restante do código
COPY . .

# Compilar TypeScript
RUN npx tsc

# Expor as portas
EXPOSE 3000
EXPOSE 3001

# Iniciar a aplicação
CMD ["npm", "start"]
