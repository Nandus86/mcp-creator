from fastapi import FastAPI
from fastapi.routing import APIRouter

# Importar roteadores de cliente e servidor
from .client.routes import client_router
from .server.routes import server_router

# Configurações de banco de dados
from .database import Base, engine

# Criar todas as tabelas
Base.metadata.create_all(bind=engine)

# Aplicação principal
app = FastAPI(title="MCP Platform")

# Incluir roteadores
app.include_router(client_router, prefix="/client")
app.include_router(server_router, prefix="/server")

# Rota raiz
@app.get("/")
def read_root():
    return {"message": "MCP Platform - Multi-Capability Platform"}