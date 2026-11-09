from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.lead import Lead
from models.project import Project
from models.user import User
from schemas.lead import LeadCreate, LeadResponse, LeadHandoff
from security import get_current_user, require_role

router = APIRouter(prefix="/leads", tags=["Leads"])

def check_duplicate_lead(db, buyer_id, project_id, bhk):
    existing_lead = db.query(Lead).filter(
        Lead.buyer_id == buyer_id,
        Lead.project_id == project_id,
        Lead.bhk == bhk,
        Lead.status.in_(["new", "contacted", "qualified", "site_visit"])
    ).first()

    if existing_lead:
        raise HTTPException(
            status_code=409,
            detail="An active lead already exists for this project and BHK"
        )


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
    check_duplicate_lead(
    db, current_user.id, lead.project_id, lead.bhk
)

    new_lead = Lead(
        **lead.model_dump(),
        buyer_id=current_user.id
    )
    check_duplicate_lead(
    db, current_user.id, lead.project_id, lead.bhk
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

@router.post("/handoff", response_model=LeadResponse)
def create_handoff(
    lead: LeadHandoff,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["buyer"]))
):
    # Handoff requires explicit buyer consent
    if not lead.contact_consent:
        raise HTTPException(
            status_code=403,
            detail="Buyer consent is required for sales handoff"
        )

    project = db.query(Project).filter(
        Project.id == lead.project_id,
        Project.is_active == True
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if (
        lead.budget_min is not None
        and lead.budget_max is not None
        and lead.budget_min > lead.budget_max
    ):
        raise HTTPException(
            status_code=400,
            detail="Minimum budget cannot exceed maximum budget"
        )

    new_lead = Lead(
        **lead.model_dump(exclude={"conversation_summary"}),
        buyer_id=current_user.id,
        conversation_summary=lead.conversation_summary
    )

    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)

    return new_lead