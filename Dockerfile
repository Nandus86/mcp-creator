# Usar uma imagem base com Node.js
FROM node:20-alpine

# Instalar dependências necessárias para o Alpine Linux
RUN apk add --no-cache bash

# Definir o diretório de trabalho
WORKDIR /app

# Copiar package.json
COPY package.json ./

# Instalar dependências (isso gerará o package-lock.json dentro da imagem)
RUN npm install

# Adicionar etapas de depuração
RUN echo "Verificando se o tsc está instalado:" && \
    ls -la node_modules/.bin/tsc || echo "tsc não encontrado" && \
    echo "Verificando permissões do tsc:" && \
    ls -la node_modules/.bin/ && \
    chmod +x node_modules/.bin/tsc || echo "Falha ao ajustar permissões" && \
    echo "Verificando o PATH:" && \
    echo $PATH && \
    echo "Tentando executar o tsc diretamente:" && \
    node_modules/.bin/tsc --version || echo "Falha ao executar tsc diretamente"

# Adicionar node_modules/.bin ao PATH
ENV PATH="/app/node_modules/.bin:${PATH}"

# Copiar o restante do código
COPY . .

# Construir código TypeScript
RUN npm run build

# Expor as portas em que a aplicação roda
EXPOSE 3000
EXPOSE 3001

# Comando para iniciar a aplicação
CMD ["npm", "start"]