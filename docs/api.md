# API Reference

## Authenticated Endpoints

### `GET /api/auth/me`
Returns the current Supabase-authenticated user claims.

### `GET /api/students`
List all registered students. Admin login required.

### `POST /api/students`
Create a student from the dashboard. Admin login required.

```json
{
  "full_name": "Aarav Sharma",
  "email": "aarav@example.com",
  "department": "ECE"
}
```

### `POST /api/students/:student_id/register-face`
Registers one face image for a student. Admin login required.

```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSk..."
}
```

### `GET /api/attendance`
Returns attendance history. Admin login required.

### `POST /api/attendance/recognize`
Protected recognition endpoint for web uploads or manual operator triggers. Admin login required.

### `GET /api/analytics/overview`
Returns dashboard metrics, recent activity, and ESP32 heartbeat-derived alive/offline status. Admin login required.

## Device Endpoints

### `POST /api/device/ping`
No auth required. Records device heartbeat.

```json
{
  "device_id": "esp32-cam-01",
  "status": "online"
}
```

### `POST /api/device/recognize`
No auth required. Accepts a base64 image payload and returns the recognition outcome.

```json
{
  "device_id": "esp32-cam-01",
  "image": "data:image/jpeg;base64,/9j/4AAQSk..."
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Attendance marked successfully",
  "data": {
    "recognized": true,
    "label": "ATTENDANCE_MARKED",
    "student": {
      "full_name": "Aarav Sharma",
      "email": "aarav@example.com"
    },
    "confidence": 0.91
  }
}
```
