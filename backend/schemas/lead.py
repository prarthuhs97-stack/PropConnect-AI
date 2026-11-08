from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class LeadCreate(BaseModel):
    project_id: int
    bhk: str
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    purchase_timeline: str
    contact_consent: bool = Field(default=False)


class LeadResponse(BaseModel):
    id: int
    buyer_id: int
    project_id: int
    bhk: str
    budget_min: Optional[int]
    budget_max: Optional[int]
    purchase_timeline: Optional[str]
    contact_consent: bool
    status: str
    assigned_salesperson_id: Optional[int]

    model_config = ConfigDict(from_attributes=True)