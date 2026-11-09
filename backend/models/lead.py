from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func

from database import Base


class Lead(Base):
    __tablename__ = "leads"
    conversation_summary = Column(Text, nullable=True)

    id = Column(Integer, primary_key=True, index=True)

    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    bhk = Column(String(20), nullable=False)
    budget_min = Column(Integer)
    budget_max = Column(Integer)
    purchase_timeline = Column(String(100))

    contact_consent = Column(Boolean, default=False)

    status = Column(String(30), default="new")

    assigned_salesperson_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )
    source = Column(String(30), nullable=False, default="website")

    created_at = Column(DateTime(timezone=True), server_default=func.now())