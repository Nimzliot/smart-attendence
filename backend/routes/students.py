from pathlib import Path

from flask import Blueprint, current_app, request, send_from_directory, url_for

from services.device_registration_service import begin_registration, clear_registration, get_registration_state
from services.face_service import check_presentation_attack
from services.student_face_service import register_face_for_student
from services.supabase_service import get_supabase
from utils.decorators import require_auth, require_role
from utils.response import error, success


students_bp = Blueprint("students", __name__)


@students_bp.get("")
@require_auth
@require_role("admin")
def list_students():
    supabase = get_supabase()
    result = (
        supabase.table("users")
        .select("id, full_name, email, role, department, created_at")
        .eq("role", "student")
        .order("created_at", desc=True)
        .execute()
    )
    return success(result.data)


@students_bp.get("/faces")
@require_auth
@require_role("admin")
def list_student_faces():
    supabase = get_supabase()
    result = (
        supabase.table("face_encodings")
        .select("id, student_id, image_path, created_at, users!face_encodings_student_id_fkey(full_name, email, department)")
        .order("created_at", desc=True)
        .execute()
    )

    faces = []
    for row in result.data or []:
        image_path = row.get("image_path")
        file_name = Path(image_path).name if image_path else None
        faces.append(
            {
                "id": row.get("id"),
                "student_id": row.get("student_id"),
                "student": row.get("users") or {},
                "image_path": image_path,
                "image_url": url_for("students.get_face_image", filename=file_name, _external=True) if file_name else None,
                "created_at": row.get("created_at"),
            }
        )

    return success(faces)


@students_bp.get("/face-images/<path:filename>")
def get_face_image(filename):
    return send_from_directory(current_app.config["UPLOAD_DIR"], filename)


@students_bp.post("")
@require_auth
@require_role("admin")
def create_student():
    payload = request.get_json() or {}
    required = ["full_name", "email"]
    missing = [field for field in required if not payload.get(field)]
    if missing:
        return error("Missing required fields", 422, missing)

    supabase = get_supabase()
    result = supabase.table("users").insert(
        {
            "full_name": payload["full_name"],
            "email": payload["email"],
            "role": "student",
            "department": payload.get("department"),
        }
    ).execute()
    return success((result.data or [{}])[0], "Student created", 201)


@students_bp.post("/<student_id>/register-face")
@require_auth
@require_role("admin")
def register_face(student_id):
    payload = request.get_json() or {}
    image_b64 = payload.get("image")
    if not image_b64:
        return error("Image is required", 422)

    if current_app.config["ANTI_SPOOFING_ENABLED"]:
        spoof_check = check_presentation_attack(image_b64)
        if not spoof_check["ok"] and spoof_check["label"] == "SPOOF_DETECTED":
            return error("Possible phone or display spoof detected", 422, spoof_check["details"])
        if not spoof_check["ok"] and spoof_check["label"] == "INVALID_IMAGE":
            return error(spoof_check["message"], 422, spoof_check["details"])

    supabase = get_supabase()
    student = supabase.table("users").select("id").eq("id", student_id).eq("role", "student").limit(1).execute()
    if not student.data:
        return error("Student not found", 404)

    result, registration_error = register_face_for_student(student_id, image_b64)
    if registration_error:
        return error(registration_error, 422)

    return success(result, "Face registered successfully")


@students_bp.post("/<student_id>/hardware-register/start")
@require_auth
@require_role("admin")
def start_hardware_registration(student_id):
    payload = request.get_json() or {}
    device_id = payload.get("device_id", "esp32-cam-01")
    supabase = get_supabase()
    student = (
        supabase.table("users")
        .select("id, full_name")
        .eq("id", student_id)
        .eq("role", "student")
        .limit(1)
        .execute()
    )
    if not student.data:
        return error("Student not found", 404)

    state = begin_registration(student_id, student.data[0]["full_name"], device_id)
    return success(state, "Hardware face registration started")


@students_bp.get("/hardware-register/status")
@require_auth
@require_role("admin")
def get_hardware_registration_status():
    return success(get_registration_state())


@students_bp.post("/hardware-register/cancel")
@require_auth
@require_role("admin")
def cancel_hardware_registration():
    return success(clear_registration(), "Hardware face registration cancelled")
