from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import requests

from ..database import get_db
from .models import APIConfiguration
from .schemas import APIConfigurationCreate
from typing import Dict, Any

server_router = APIRouter()

@server_router.post("/api-config/")
def create_api_config(config: APIConfigurationCreate, db: Session = Depends(get_db)):
    db_config = APIConfiguration(**config.dict())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

@server_router.post("/execute-api/{tool_id}")
def execute_api(tool_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    # Busca a configuração da API
    config = db.query(APIConfiguration).filter(APIConfiguration.tool_id == tool_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="API Configuration not found")

    # Headers
    headers = config.headers or {}
    if "Content-Type" not in headers:
        headers["Content-Type"] = "application/json"

    # Monta o corpo da requisição
    request_body = config.additional_params or {}
    
    # Combina os argumentos do payload com os da configuração
    if payload.get("body") and "params" in payload["body"]:
        payload_params = payload["body"].get("params", {})
        if "args" in payload_params:
            # Concatena os args da configuração com os do payload
            config_args = request_body.get("params", {}).get("args", [])
            payload_args = payload_params["args"]
            combined_args = config_args + payload_args
            # Atualiza o request_body com os args combinados
            request_body.setdefault("params", {}).update({
                "service": payload_params.get("service", request_body.get("params", {}).get("service", "object")),
                "method": payload_params.get("method", request_body.get("params", {}).get("method", "execute_kw")),
                "args": combined_args
            })

    try:
        # Faz a requisição
        response = requests.request(
            method=config.method.lower(),
            url=config.base_url,
            headers=headers,
            json=request_body if request_body else None
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))