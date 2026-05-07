# Architecture

## Overview

The system is split into three layers:

- `frontend/`: React + Vite admin dashboard with Supabase Auth, route protection, analytics, and device monitoring.
- `backend/`: Flask REST API that verifies Supabase JWTs for web routes, exposes unauthenticated ESP32 endpoints, and performs face recognition plus attendance writes.
- `embedded/`: ESP32-CAM Arduino firmware that captures frames, sends them to Flask, and displays the recognition result on an OLED.

## Data Flow

1. Admin signs in through Supabase Auth from the React frontend.
2. Frontend stores the session and attaches the access token to protected Flask API requests.
3. Flask validates the Supabase access token by asking Supabase for the current user.
4. Student records, face encodings, attendance records, and device health logs are stored in Supabase PostgreSQL.
5. The ESP32-CAM periodically calls `/api/device/ping` and `/api/device/recognize` without authentication.
6. Flask extracts the face encoding from the incoming image, compares it against known encodings, then marks attendance if no duplicate attendance exists for the active session window.

## Design Notes

- Clean separation between authenticated dashboard APIs and unauthenticated device APIs.
- Session duplicate prevention is handled server-side using a configurable hour window.
- Face encodings are stored as `jsonb` arrays for easy direct use from Python.
- RLS policies are enabled for all core tables.
