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
    
    # Verifica se o payload contém 'body' ou 'query'
    if payload.get("body"):
        body = payload["body"]
        # Se o body for uma string, faz o parse para JSON
        if isinstance(body, str):
            try:
                body = json.loads(body)
            except json.JSONDecodeError as e:
                logger.error(f"Erro ao fazer parse do body como JSON: {str(e)}")
                raise HTTPException(status_code=400, detail="O campo 'body' contém uma string JSON inválida")
    elif payload.get("query"):
        # Lida com o caso de encapsulamento em 'query'
        query = payload["query"]
        # Se query for um dict e tiver 'query' ou 'body', extrai o conteúdo
        if isinstance(query, dict):
            if "query" in query:
                query = query["query"]
            elif "body" in query:
                query = query["body"]
        # Se query for uma string, faz o parse para JSON
        if isinstance(query, str):
            try:
                body = json.loads(query)
            except json.JSONDecodeError as e:
                logger.error(f"Erro ao fazer parse do query como JSON: {str(e)}")
                raise HTTPException(status_code=400, detail="O campo 'query' contém uma string JSON inválida")
        else:
            body = query
    elif "args" in payload:
        body = payload["args"]
    else:
        logger.error("Payload não contém 'body', 'query' ou 'args'")
        raise HTTPException(status_code=422, detail="Payload deve conter 'body', 'query' ou 'args'")

    # Se 'body' contém um campo 'body' (ex.: {"body": {...}}), extrai o conteúdo
    if isinstance(body, dict) and "body" in body:
        request_body = body["body"]
    else:
        request_body = body

    # Lida com JSON-RPC ou REST
    if isinstance(request_body, dict) and "params" in request_body:  # Para APIs JSON-RPC como Odoo
        payload_params = request_body.get("params", {})
        if "args" in payload_params:
            config_args = config.additional_params.get("params", {}).get("args", []) if config.additional_params else []
            payload_args = payload_params["args"]
            combined_args = config_args + payload_args
            request_body.setdefault("params", {}).update({
                "service": payload_params.get("service", request_body.get("params", {}).get("service", "object")),
                "method": payload_params.get("method", request_body.get("params", {}).get("method", "execute_kw")),
                "args": combined_args
            })
    # Para APIs REST simples como Evolution, request_body já está no formato correto

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