from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    location = Column(String(200), nullable=False)
    description = Column(Text)
    min_price = Column(Integer)
    max_price = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ProjectFact(Base):
    __tablename__ = "project_facts"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    category = Column(String(100), nullable=False)
    question = Column(String(255), nullable=False)
    answer = Column(Text, nullable=False)
    is_approved = Column(Boolean, default=False)