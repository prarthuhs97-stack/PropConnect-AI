from fastapi import APIRouter, Depends
from security import require_role
from models.user import User

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.get("/dashboard")
def admin_dashboard(
    current_user: User = Depends(require_role(["admin"]))
):
    return {
        "message": "Welcome to Admin Dashboard",
        "user": current_user.name
    }