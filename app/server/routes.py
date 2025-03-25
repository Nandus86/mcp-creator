from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import requests
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
    if payload.get("body"):
        if "params" in payload["body"]:  # Para APIs JSON-RPC como Odoo
            payload_params = payload["body"].get("params", {})
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
            request_body = payload["body"]  # Usa o body diretamente
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