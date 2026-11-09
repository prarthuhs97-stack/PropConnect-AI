from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from security import require_role
from models.user import User
from models.lead import Lead
from models.project import Project
from models.visit import SiteVisit

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    total_leads = db.query(Lead).count()

    unassigned_leads = db.query(Lead).filter(
        Lead.assigned_salesperson_id == None
    ).count()

    total_salespeople = db.query(User).filter(
        User.role == "salesperson",
        User.is_active == True
    ).count()

    total_projects = db.query(Project).filter(
        Project.is_active == True
    ).count()

    total_visits = db.query(SiteVisit).count()

    return {
        "admin": current_user.name,
        "total_leads": total_leads,
        "unassigned_leads": unassigned_leads,
        "total_salespeople": total_salespeople,
        "total_projects": total_projects,
        "total_visits": total_visits
    }