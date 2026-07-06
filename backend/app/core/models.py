from enum import Enum
from typing import Any, Dict, List
from pydantic import BaseModel


class Recipe(str, Enum):
    bookings = "bookings"
    commerce = "commerce"
    membership = "membership"
    school_sis = "school_sis"
    unknown = "unknown"


class BoardStatus(str, Enum):
    draft = "draft"
    planned = "planned"
    scaffolding = "scaffolding"
    building = "building"
    deployed = "deployed"
    done = "done"
    error = "error"


class WorkingBoard(BaseModel):
    id: int
    name: str
    created_at: str
    updated_at: str
    intent_text: str
    detected_recipe: Recipe
    requirements: Dict[str, Any]
    architecture: Dict[str, Any]
    tasks: List[Dict[str, Any]]
    artifacts: List[Dict[str, Any]]
    status: BoardStatus
