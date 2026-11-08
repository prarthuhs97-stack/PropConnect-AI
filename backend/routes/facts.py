from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project, ProjectFact
from models.user import User
from schemas.project_fact import ProjectFactCreate, ProjectFactResponse
from security import require_role

router = APIRouter(
    prefix="/facts",
    tags=["Project Facts"]
)


# Admin adds a new fact
@router.post("/", response_model=ProjectFactResponse)
def create_fact(
    fact: ProjectFactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    project = db.query(Project).filter(
        Project.id == fact.project_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    new_fact = ProjectFact(
        **fact.model_dump(),
        is_approved=False
    )

    db.add(new_fact)
    db.commit()
    db.refresh(new_fact)

    return new_fact


# Admin approves a fact
@router.put("/{fact_id}/approve")
def approve_fact(
    fact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    fact = db.query(ProjectFact).filter(
        ProjectFact.id == fact_id
    ).first()

    if not fact:
        raise HTTPException(status_code=404, detail="Fact not found")

    fact.is_approved = True
    db.commit()

    return {"message": "Fact approved successfully"}


# Buyers can view approved facts
@router.get("/project/{project_id}")
def get_approved_facts(
    project_id: int,
    db: Session = Depends(get_db)
):
    return db.query(ProjectFact).filter(
        ProjectFact.project_id == project_id,
        ProjectFact.is_approved == True
    ).all()