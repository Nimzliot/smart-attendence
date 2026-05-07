from flask import Blueprint, g, request

from services.supabase_service import get_supabase
from utils.decorators import require_auth
from utils.response import success


settings_bp = Blueprint("settings", __name__)


@settings_bp.get("/profile")
@require_auth
def get_profile():
    return success(g.current_user)


@settings_bp.put("/profile")
@require_auth
def update_profile():
    payload = request.get_json() or {}
    supabase = get_supabase()
    user_id = g.current_user.get("id") or g.current_user.get("sub")
    result = supabase.table("users").update(
        {
            "full_name": payload.get("full_name"),
            "department": payload.get("department"),
        }
    ).eq("auth_user_id", user_id).execute()
    return success((result.data or [{}])[0], "Profile updated")
