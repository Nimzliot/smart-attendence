from flask import Blueprint, g

from services.supabase_service import get_supabase
from utils.decorators import require_auth
from utils.response import success


auth_bp = Blueprint("auth", __name__)


@auth_bp.get("/me")
@require_auth
def me():
    user = g.current_user
    user_id = user.get("id") or user.get("sub")
    db_role = None
    if user_id:
        result = (
            get_supabase()
            .table("users")
            .select("role")
            .eq("auth_user_id", user_id)
            .limit(1)
            .execute()
        )
        if result.data:
            db_role = result.data[0].get("role")
    return success(
        {
            "id": user_id,
            "email": user.get("email"),
            "role": db_role or user.get("role") or user.get("app_metadata", {}).get("role", "student"),
            "metadata": user.get("user_metadata", {}),
        }
    )
