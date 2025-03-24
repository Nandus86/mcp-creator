from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import requests

from ..database import get_db
from .models import APIConfiguration
from .schemas import APIConfigurationCreate

server_router = APIRouter()

@server_router.post("/api-config/")
def create_api_config(config: APIConfigurationCreate, db: Session = Depends(get_db)):
    db_config = APIConfiguration(**config.dict())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

@server_router.post("/execute-api/{tool_id}")
def execute_api(tool_id: str, payload: dict, db: Session = Depends(get_db)):
    config = db.query(APIConfiguration).filter(APIConfiguration.tool_id == tool_id).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="API Configuration not found")
    
    headers = config.headers or {}
    headers['Content-Type'] = 'application/json'
    
    try:
        response = requests.post(
            config.base_url,
            headers=headers,
            json={
                "jsonrpc": "2.0",
                "method": "call",
                "params": {
                    "service": payload.get("service", "object"),
                    "method": payload.get("method", "execute_kw"),
                    "args": payload.get("args", [])
                }
            }
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))