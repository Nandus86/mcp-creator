from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import requests
import json

from ..database import get_db
from .models import APIConfiguration
from .schemas import APIConfigurationCreate
from typing import Dict, Any

import logging

server_router = APIRouter()
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@server_router.post("/api-config/")
def create_api_config(config: APIConfigurationCreate, db: Session = Depends(get_db)):
    db_config = APIConfiguration(**config.dict())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

@server_router.post("/execute-api/{tool_id}")
def execute_api(tool_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    logger.debug(f"Payload recebido: {payload}")
    
    config = db.query(APIConfiguration).filter(APIConfiguration.tool_id == tool_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="API Configuration not found")

    headers = config.headers or {}
    if "Content-Type" not in headers:
        headers["Content-Type"] = "application/json"
    logger.debug(f"Headers configurados: {headers}")

    request_body = config.additional_params or {}
    
    # Verifica se o payload contém 'body' e faz o parsing se necessário
    if payload.get("body"):
        body = payload["body"]
        # Se o body for uma string, faz o parse para JSON
        if isinstance(body, str):
            try:
                body = json.loads(body)
            except json.JSONDecodeError as e:
                logger.error(f"Erro ao fazer parse do body como JSON: {str(e)}")
                raise HTTPException(status_code=400, detail="O campo 'body' contém uma string JSON inválida")
        
        if "params" in body:  # Para APIs JSON-RPC como Odoo
            payload_params = body.get("params", {})
            if "args" in payload_params:
                config_args = request_body.get("params", {}).get("args", [])
                payload_args = payload_params["args"]
                combined_args = config_args + payload_args
                request_body.setdefault("params", {}).update({
                    "service": payload_params.get("service", request_body.get("params", {}).get("service", "object")),
                    "method": payload_params.get("method", request_body.get("params", {}).get("method", "execute_kw")),
                    "args": combined_args
                })
        else:  # Para APIs REST simples como Evolution
            request_body = body  # Usa o body diretamente (agora como objeto JSON)
    elif "args" in payload:
        request_body = payload["args"]
    
    logger.debug(f"Request body antes do envio: {request_body}")

    try:
        response = requests.request(
            method=config.method.lower(),
            url=config.base_url,
            headers=headers,
            json=request_body if request_body else None
        )
        logger.debug(f"Resposta da API: {response.text}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Erro na requisição: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))