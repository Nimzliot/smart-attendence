from datetime import datetime, timedelta, timezone

from flask import current_app

from services.supabase_service import get_supabase


def _safe_execute(query, fallback=None):
    try:
        result = query.execute()
        return result.data if result.data is not None else fallback
    except Exception as exc:
        current_app.logger.exception("Supabase query failed: %s", exc)
        return fallback


def _parse_supabase_timestamp(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        current_app.logger.warning("Could not parse timestamp value: %s", value)
        return None


def mark_attendance(student_id: str, device_id: str | None = None, session_hours: int = 12):
    supabase = get_supabase()
    now = datetime.now(timezone.utc)
    session_start = (now - timedelta(hours=session_hours)).isoformat()

    duplicate = (
        supabase.table("attendance")
        .select("id, marked_at")
        .eq("student_id", student_id)
        .gte("marked_at", session_start)
        .order("marked_at", desc=True)
        .limit(1)
        .execute()
    )

    if duplicate.data:
        return {
            "created": False,
            "message": "Attendance already marked for current session",
            "attendance": duplicate.data[0],
        }

    payload = {
        "student_id": student_id,
        "status": "present",
        "source": "face_recognition",
        "device_id": device_id,
    }
    result = supabase.table("attendance").insert(payload).execute()
    return {
        "created": True,
        "message": "Attendance marked successfully",
        "attendance": (result.data or [{}])[0],
    }


def get_dashboard_metrics():
    supabase = get_supabase()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    total_students = 0
    try:
        users = supabase.table("users").select("id", count="exact").eq("role", "student").execute()
        total_students = users.count or 0
    except Exception as exc:
        current_app.logger.exception("Failed to load student count: %s", exc)

    present_rows = _safe_execute(
        supabase.table("attendance").select("id, student_id", count="exact").gte("marked_at", today_start),
        fallback=[],
    )
    device_rows = _safe_execute(
        supabase.table("device_logs").select("device_id, status, last_seen").order("last_seen", desc=True).limit(6),
        fallback=[],
    )
    recent_rows = _safe_execute(
        supabase.table("attendance")
        .select("id, status, marked_at, users!attendance_student_id_fkey(full_name)")
        .order("marked_at", desc=True)
        .limit(8),
        fallback=[],
    )

    present_today = len({row["student_id"] for row in (present_rows or []) if row.get("student_id")})
    absent_today = max(total_students - present_today, 0)
    percentage = round((present_today / total_students) * 100, 2) if total_students else 0

    offline_after = current_app.config["DEVICE_OFFLINE_AFTER_SECONDS"]
    device_status = []
    for device in device_rows or []:
        last_seen_raw = device.get("last_seen")
        last_seen = _parse_supabase_timestamp(last_seen_raw)
        seconds_since_seen = int((now - last_seen).total_seconds()) if last_seen else None
        is_alive = seconds_since_seen is not None and seconds_since_seen <= offline_after
        device_status.append(
            {
                **device,
                "is_alive": is_alive,
                "seconds_since_seen": seconds_since_seen,
                "connectivity_status": "alive" if is_alive else "offline",
            }
        )

    return {
        "summary": {
            "totalStudents": total_students,
            "presentToday": present_today,
            "absentToday": absent_today,
            "attendancePercentage": percentage,
        },
        "deviceStatus": device_status,
        "recentActivity": recent_rows or [],
    }
