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

    # Simplificar extração - Priorizar 'body', depois 'query', depois 'args'
    raw_data = None
    if payload.get("body"):
        raw_data = payload["body"]
        logger.debug("Dados extraídos da chave 'body' do payload")
    elif payload.get("query"):
         # Se query for dict e tiver body, pegue o body
        if isinstance(payload["query"], dict) and "body" in payload["query"]:
             raw_data = payload["query"]["body"]
             logger.debug("Dados extraídos da chave 'body' dentro de 'query'")
        else:
             raw_data = payload["query"]
             logger.debug("Dados extraídos da chave 'query' do payload")
    elif payload.get("args"):
        raw_data = payload["args"]
        logger.debug("Dados extraídos da chave 'args' do payload")
    else:
        logger.error("Payload não contém 'body', 'query' ou 'args'")
        raise HTTPException(status_code=422, detail="Payload deve conter 'body', 'query' ou 'args'")

    # Tentar decodificar se for string JSON
    request_body_obj = None
    if isinstance(raw_data, str):
        try:
            request_body_obj = json.loads(raw_data)
            logger.debug(f"String JSON decodificada com sucesso: {request_body_obj}")
            # Tratamento extra: E se o resultado do loads for *outra* string JSON? (Pouco provável, mas defensivo)
            if isinstance(request_body_obj, str):
                 try:
                     logger.warning(f"Resultado do json.loads foi outra string, tentando decodificar novamente: {request_body_obj}")
                     request_body_obj = json.loads(request_body_obj)
                     logger.debug(f"Segunda decodificação bem-sucedida: {request_body_obj}")
                 except json.JSONDecodeError as e_inner:
                     logger.error(f"Erro ao fazer o segundo parse da string JSON: {str(e_inner)}")
                     raise HTTPException(status_code=400, detail=f"Campo contém uma string JSON duplamente codificada inválida: {str(e_inner)}")

        except json.JSONDecodeError as e:
            logger.error(f"Erro ao fazer parse dos dados como JSON string: {str(e)}")
            # Se não for JSON, talvez a API espere a string literal? Ou é erro?
            # Por enquanto, vamos assumir que DEVERIA ser JSON.
            raise HTTPException(status_code=400, detail=f"Os dados recebidos parecem ser uma string JSON inválida: {str(e)}")
    elif isinstance(raw_data, dict):
        request_body_obj = raw_data
        logger.debug(f"Dados já são um objeto: {request_body_obj}")
    else:
        # Lidar com outros tipos se necessário (lista, etc.)
         logger.error(f"Tipo de dados não esperado recebido: {type(raw_data)}")
         raise HTTPException(status_code=400, detail=f"Tipo de dados não suportado: {type(raw_data)}")

    # Verificar se o objeto resultante contém um campo 'body' (como em {"body": {"number": ...}})
    if isinstance(request_body_obj, dict) and "body" in request_body_obj and len(request_body_obj) == 1:
         logger.debug("Extraindo conteúdo de uma chave 'body' aninhada.")
         request_body_obj = request_body_obj["body"]

    # ---- Aqui, request_body_obj DEVE ser o objeto Python que você quer enviar ----
    # Aplicar lógica JSON-RPC ou REST (como antes, mas usando request_body_obj)
    final_request_body = request_body_obj # Começa com o objeto processado
    additional_params_processed = config.additional_params or {}

    # Lógica JSON-RPC (Odoo Example - Adaptar se necessário)
    # Assumindo que o payload do N8N/Agente fornece os 'args' variáveis
    if isinstance(final_request_body, dict) and "params" in additional_params_processed:
        # Se a configuração tem 'params', vamos usá-la como base
        logger.debug("Aplicando lógica JSON-RPC baseada na configuração.")
        base_params = additional_params_processed.get("params", {})
        payload_params = final_request_body # O que veio do N8N agora é considerado os parâmetros variáveis

        # Mesclar ou substituir campos conforme necessário
        # Exemplo: Mesclar 'args'
        if "args" in base_params and isinstance(base_params["args"], list) and isinstance(payload_params.get("args"), list):
            combined_args = base_params["args"] + payload_params["args"]
            base_params["args"] = combined_args
            logger.debug(f"Args combinados: {combined_args}")
        elif "args" in payload_params: # Se a config não tinha args, mas o payload tem
             base_params["args"] = payload_params["args"]

        # Atualizar outros campos se vierem no payload
        base_params.update({k: v for k, v in payload_params.items() if k != 'args'})

        final_request_body = {"jsonrpc": "2.0", "method": "call", **additional_params_processed, "params": base_params} # Estrutura completa JSON-RPC

    elif isinstance(additional_params_processed, dict) and additional_params_processed:
         # Lógica REST com parâmetros adicionais da config
         logger.debug("Mesclando parâmetros adicionais da configuração com o payload.")
         # Cuidado para não sobrescrever dados importantes do payload com a config,
         # ou vice-versa. Decida qual tem prioridade. Ex: Payload tem prioridade:
         final_request_body = {**additional_params_processed, **final_request_body}


    logger.debug(f"Request body final antes do envio: {final_request_body}")

    try:
        response = requests.request(
            method=config.method.lower(),
            url=config.base_url,
            headers=headers,
            # Certifique-se de que final_request_body é um dict ou None
            json=final_request_body if isinstance(final_request_body, dict) else None
        )
        # Resto do código...
        logger.debug(f"Resposta da API externa - Status: {response.status_code}")
        try:
             logger.debug(f"Resposta da API externa - Body: {response.text}")
        except Exception as read_err:
             logger.warning(f"Não foi possível ler o body da resposta externa: {read_err}")

        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        response_body_on_error = "[Não lido]"
        if e.response is not None:
            try:
                response_body_on_error = e.response.text
            except:
                pass
        logger.error(f"Erro HTTP da API externa: {str(e)} - Response Body: {response_body_on_error}")
        # Retorne o erro real da API externa para debug no N8N
        raise HTTPException(status_code=e.response.status_code, detail=f"Erro da API externa: {response_body_on_error}")
    except requests.RequestException as e:
        logger.error(f"Erro de conexão/rede com API externa: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Erro ao conectar com API externa: {str(e)}") # 502 Bad Gateway