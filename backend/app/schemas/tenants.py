from typing import List, Optional
from pydantic import BaseModel, Field


class HandleCheckRequest(BaseModel):
    display_name: str = Field(..., min_length=1)
    preferred_handle: Optional[str] = None
    city: Optional[str] = None


class HandleCheckResponse(BaseModel):
    suggested_handle: str
    available: bool
    alternatives: List[str]


class TenantCreateRequest(BaseModel):
    display_name: str = Field(..., min_length=1)
    handle: Optional[str] = None
    recipe: str = "salon"
    board_id: Optional[int] = None


class TenantResponse(BaseModel):
    id: int
    display_name: str
    handle: str
    recipe: str
    board_id: Optional[int]
    created_at: str
    updated_at: str
    public_url: str
    admin_url: str
