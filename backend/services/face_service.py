import base64
import uuid
from pathlib import Path

import cv2
import face_recognition
import numpy as np
from flask import current_app

from services.supabase_service import get_supabase


def _decode_base64_image(image_b64: str):
    if not image_b64:
        return None
    try:
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        image_bytes = base64.b64decode(image_b64)
        nparr = np.frombuffer(image_bytes, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception:
        return None


def _get_largest_face_location(face_locations: list[tuple[int, int, int, int]]):
    if not face_locations:
        return None
    return max(face_locations, key=lambda box: max(box[2] - box[0], 0) * max(box[1] - box[3], 0))


def _get_face_center(face_location: tuple[int, int, int, int]):
    top, right, bottom, left = face_location
    return int((left + right) / 2), int((top + bottom) / 2)


def _get_glare_ratio(face_roi):
    if face_roi is None or face_roi.size == 0:
        return 0.0
    hsv = cv2.cvtColor(face_roi, cv2.COLOR_BGR2HSV)
    glare_mask = (hsv[:, :, 2] >= 245) & (hsv[:, :, 1] <= 40)
    return float(np.count_nonzero(glare_mask) / glare_mask.size)


def _find_screen_like_contour(image, face_center, face_area: int):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 80, 180)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    image_area = image.shape[0] * image.shape[1]
    min_area_ratio = current_app.config["ANTI_SPOOF_MIN_SCREEN_AREA_RATIO"]
    best_match = None

    for contour in contours:
        perimeter = cv2.arcLength(contour, True)
        if perimeter < 100:
            continue
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) != 4:
            continue

        x, y, width, height = cv2.boundingRect(approx)
        contour_area = width * height
        if contour_area < image_area * min_area_ratio:
            continue

        aspect_ratio = width / max(height, 1)
        if aspect_ratio < 0.45 or aspect_ratio > 2.2:
            continue

        cx, cy = face_center
        if not (x <= cx <= x + width and y <= cy <= y + height):
            continue

        if contour_area <= face_area * 1.35:
            continue

        candidate = {
            "x": x,
            "y": y,
            "width": width,
            "height": height,
            "area_ratio": float(contour_area / image_area),
        }
        if not best_match or contour_area > best_match["width"] * best_match["height"]:
            best_match = candidate

    return best_match


def save_image_from_base64(image_b64: str) -> str:
    image = _decode_base64_image(image_b64)
    if image is None:
        raise ValueError("Invalid image payload")
    file_name = f"{uuid.uuid4().hex}.jpg"
    file_path = Path(current_app.config["UPLOAD_DIR"]) / file_name
    cv2.imwrite(str(file_path), image)
    return str(file_path)


def get_face_encoding(image_path: str):
    image = face_recognition.load_image_file(image_path)
    encodings = face_recognition.face_encodings(image)
    if not encodings:
        return None
    return encodings[0].tolist()


def detect_face_from_base64(image_b64: str):
    image = _decode_base64_image(image_b64)
    if image is None:
        return None
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    encodings = face_recognition.face_encodings(rgb)
    if not encodings:
        return None
    return encodings[0].tolist()


def check_presentation_attack(image_b64: str):
    image = _decode_base64_image(image_b64)
    if image is None:
        return {
            "ok": False,
            "label": "INVALID_IMAGE",
            "message": "Image payload could not be decoded",
            "details": {},
        }

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb, model="hog")
    face_location = _get_largest_face_location(face_locations)
    if not face_location:
        return {
            "ok": True,
            "label": "NO_FACE",
            "message": "No face detected for spoof screening",
            "details": {},
        }

    top, right, bottom, left = face_location
    top = max(top, 0)
    left = max(left, 0)
    bottom = min(bottom, image.shape[0])
    right = min(right, image.shape[1])
    face_roi = image[top:bottom, left:right]
    face_area = max((bottom - top) * (right - left), 1)
    face_center = _get_face_center((top, right, bottom, left))
    glare_ratio = _get_glare_ratio(face_roi)
    screen_contour = _find_screen_like_contour(image, face_center, face_area)

    reasons = []
    if screen_contour and glare_ratio >= current_app.config["ANTI_SPOOF_MIN_GLARE_RATIO"]:
        reasons.append("screen_glare")

    if screen_contour and screen_contour["area_ratio"] >= 0.35:
        reasons.append("large_display_frame")

    if reasons:
        return {
            "ok": False,
            "label": "SPOOF_DETECTED",
            "message": "Possible phone or display spoof detected",
            "details": {
                "reasons": reasons,
                "glare_ratio": round(glare_ratio, 4),
                "screen_contour": screen_contour,
            },
        }

    return {
        "ok": True,
        "label": "LIVE_FACE",
        "message": "Presentation passed local spoof checks",
        "details": {
            "glare_ratio": round(glare_ratio, 4),
            "screen_contour": screen_contour,
        },
    }


def compare_with_students(face_encoding: list[float], tolerance: float):
    supabase = get_supabase()
    rows = (
        supabase.table("face_encodings")
        .select("id, student_id, encoding, users(full_name, email)")
        .execute()
    )

    stored_encodings = []
    metadata = []
    for row in rows.data or []:
        stored_encodings.append(np.array(row["encoding"]))
        metadata.append(row)

    if not stored_encodings:
        return None

    matches = face_recognition.compare_faces(stored_encodings, np.array(face_encoding), tolerance=tolerance)
    distances = face_recognition.face_distance(stored_encodings, np.array(face_encoding))

    if True not in matches:
        return None

    best_index = int(np.argmin(distances))
    if not matches[best_index]:
        return None

    return {
        "student_id": metadata[best_index]["student_id"],
        "confidence": float(1 - distances[best_index]),
        "profile": metadata[best_index].get("users", {}),
    }
