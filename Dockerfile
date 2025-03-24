# Usar uma imagem base com Node.js (baseada em Debian)
FROM node:20

# Definir o diretório de trabalho
WORKDIR /app

# Copiar package.json
COPY package.json ./

# Instalar dependências (isso gerará o package-lock.json dentro da imagem)
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