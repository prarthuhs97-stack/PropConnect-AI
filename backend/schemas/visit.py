from pydantic import BaseModel
from datetime import date, time, datetime


class VisitSlotCreate(BaseModel):
    project_id: int
    visit_date: date
    start_time: time


class VisitSlotResponse(BaseModel):
    id: int
    project_id: int
    visit_date: date
    start_time: time
    is_active: bool

    class Config:
        from_attributes = True


class SiteVisitCreate(BaseModel):
    lead_id: int
    slot_id: int


class SiteVisitResponse(BaseModel):
    id: int
    lead_id: int
    buyer_id: int
    slot_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True