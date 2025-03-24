from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class APIConfigurationBase(BaseModel):
    tool_id: str
    base_url: str
    method: str = "POST"
    authentication_type: Optional[str] = None
    auth_config: Optional[Dict[str, Any]] = None
    headers: Optional[Dict[str, str]] = None
    additional_params: Optional[Dict[str, Any]] = None

class APIConfigurationCreate(APIConfigurationBase):
    pass

class APIConfiguration(APIConfigurationBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True