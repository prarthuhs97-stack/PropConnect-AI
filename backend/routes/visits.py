from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from models import VisitSlot, SiteVisit, Lead, Project
from models.user import User
from schemas.visit import (
    VisitSlotCreate,
    VisitSlotResponse,
    SiteVisitCreate,
    SiteVisitResponse
)
from security import get_current_user, require_role

router = APIRouter(prefix="/visits", tags=["Site Visits"])


# Admin creates a visit slot
@router.post("/slots", response_model=VisitSlotResponse)
def create_slot(
    data: VisitSlotCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin"))
):
    project = db.query(Project).filter(
        Project.id == data.project_id,
        Project.is_active == True
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    slot = VisitSlot(
        project_id=data.project_id,
        visit_date=data.visit_date,
        start_time=data.start_time
    )

    db.add(slot)
    db.commit()
    db.refresh(slot)

    return slot


# Buyers view available slots
@router.get("/slots", response_model=list[VisitSlotResponse])
def get_slots(
    project_id: int,
    db: Session = Depends(get_db)
):
    slots = db.query(VisitSlot).filter(
        VisitSlot.project_id == project_id,
        VisitSlot.is_active == True
    ).all()

    booked_ids = db.query(SiteVisit.slot_id).all()
    booked_ids = [item[0] for item in booked_ids]

    return [slot for slot in slots if slot.id not in booked_ids]


# Buyer books a slot
@router.post("/book", response_model=SiteVisitResponse)
def book_visit(
    data: SiteVisitCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("buyer"))
):
    lead = db.query(Lead).filter(
        Lead.id == data.lead_id,
        Lead.buyer_id == user.id
    ).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    slot = db.query(VisitSlot).filter(
        VisitSlot.id == data.slot_id,
        VisitSlot.project_id == lead.project_id,
        VisitSlot.is_active == True
    ).first()

    if not slot:
        raise HTTPException(status_code=404, detail="Available slot not found")

    booking = SiteVisit(
        lead_id=data.lead_id,
        buyer_id=user.id,
        slot_id=data.slot_id
    )

    try:
        db.add(booking)
        db.commit()
        db.refresh(booking)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This slot has already been booked"
        )

    return booking


# Buyer views their bookings
@router.get("/my", response_model=list[SiteVisitResponse])
def my_visits(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("buyer"))
):
    return db.query(SiteVisit).filter(
        SiteVisit.buyer_id == user.id
    ).all()