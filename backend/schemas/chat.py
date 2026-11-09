
from pydantic import BaseModel, Field
from typing import List


class ChatMessage(BaseModel):
    role: str
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    project_id: int
    question: str = Field(min_length=2, max_length=500)
    history: List[ChatMessage] = Field(default_factory=list, max_length=10)
