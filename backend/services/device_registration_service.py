from datetime import datetime, timezone
from threading import Lock


_state_lock = Lock()
_registration_state = {
    "pending": False,
    "student_id": None,
    "student_name": None,
    "device_id": None,
    "status": "idle",
    "message": "No hardware registration in progress",
    "updated_at": None,
}


def _timestamp():
    return datetime.now(timezone.utc).isoformat()


def get_registration_state():
    with _state_lock:
        return dict(_registration_state)


def begin_registration(student_id: str, student_name: str, device_id: str | None = None):
    with _state_lock:
        _registration_state.update(
            {
                "pending": True,
                "student_id": student_id,
                "student_name": student_name,
                "device_id": device_id,
                "status": "pending_capture",
                "message": "Waiting for ESP32-CAM to capture student face",
                "updated_at": _timestamp(),
            }
        )
        return dict(_registration_state)


def mark_registration_processing(device_id: str | None = None):
    with _state_lock:
        _registration_state.update(
            {
                "status": "processing",
                "message": "ESP32-CAM captured image and backend is processing it",
                "device_id": device_id or _registration_state.get("device_id"),
                "updated_at": _timestamp(),
            }
        )
        return dict(_registration_state)


def mark_registration_complete(message: str = "Face registered successfully", device_id: str | None = None):
    with _state_lock:
        _registration_state.update(
            {
                "pending": False,
                "status": "completed",
                "message": message,
                "device_id": device_id or _registration_state.get("device_id"),
                "updated_at": _timestamp(),
            }
        )
        return dict(_registration_state)


def mark_registration_failed(message: str, device_id: str | None = None):
    with _state_lock:
        _registration_state.update(
            {
                "pending": False,
                "status": "failed",
                "message": message,
                "device_id": device_id or _registration_state.get("device_id"),
                "updated_at": _timestamp(),
            }
        )
        return dict(_registration_state)


def clear_registration():
    with _state_lock:
        _registration_state.update(
            {
                "pending": False,
                "student_id": None,
                "student_name": None,
                "device_id": None,
                "status": "idle",
                "message": "No hardware registration in progress",
                "updated_at": _timestamp(),
            }
        )
        return dict(_registration_state)
