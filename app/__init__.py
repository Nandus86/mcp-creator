# Este arquivo pode ficar vazio ou conter configurações globais
from .database import Base, engine

# Criar todas as tabelas no banco de dados
Base.metadata.create_all(bind=engine)