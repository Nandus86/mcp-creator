from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.sql import func
from ..database import Base

class APIConfiguration(Base):
    """
    Modelo para armazenar configurações de APIs
    """
    __tablename__ = "api_configurations"

    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(String, nullable=False)
    base_url = Column(String, nullable=False)
    method = Column(String, nullable=False)
    authentication_type = Column(String)
    auth_config = Column(JSON)
    headers = Column(JSON)
    additional_params = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())