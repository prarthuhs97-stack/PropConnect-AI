from sqlalchemy import Column, Integer, String, Boolean, Date, Time, DateTime, ForeignKey
from datetime import datetime
from database import Base


class VisitSlot(Base):
    __tablename__ = "visit_slots"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    visit_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    is_active = Column(Boolean, default=True)


class SiteVisit(Base):
    __tablename__ = "site_visits"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("visit_slots.id"), unique=True, nullable=False)
    status = Column(String, default="booked")
    created_at = Column(DateTime, default=datetime.utcnow)