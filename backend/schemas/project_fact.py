from pydantic import BaseModel, Field, ConfigDict


class ProjectFactCreate(BaseModel):
    project_id: int
    category: str
    question: str
    answer: str


class ProjectFactResponse(BaseModel):
    id: int
    project_id: int
    category: str
    question: str
    answer: str
    is_approved: bool

    model_config = ConfigDict(from_attributes=True)