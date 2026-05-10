#include "esp_camera.h"
#include "esp_http_server.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "Base64.h"

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL = "http://192.168.1.100:5000/api/device/recognize";
const char* PING_URL = "http://192.168.1.100:5000/api/device/ping";
const char* TASK_URL = "http://192.168.1.100:5000/api/device/task";
const char* REGISTER_URL = "http://192.168.1.100:5000/api/device/register-face";
const char* DEVICE_ID = "esp32-cam-01";

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
httpd_handle_t cameraHttpServer = NULL;
httpd_handle_t streamHttpServer = NULL;
unsigned long lastPingMillis = 0;
unsigned long lastCaptureMillis = 0;
unsigned long lastTaskCheckMillis = 0;
unsigned long lastIpAnnounceMillis = 0;
bool registrationPending = false;

static const char* STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=frame";
static const char* STREAM_BOUNDARY = "\r\n--frame\r\n";
static const char* STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

void showMessage(const String& title, const String& line2 = "", const String& line3 = "") {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.println(title);
  if (line2.length()) display.println(line2);
  if (line3.length()) display.println(line3);
  display.display();
}

void announceIPAddress(bool showOnDisplay = true) {
  String ip = WiFi.localIP().toString();
  Serial.println("IP address: " + ip);
  Serial.println("Stream URL: http://" + ip + ":81/stream");

  if (showOnDisplay) {
    showMessage("WiFi connected", "IP address:", ip);
  }
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  showMessage("Connecting WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  announceIPAddress(true);
}

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_QVGA;
  config.jpeg_quality = 12;
  config.fb_count = psramFound() ? 2 : 1;
  config.grab_mode = CAMERA_GRAB_LATEST;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Camera init failed");
    return false;
  }
  return true;
}

static esp_err_t statusHandler(httpd_req_t* req) {
  String html = "<!doctype html><html><body><h2>ESP32-CAM Ready</h2><p>Stream: <a href=\"/stream\">/stream</a></p></body></html>";
  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, html.c_str(), html.length());
}

static esp_err_t streamHandler(httpd_req_t* req) {
  camera_fb_t* fb = NULL;
  char partBuffer[64];

  httpd_resp_set_type(req, STREAM_CONTENT_TYPE);
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Cache-Control", "no-cache");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Stream capture failed");
      return ESP_FAIL;
    }

    size_t headerLength = snprintf(partBuffer, sizeof(partBuffer), STREAM_PART, fb->len);
    if (httpd_resp_send_chunk(req, STREAM_BOUNDARY, strlen(STREAM_BOUNDARY)) != ESP_OK ||
        httpd_resp_send_chunk(req, partBuffer, headerLength) != ESP_OK ||
        httpd_resp_send_chunk(req, (const char*)fb->buf, fb->len) != ESP_OK) {
      esp_camera_fb_return(fb);
      break;
    }

    esp_camera_fb_return(fb);
  }

  return ESP_OK;
}

void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.max_uri_handlers = 8;

  httpd_uri_t indexUri = {
    .uri = "/",
    .method = HTTP_GET,
    .handler = statusHandler,
    .user_ctx = NULL
  };

  httpd_uri_t streamUri = {
    .uri = "/stream",
    .method = HTTP_GET,
    .handler = streamHandler,
    .user_ctx = NULL
  };

  if (httpd_start(&cameraHttpServer, &config) == ESP_OK) {
    httpd_register_uri_handler(cameraHttpServer, &indexUri);
  }

  config.server_port = 81;
  config.ctrl_port = 32769;
  if (httpd_start(&streamHttpServer, &config) == ESP_OK) {
    httpd_register_uri_handler(streamHttpServer, &streamUri);
    Serial.println("Camera stream started on port 81");
  } else {
    Serial.println("Failed to start stream server");
  }
}

void sendPing() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  HTTPClient http;
  http.begin(PING_URL);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(256);
  doc["device_id"] = DEVICE_ID;
  doc["status"] = "online";

  String body;
  serializeJson(doc, body);
  http.POST(body);
  http.end();
}

bool checkForRegistrationTask() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  String taskUrl = String(TASK_URL) + "?device_id=" + DEVICE_ID;
  HTTPClient http;
  http.begin(taskUrl);
  int code = http.GET();
  String response = http.getString();
  http.end();

  if (code <= 0) {
    Serial.printf("Task check failed: %d\n", code);
    return false;
  }

  DynamicJsonDocument res(4096);
  if (deserializeJson(res, response) != DeserializationError::Ok) {
    Serial.println("Task JSON parse failed");
    return false;
  }

  String mode = res["data"]["mode"] | "recognize";
  String studentName = res["data"]["registration"]["student_name"] | "";
  registrationPending = mode == "register_face";

  if (registrationPending) {
    showMessage("Register Face", studentName, "Look at camera");
  }

  return registrationPending;
}

void captureAndSend(const char* targetUrl, bool forRegistration) {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    showMessage("Capture failed");
    return;
  }

  String encoded = base64::encode(fb->buf, fb->len);
  DynamicJsonDocument doc(200000);
  doc["device_id"] = DEVICE_ID;
  doc["image"] = "data:image/jpeg;base64," + encoded;

  String body;
  serializeJson(doc, body);
  esp_camera_fb_return(fb);

  HTTPClient http;
  http.begin(targetUrl);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(body);
  String response = http.getString();
  http.end();

  if (code <= 0) {
    showMessage("HTTP error", String(code));
    return;
  }

  DynamicJsonDocument res(2048);
  deserializeJson(res, response);

  Serial.printf("Response: %s\n", response.c_str());
  if (forRegistration) {
    bool registered = res["data"]["registered"] | false;
    String label = res["data"]["label"] | "NO_RESPONSE";
    const char* studentName = res["data"]["student_name"] | "Unknown";
    registrationPending = false;
    if (registered) {
      showMessage("Face Saved", studentName, label);
    } else {
      String reason = label == "REGISTRATION_FAILED" ? "No clear face" : label;
      if (label == "SPOOF_DETECTED") {
        reason = "Wrong surface";
      }
      showMessage("Register Fail", reason, "Try again");
    }
  } else {
    bool recognized = res["data"]["recognized"] | false;
    String label = res["data"]["label"] | "NO_RESPONSE";
    const char* studentName = res["data"]["student"]["full_name"] | "Unknown";
    if (recognized) {
      showMessage("Attendance OK", studentName, label);
    } else {
      if (label == "SPOOF_DETECTED") {
        showMessage("Wrong Face", "Phone/photo seen", "Access denied");
      } else if (label == "UNKNOWN") {
        showMessage("Wrong Face", "Not registered", "Access denied");
      } else if (label == "NO_FACE") {
        showMessage("No Face", "Look at camera", "Try again");
      } else {
        showMessage("Recognition", label, "Try again");
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin(14, 15);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  if (!initCamera()) {
    showMessage("Camera init fail");
    return;
  }

  connectWiFi();
  startCameraServer();
  sendPing();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED && millis() - lastIpAnnounceMillis > 60000) {
    lastIpAnnounceMillis = millis();
    announceIPAddress(!registrationPending);
  }

  if (millis() - lastPingMillis > 30000) {
    lastPingMillis = millis();
    sendPing();
  }

  if (millis() - lastTaskCheckMillis > 4000) {
    lastTaskCheckMillis = millis();
    checkForRegistrationTask();
  }

  if (millis() - lastCaptureMillis > 10000) {
    lastCaptureMillis = millis();
    if (registrationPending) {
      captureAndSend(REGISTER_URL, true);
    } else {
      captureAndSend(BACKEND_URL, false);
    }
  }

  delay(250);
}
