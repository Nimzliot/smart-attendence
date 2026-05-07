from datetime import datetime, timezone

from flask import Blueprint, current_app, request

from services.attendance_service import mark_attendance
from services.device_registration_service import (
    get_registration_state,
    mark_registration_complete,
    mark_registration_failed,
    mark_registration_processing,
)
from services.face_service import check_presentation_attack, compare_with_students, detect_face_from_base64
from services.student_face_service import register_face_for_student
from services.supabase_service import get_supabase
from utils.response import error, success


device_bp = Blueprint("devices", __name__)


@device_bp.post("/ping")
def ping():
    payload = request.get_json() or {}
    device_id = payload.get("device_id", "esp32-cam-01")
    supabase = get_supabase()
    supabase.table("device_logs").upsert(
        {
            "device_id": device_id,
            "status": payload.get("status", "online"),
            "last_seen": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="device_id",
    ).execute()
    return success({"device_id": device_id}, "Heartbeat stored")


@device_bp.get("/task")
def device_task():
    device_id = request.args.get("device_id", "esp32-cam-01")
    state = get_registration_state()
    target_device = state.get("device_id")
    should_register = state.get("pending") and (not target_device or target_device == device_id)
    return success(
        {
            "device_id": device_id,
            "mode": "register_face" if should_register else "recognize",
            "registration": state,
        }
    )


@device_bp.post("/register-face")
def device_register_face():
    payload = request.get_json() or {}
    image_b64 = payload.get("image")
    device_id = payload.get("device_id", "esp32-cam-01")
    state = get_registration_state()

    if not state.get("pending") or not state.get("student_id"):
        return success({"registered": False, "label": "NO_PENDING_REGISTRATION"}, "No pending registration task")
    if state.get("device_id") and state["device_id"] != device_id:
        return success({"registered": False, "label": "DEVICE_NOT_ASSIGNED"}, "Registration is assigned to another device")
    if not image_b64:
        return error("Image payload is required", 422)

    if current_app.config["ANTI_SPOOFING_ENABLED"]:
        spoof_check = check_presentation_attack(image_b64)
        if not spoof_check["ok"] and spoof_check["label"] == "SPOOF_DETECTED":
            updated_state = mark_registration_failed("Possible phone or display spoof detected", device_id)
            return success(
                {
                    "registered": False,
                    "label": "SPOOF_DETECTED",
                    "registration": updated_state,
                    "spoof": spoof_check["details"],
                },
                spoof_check["message"],
            )
        if not spoof_check["ok"] and spoof_check["label"] == "INVALID_IMAGE":
            return error(spoof_check["message"], 422, spoof_check["details"])

    mark_registration_processing(device_id)
    result, registration_error = register_face_for_student(state["student_id"], image_b64)
    if registration_error:
        updated_state = mark_registration_failed(registration_error, device_id)
        return success(
            {
                "registered": False,
                "label": "REGISTRATION_FAILED",
                "registration": updated_state,
            },
            registration_error,
        )

    updated_state = mark_registration_complete("Face registered successfully from ESP32-CAM", device_id)
    return success(
        {
            "registered": True,
            "label": "REGISTRATION_COMPLETED",
            "student_id": result["student_id"],
            "student_name": state.get("student_name"),
            "registration": updated_state,
        },
        "Face registered successfully",
    )


@device_bp.post("/recognize")
def device_recognize():
    payload = request.get_json() or {}
    image_b64 = payload.get("image")
    device_id = payload.get("device_id", "esp32-cam-01")
    if not image_b64:
        return error("Image payload is required", 422)

    if current_app.config["ANTI_SPOOFING_ENABLED"]:
        spoof_check = check_presentation_attack(image_b64)
        if not spoof_check["ok"] and spoof_check["label"] == "SPOOF_DETECTED":
            return success(
                {
                    "recognized": False,
                    "label": "SPOOF_DETECTED",
                    "spoof": spoof_check["details"],
                },
                spoof_check["message"],
            )
        if not spoof_check["ok"] and spoof_check["label"] == "INVALID_IMAGE":
            return error(spoof_check["message"], 422, spoof_check["details"])

    face = detect_face_from_base64(image_b64)
    if not face:
        return success({"recognized": False, "label": "NO_FACE"}, "No face detected")

    match = compare_with_students(face, current_app.config["FACE_TOLERANCE"])
    if not match:
        return success({"recognized": False, "label": "UNKNOWN"}, "Unknown face")

    attendance = mark_attendance(
        match["student_id"],
        device_id=device_id,
        session_hours=current_app.config["ATTENDANCE_SESSION_HOURS"],
    )
    return success(
        {
            "recognized": True,
            "label": "ATTENDANCE_MARKED" if attendance["created"] else "ALREADY_MARKED",
            "student": match["profile"],
            "confidence": match["confidence"],
            "attendance": attendance,
        },
        attendance["message"],
    )
