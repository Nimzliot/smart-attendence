from functools import wraps

from flask import current_app, g, request

from services.auth_service import verify_supabase_token
from services.supabase_service import get_supabase, reset_supabase
from utils.response import error


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return error("Authorization token is required", 401)

        token = auth_header.replace("Bearer ", "", 1)
        decoded = verify_supabase_token(token)
        if not decoded:
            return error("Invalid or expired token", 401)

        g.current_user = decoded
        return fn(*args, **kwargs)

    return wrapper


def require_role(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_role = None
            user_id = (g.current_user or {}).get("id") or (g.current_user or {}).get("sub")

            if user_id:
                for attempt in range(2):
                    try:
                        client = get_supabase() if attempt == 0 else reset_supabase()
                        result = (
                            client.table("users")
                            .select("role")
                            .eq("auth_user_id", user_id)
                            .limit(1)
                            .execute()
                        )
                        if result.data:
                            user_role = result.data[0].get("role")
                        break
                    except Exception as exc:
                        current_app.logger.warning(
                            "Supabase role lookup failed for user %s on attempt %s: %s",
                            user_id,
                            attempt + 1,
                            exc,
                        )
                        if attempt == 1:
                            return error(
                                "Temporary database connection issue. Please try again.",
                                503,
                            )

            if not user_role:
                candidate_role = (g.current_user or {}).get("role") or (g.current_user or {}).get("app_metadata", {}).get("role")
                if candidate_role in {"admin", "student"}:
                    user_role = candidate_role

            if user_role not in allowed_roles:
                return error("You do not have permission for this action", 403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator
