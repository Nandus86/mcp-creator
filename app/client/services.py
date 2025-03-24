from sqlalchemy.orm import Session
from .models import Prompt, Tool
from .schemas import PromptCreate, ToolCreate

class PromptService:
    """
    Serviço para gerenciamento de prompts
    """
    @staticmethod
    def create_prompt(db: Session, prompt: PromptCreate):
        """
        Cria um novo prompt
        """
        db_prompt = Prompt(**prompt.dict())
        db.add(db_prompt)
        db.commit()
        db.refresh(db_prompt)
        return db_prompt

    @staticmethod
    def get_prompts_by_tool(db: Session, tool_id: str):
        """
        Busca prompts por ID da ferramenta
        """
        return db.query(Prompt).filter(Prompt.tool_id == tool_id).all()

class ToolService:
    """
    Serviço para gerenciamento de ferramentas
    """
    @staticmethod
    def create_tool(db: Session, tool: ToolCreate):
        """
        Cria uma nova ferramenta
        """
        db_tool = Tool(**tool.dict())
        db.add(db_tool)
        db.commit()
        db.refresh(db_tool)
        return db_tool

    @staticmethod
    def get_tool_by_id(db: Session, tool_id: str):
        """
        Busca ferramenta por ID
        """
        return db.query(Tool).filter(Tool.id == tool_id).first()

    @staticmethod
    def list_active_tools(db: Session):
        """
        Lista todas as ferramentas ativas
        """
        return db.query(Tool).filter(Tool.active == True).all()