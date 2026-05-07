from datetime import datetime, timedelta, timezone

from flask import Blueprint

from services.attendance_service import get_dashboard_metrics
from services.supabase_service import get_supabase
from utils.decorators import require_auth, require_role
from utils.response import success


analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.get("/overview")
@require_auth
@require_role("admin")
def overview():
    supabase = get_supabase()
    dashboard = get_dashboard_metrics()

    trend = []
    for days_back in range(6, -1, -1):
        day_start = datetime.now(timezone.utc) - timedelta(days=days_back)
        day_start = day_start.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        try:
            result = (
                supabase.table("attendance")
                .select("id, student_id")
                .gte("marked_at", day_start.isoformat())
                .lt("marked_at", day_end.isoformat())
                .execute()
            )
            present_count = len({row["student_id"] for row in (result.data or []) if row.get("student_id")})
        except Exception:
            present_count = 0
        trend.append({"date": day_start.strftime("%a"), "present": present_count})

    return success({**dashboard, "weeklyTrend": trend})
