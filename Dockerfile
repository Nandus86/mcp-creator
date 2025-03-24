# Usar uma imagem base com Node.js
FROM node:20-alpine

# Definir o diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm install

# Copiar o restante do código
COPY . .

# Construir código TypeScript
RUN npm run build

# Expor as portas em que a aplicação roda
EXPOSE 3000
EXPOSE 3001

# Comando para iniciar a aplicação
CMD ["npm", "start"]