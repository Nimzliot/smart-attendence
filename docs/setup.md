# Setup Guide

## 1. Backend

1. Copy `backend/.env.example` to `backend/.env`.
2. Install Python dependencies:
   `pip install -r backend/requirements.txt`
3. Start the Flask API:
   `python backend/run.py`

## 2. Frontend

1. Copy `frontend/.env.example` to `frontend/.env`.
2. Install dependencies:
   `npm install`
3. Run the Vite app:
   `npm run dev`

## 3. Supabase

1. Create a Supabase project.
2. Open the SQL Editor and run `backend/db/schema.sql`.
3. Create the login account in Supabase Auth.
4. After the account is created, update the matching row in `public.users` and set `role = 'admin'`.
5. Use the web dashboard to add students and register faces. Do not use public sign-up for admins.

## 4. ESP32-CAM

1. Open `embedded/esp32_cam/esp32_cam.ino` in Arduino IDE.
2. Install required libraries:
   - `ArduinoJson`
   - `Adafruit SSD1306`
   - `Adafruit GFX`
   - ESP32 board package
3. Update the WiFi credentials and backend IP.
4. Flash the firmware to the ESP32-CAM board.

## 5. Demo Checklist

- Create or import students.
- Register face data for each student from the dashboard.
- Create the admin account in Supabase first and confirm dashboard login works.
- Power the ESP32-CAM and confirm `/api/device/ping` updates the heartbeat status to alive.
- Present a registered face and confirm automatic attendance marking.
