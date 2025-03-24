from sqlalchemy.orm import Session
import requests
from .models import APIConfiguration
from .schemas import APIConfigurationCreate

class APIConfigService:
    """
    Serviço para gerenciamento de configurações de API
    """
    @staticmethod
    def create_api_config(db: Session, config: APIConfigurationCreate):
        """
        Cria uma nova configuração de API
        """
        db_config = APIConfiguration(**config.dict())
        db.add(db_config)
        db.commit()
        db.refresh(db_config)
        return db_config

    @staticmethod
    def get_api_config(db: Session, tool_id: str):
        """
        Busca configuração de API por ID da ferramenta
        """
        return db.query(APIConfiguration).filter(APIConfiguration.tool_id == tool_id).first()

class APIExecutionService:
    """
    Serviço para execução de chamadas de API
    """
    @staticmethod
    def execute_api(config: APIConfiguration, payload: dict):
        """
        Executa uma chamada de API baseada na configuração
        """
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
            raise Exception(f"API Execution Error: {str(e)}")