# Usar uma imagem base com Node.js
FROM node:20-alpine

# Definir o diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json (se existir)
COPY package*.json ./

# Instalar as dependências no local correto
RUN npm install

# Copiar o restante do código para o diretório de trabalho
COPY . .

# Garantir permissões corretas
RUN chmod -R 755 ./node_modules/.bin

# Compilar o código TypeScript usando o tsc do node_modules
RUN npx tsc

# Expor as portas em que a aplicação roda
EXPOSE 3000
EXPOSE 3001

# Comando para iniciar a aplicação
CMD ["npm", "start"]
