from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .models import Prompt, Tool
from .schemas import PromptCreate, ToolCreate

client_router = APIRouter()

@client_router.post("/prompts/")
def create_prompt(prompt: PromptCreate, db: Session = Depends(get_db)):
    db_prompt = Prompt(**prompt.dict())
    db.add(db_prompt)
    db.commit()
    db.refresh(db_prompt)
    return db_prompt

@client_router.get("/prompts/{tool_id}")
def get_prompts(tool_id: str, db: Session = Depends(get_db)):
    prompts = db.query(Prompt).filter(Prompt.tool_id == tool_id).all()
    return prompts

@client_router.post("/tools/")
def create_tool(tool: ToolCreate, db: Session = Depends(get_db)):
    db_tool = Tool(**tool.dict())
    db.add(db_tool)
    db.commit()
    db.refresh(db_tool)
    return db_tool

@client_router.get("/tools/{tool_id}")
def get_tool(tool_id: str, db: Session = Depends(get_db)):
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool