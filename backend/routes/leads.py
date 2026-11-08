from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.lead import Lead
from models.project import Project
from models.user import User
from schemas.lead import LeadCreate, LeadResponse
from security import get_current_user, require_role

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.post("/", response_model=LeadResponse)
def create_lead(
    lead: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["buyer"]))
):
    project = db.query(Project).filter(
        Project.id == lead.project_id,
        Project.is_active == True
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if lead.budget_min is not None and lead.budget_max is not None:
        if lead.budget_min > lead.budget_max:
            raise HTTPException(
                status_code=400,
                detail="Minimum budget cannot exceed maximum budget"
            )

    new_lead = Lead(
        **lead.model_dump(),
        buyer_id=current_user.id
    )

    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)

    return new_lead


@router.get("/my", response_model=list[LeadResponse])
def get_my_leads(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["buyer"]))
):
    return db.query(Lead).filter(
        Lead.buyer_id == current_user.id
    ).all()
@router.get("/assigned", response_model=list[LeadResponse])
def get_assigned_leads(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["salesperson"]))
):
    return db.query(Lead).filter(
        Lead.assigned_salesperson_id == current_user.id
    ).all()


@router.put("/{lead_id}/status")
def update_lead_status(
    lead_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["salesperson"]))
):
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.assigned_salesperson_id == current_user.id
    ).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    allowed_statuses = ["contacted", "qualified", "site_visit", "converted", "lost"]

    if new_status == "contacted" and not lead.contact_consent:
      raise HTTPException(
        status_code=403,
        detail="Buyer has not given contact consent"
      )

    lead.status = new_status
    db.commit()

    return {"message": "Lead status updated successfully"}
@router.put("/{lead_id}/assign")
def assign_lead(
    lead_id: int,
    salesperson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    salesperson = db.query(User).filter(
        User.id == salesperson_id,
        User.role == "salesperson",
        User.is_active == True
    ).first()

    if not salesperson:
        raise HTTPException(
            status_code=404,
            detail="Salesperson not found"
        )

    lead.assigned_salesperson_id = salesperson.id
    db.commit()

    return {"message": "Lead assigned successfully"}