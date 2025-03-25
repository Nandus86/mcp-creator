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

    # Headers: Combina os headers da configuração com Content-Type padrão, se aplicável
    headers = config.headers or {}
    if "Content-Type" not in headers:
        headers["Content-Type"] = "application/json"

    # Monta o corpo da requisição: Combina additional_params com o payload
    request_body = config.additional_params or {}
    if payload.get("body"):
        request_body.update(payload["body"])  # Usa o 'body' do payload para sobrescrever ou complementar
    elif "args" in payload:
        request_body = payload["args"]  # Se só tiver 'args', usa diretamente como corpo

    # Método HTTP da configuração
    method = config.method.lower()
    http_methods = {
        "get": requests.get,
        "post": requests.post,
        "put": requests.put,
        "delete": requests.delete,
        "patch": requests.patch
    }

    if method not in http_methods:
        raise HTTPException(status_code=400, detail=f"Método HTTP inválido: {method}")

    try:
        # Faz a requisição com o método especificado
        response = http_methods[method](
            config.base_url,
            headers=headers,
            json=request_body if request_body else None
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))