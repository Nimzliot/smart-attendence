from flask import current_app

from services.face_service import get_face_encoding, save_image_from_base64
from services.supabase_service import get_supabase


def register_face_for_student(student_id: str, image_b64: str):
    image_path = save_image_from_base64(image_b64)
    encoding = get_face_encoding(image_path)
    if not encoding:
        return None, "No face detected in the provided image"

    supabase = get_supabase()
    existing = supabase.table("face_encodings").select("id").eq("student_id", student_id).execute()
    if existing.data:
        supabase.table("face_encodings").update(
            {"encoding": encoding, "image_path": image_path}
        ).eq("student_id", student_id).execute()
    else:
        supabase.table("face_encodings").insert(
            {"student_id": student_id, "encoding": encoding, "image_path": image_path}
        ).execute()

    current_app.logger.info("Face registration completed for student_id=%s", student_id)
    return {"student_id": student_id, "image_path": image_path}, None
