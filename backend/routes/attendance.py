from flask import Blueprint, current_app, request

from services.attendance_service import mark_attendance
from services.face_service import check_presentation_attack, compare_with_students, detect_face_from_base64
from services.supabase_service import get_supabase
from utils.decorators import require_auth, require_role
from utils.response import error, success


attendance_bp = Blueprint("attendance", __name__)


@attendance_bp.get("")
@require_auth
@require_role("admin")
def get_attendance_logs():
    supabase = get_supabase()
    result = (
        supabase.table("attendance")
        .select("id, status, source, marked_at, device_id, users!attendance_student_id_fkey(full_name, email)")
        .order("marked_at", desc=True)
        .limit(200)
        .execute()
    )
    return success(result.data)


@attendance_bp.post("/recognize")
@require_auth
@require_role("admin")
def recognize_face():
    payload = request.get_json() or {}
    image_b64 = payload.get("image")
    device_id = payload.get("device_id")
    if not image_b64:
        return error("Image payload is required", 422)

    if current_app.config["ANTI_SPOOFING_ENABLED"]:
        spoof_check = check_presentation_attack(image_b64)
        if not spoof_check["ok"] and spoof_check["label"] == "SPOOF_DETECTED":
            return error("Possible phone or display spoof detected", 422, {"recognized": False, "spoof": spoof_check["details"]})
        if not spoof_check["ok"] and spoof_check["label"] == "INVALID_IMAGE":
            return error(spoof_check["message"], 422, spoof_check["details"])

    detected = detect_face_from_base64(image_b64)
    if not detected:
        return error("Unknown face or no face detected", 422, {"recognized": False})

    match = compare_with_students(detected, current_app.config["FACE_TOLERANCE"])
    if not match:
        return error("Unknown face detected", 404, {"recognized": False})

    attendance = mark_attendance(
        match["student_id"],
        device_id=device_id,
        session_hours=current_app.config["ATTENDANCE_SESSION_HOURS"],
    )
    return success(
        {
            "recognized": True,
            "student": match["profile"],
            "confidence": match["confidence"],
            "attendance": attendance,
        },
        attendance["message"],
    )
