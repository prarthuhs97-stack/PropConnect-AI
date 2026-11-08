from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.project import Project
from models.user import User
from schemas.project import ProjectCreate, ProjectResponse
from security import require_role

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)


# Admin can create projects
@router.post("/", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    new_project = Project(**project.model_dump())

    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return new_project


# Anyone can view active projects
@router.get("/", response_model=list[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).filter(
        Project.is_active == True
    ).all()