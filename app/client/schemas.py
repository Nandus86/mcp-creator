from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class PromptBase(BaseModel):
    tool_id: str
    prompt_type: str
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class PromptCreate(PromptBase):
    pass

class Prompt(PromptBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class ToolBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    tool_set: Optional[Dict[str, Any]] = None
    active: bool = True

class ToolCreate(ToolBase):
    pass

class Tool(ToolBase):
    created_at: datetime

    class Config:
        orm_mode = True