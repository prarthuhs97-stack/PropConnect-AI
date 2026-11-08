from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    location: str
    description: Optional[str] = None
    min_price: Optional[int] = None
    max_price: Optional[int] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    location: str
    description: Optional[str]
    min_price: Optional[int]
    max_price: Optional[int]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)