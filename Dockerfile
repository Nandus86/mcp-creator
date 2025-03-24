FROM python:3.9-slim

WORKDIR /app

# Instalar dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todos os arquivos do projeto
COPY . .

# Instalar dependências de desenvolvimento
RUN pip install uvicorn

# Comando padrão (será sobrescrito no docker-compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]