from sqlalchemy import Column, Integer, String, JSON, DateTime, Boolean
from sqlalchemy.sql import func
from ..database import Base

class Prompt(Base):
    """
    Modelo para armazenar prompts de ferramentas
    """
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(String, nullable=False)
    prompt_type = Column(String, nullable=False)
    description = Column(String)
    parameters = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Tool(Base):
    """
    Modelo para armazenar informações de ferramentas
    """
    __tablename__ = "tools"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    tool_set = Column(JSON)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())