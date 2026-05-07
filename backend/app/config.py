import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    API_PORT = int(os.getenv("API_PORT", "5000"))
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

    UPLOAD_DIR = str(BASE_DIR / os.getenv("UPLOAD_DIR", "uploads"))
    ATTENDANCE_SESSION_HOURS = int(os.getenv("ATTENDANCE_SESSION_HOURS", "12"))
    FACE_TOLERANCE = float(os.getenv("FACE_TOLERANCE", "0.5"))
    ANTI_SPOOFING_ENABLED = os.getenv("ANTI_SPOOFING_ENABLED", "true").lower() == "true"
    ANTI_SPOOF_MIN_GLARE_RATIO = float(os.getenv("ANTI_SPOOF_MIN_GLARE_RATIO", "0.03"))
    ANTI_SPOOF_MIN_SCREEN_AREA_RATIO = float(os.getenv("ANTI_SPOOF_MIN_SCREEN_AREA_RATIO", "0.18"))
    DEVICE_OFFLINE_AFTER_SECONDS = int(os.getenv("DEVICE_OFFLINE_AFTER_SECONDS", "90"))
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
