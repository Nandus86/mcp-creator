from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Configurações de conexão com o banco de dados
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://mcpuser:mcppassword@postgres/mcp_db"
)

# Cria o engine de conexão
engine = create_engine(DATABASE_URL)

# Cria uma fábrica de sessões
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para os modelos
Base = declarative_base()

def get_db():
    """
    Gerenciador de sessão de banco de dados para injeção de dependência
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()