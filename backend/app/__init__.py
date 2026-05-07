from pathlib import Path

from flask import Flask
from flask_cors import CORS

from app.config import Config
from routes.analytics import analytics_bp
from routes.attendance import attendance_bp
from routes.auth import auth_bp
from routes.devices import device_bp
from routes.settings import settings_bp
from routes.students import students_bp
from utils.logger import configure_logging


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    Path(app.config["UPLOAD_DIR"]).mkdir(parents=True, exist_ok=True)
    CORS(app, resources={r"/api/*": {"origins": [app.config["FRONTEND_URL"], "*"]}})
    configure_logging(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(students_bp, url_prefix="/api/students")
    app.register_blueprint(attendance_bp, url_prefix="/api/attendance")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")
    app.register_blueprint(device_bp, url_prefix="/api/device")

    @app.get("/api/health")
    def health():
        return {"status": "ok", "service": "smart-attendance-api"}

    return app
