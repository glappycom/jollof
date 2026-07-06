from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CreateBoardRequest(BaseModel):
    intent_text: str = Field(..., min_length=1)
    name: Optional[str] = None
    language: str = "en"


class RefineBoardRequest(BaseModel):
    answers: Dict[str, Any] = Field(default_factory=dict)


class BoardResponse(BaseModel):
    id: int
    name: str
    created_at: str
    updated_at: str
    intent_text: str
    detected_recipe: str
    requirements: Dict[str, Any]
    architecture: Dict[str, Any]
    tasks: List[Dict[str, Any]]
    artifacts: List[Dict[str, Any]]
    status: str


class BoardListResponse(BaseModel):
    items: List[BoardResponse]


class PlanBoardResponse(BoardResponse):
    pass


class ScaffoldBoardResponse(BoardResponse):
    pass


class ExportBoardResponse(BaseModel):
    board_id: int
    planned_files: List[str]
    message: str


class DeployBoardResponse(BaseModel):
    board_id: int
    tenant_slug: str
    public_url: str
    admin_url: str
    qr_code_url: str
    root_path: str


class TenantMetaResponse(BaseModel):
    board_id: int
    tenant_slug: str
    public_url: str
    admin_url: str
    qr_code_url: str
    root_path: str
