/**
 * ==============================================================================
 * SMART MEDICINE DISPENSER — ESP32 FIRMWARE v3.3
 * Direct Firebase Firestore REST API (Free Spark Plan)
 * Invented & Developed by: Shivraj Deshmukh
 * Copyright (c) 2026 Shivraj Deshmukh. All Rights Reserved.
 * ==============================================================================
 * NOTIFICATIONS:
 *   T - 1 min  →  "Medicine due in 1 minute!" alert on phone
 *   T + 0 min  →  ESP32 beeps + LED ON, waits for hand
 *   T + 1 min  →  "⚠️ Medicine not taken!" missed-dose alert on phone
 *
 * HARDWARE PINS:
 *   I2C (OLED+RTC): SDA=21, SCL=22
 *   Servos: A=16  B=17  C=18  D=19
 *   LEDs:   A=4   B=2   C=15  D=13
 *   HC-SR04: TRIG=5, ECHO=3
 *   Buzzer: 23
 * ==============================================================================
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <RTClib.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ESP32Servo.h>

// ══════════════════════════════════════════════════════
// ★  CONFIGURATION
// Configure your Wi-Fi credentials and Firebase settings here:
const char* WIFI_NAME     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* FIREBASE_API_KEY = "YOUR_FIREBASE_API_KEY";
const char* DEVICE_ID        = "ESP32_DISPENSER_SHIVRAJ_01";

#define FS_BASE "https://firestore.googleapis.com/v1/projects/YOUR_FIREBASE_PROJECT_ID/databases/(default)/documents"

// ══════════════════════════════════════════════════════
// PINS
// ══════════════════════════════════════════════════════
const int SDA_PIN  = 21,  SCL_PIN  = 22;
const int servoPins[4] = {16, 17, 18, 19};
const int ledPins[4]   = { 4,  2, 15, 13};
const int BUZZER_PIN   = 23;
const int TRIG_PIN     =  5,  ECHO_PIN = 3;

// ══════════════════════════════════════════════════════
// HARDWARE OBJECTS
// ══════════════════════════════════════════════════════
#define SCREEN_W 128
#define SCREEN_H  64
RTC_DS3231        rtc;
Adafruit_SSD1306  display(SCREEN_W, SCREEN_H, &Wire, -1);
Servo             servos[4];

// ══════════════════════════════════════════════════════
// SCHEDULE
// ══════════════════════════════════════════════════════
struct MedicineSlot {
  bool  enabled;
  char  name[32];
  int   timeCount;
  int   hours[8];
  int   minutes[8];
};
MedicineSlot slots[4];

// ── Per slot-per-dose tracking (date * 10 + timeIndex) ──
int lastDoseDate[4]    = {-1,-1,-1,-1};  // dose actually dispensed
int lastAdvanceDate[4] = {-1,-1,-1,-1};  // 1-min-before alert sent
int lastMissedDate[4]  = {-1,-1,-1,-1};  // missed-dose alert sent

// ══════════════════════════════════════════════════════
// STATE MACHINE
// ══════════════════════════════════════════════════════
enum DeviceMode { WAITING_FOR_DOSE, BEEPING_FOR_HAND, DISPENSING, WAITING_FOR_HAND_CLEAR };
enum ServoMode  { SERVO_OPENING, SERVO_HOLDING, SERVO_CLOSING };

DeviceMode mode      = WAITING_FOR_DOSE;
ServoMode  servoMode;

bool rtcOk      = false;
bool oledOk     = false;
bool scheduleOk = false;

int  activeSlot  = -1;
int  activeTimeIdx = -1;          // which scheduled time triggered
unsigned long alertStartMs = 0;   // millis() when beeping started (for missed-dose timer)

int  handReadings = 0;
int  currentAngle = 0;
bool buzzerState  = false;
float distanceCm  = -1;

// Servo tuning
const int   CLOSED_ANGLE         =   0;
const int   OPEN_ANGLE           = 110;
const float HAND_DIST_CM         =  12.0;
const int   HAND_READINGS_NEEDED =   3;

// Timing constants
const unsigned long SCHEDULE_POLL_MS   = 30000UL;
const unsigned long SENSOR_POLL_MS     =   100UL;
const unsigned long SERVO_STEP_MS      =    15UL;
const unsigned long SERVO_HOLD_MS      =   600UL;
const unsigned long BEEP_PERIOD_MS     =  1000UL;
const unsigned long BEEP_ON_MS         =   200UL;
const unsigned long MISSED_DOSE_MS     = 60000UL;  // 1 minute after alert → missed

unsigned long lastSchedulePoll = 0;
unsigned long lastSensorPoll   = 0;
unsigned long lastDisplayUpdate= 0;
unsigned long lastServoStep    = 0;
unsigned long servoHoldStart   = 0;

// ══════════════════════════════════════════════════════
// BACKGROUND HTTP TASK (FreeRTOS)
// Keeps main loop fast — HTTP never blocks UI/servo/sensor
// ══════════════════════════════════════════════════════
struct HttpJob {
  char url[256];
  char body[1024];   // empty = GET, non-empty = POST/PATCH
  char method[8];    // "POST" | "PATCH" | "GET"
};

#define JOB_QUEUE_SIZE 8
HttpJob   jobQueue[JOB_QUEUE_SIZE];
int       jobHead = 0, jobTail = 0, jobCount = 0;
SemaphoreHandle_t jobMutex;

void enqueueHttp(const char* url, const char* body, const char* method) {
  if (xSemaphoreTake(jobMutex, 10) == pdTRUE) {
    if (jobCount < JOB_QUEUE_SIZE) {
      HttpJob& j = jobQueue[jobHead];
      strncpy(j.url,    url,    sizeof(j.url)    - 1);
      strncpy(j.body,   body,   sizeof(j.body)   - 1);
      strncpy(j.method, method, sizeof(j.method) - 1);
      jobHead = (jobHead + 1) % JOB_QUEUE_SIZE;
      jobCount++;
    }
    xSemaphoreGive(jobMutex);
  }
}

// Background task — runs on Core 0, main loop on Core 1
void httpWorkerTask(void* pvParams) {
  for (;;) {
    if (jobCount > 0 && WiFi.status() == WL_CONNECTED) {
      if (xSemaphoreTake(jobMutex, 50) == pdTRUE) {
        HttpJob j = jobQueue[jobTail];
        jobTail = (jobTail + 1) % JOB_QUEUE_SIZE;
        jobCount--;
        xSemaphoreGive(jobMutex);

        WiFiClientSecure client;
        client.setInsecure();
        client.setTimeout(8);
        HTTPClient http;

        if (http.begin(client, j.url)) {
          http.addHeader("Content-Type", "application/json");
          int code = 0;
          if (strcmp(j.method, "GET") == 0)        code = http.GET();
          else if (strcmp(j.method, "POST") == 0)  code = http.POST(j.body);
          else if (strcmp(j.method, "PATCH") == 0) code = http.PATCH(j.body);
          Serial.printf("[HTTP] %s → %d\n", j.method, code);
          http.end();
        }
      }
    }
    vTaskDelay(pdMS_TO_TICKS(200));
  }
}

// ══════════════════════════════════════════════════════
// HELPER — current time as ISO string
// ══════════════════════════════════════════════════════
void nowIso(char* buf, size_t len) {
  if (!rtcOk) { strncpy(buf, "unknown", len); return; }
  DateTime n = rtc.now();
  snprintf(buf, len, "%04d-%02d-%02dT%02d:%02d:%02dZ",
           n.year(), n.month(), n.day(), n.hour(), n.minute(), n.second());
}

// ══════════════════════════════════════════════════════
// FIRESTORE — write alert to /devices/{id}/alerts
// Flutter app's real-time listener picks this up instantly
// and shows a local notification on the phone.
// ══════════════════════════════════════════════════════
void writeAlert(const char* type, const char* title, const char* body,
                int slotIdx, const char* severity) {
  char docId[48];
  snprintf(docId, sizeof(docId), "alert_%s_%lu", type, (unsigned long)millis());

  char iso[28]; nowIso(iso, sizeof(iso));

  JsonDocument doc;
  JsonObject f = doc["fields"].to<JsonObject>();
  f["id"]["stringValue"]         = docId;
  f["deviceId"]["stringValue"]   = DEVICE_ID;
  f["type"]["stringValue"]       = type;
  f["title"]["stringValue"]      = title;
  f["body"]["stringValue"]       = body;
  f["slotId"]["stringValue"]     = String((char)('A' + slotIdx));
  f["severity"]["stringValue"]   = severity;
  f["timestamp"]["stringValue"]  = iso;
  f["read"]["booleanValue"]      = false;

  char jsonBody[1024]; serializeJson(doc, jsonBody, sizeof(jsonBody));

  char url[256];
  snprintf(url, sizeof(url),
           FS_BASE "/devices/%s/alerts?documentId=%s&key=%s",
           DEVICE_ID, docId, FIREBASE_API_KEY);

  enqueueHttp(url, jsonBody, "POST");
  Serial.printf("[ALERT] Queued: %s — %s\n", type, title);
}

// ══════════════════════════════════════════════════════
// FIRESTORE — write dose event to /devices/{id}/doses
// When servo fires (hand detected), status = CONFIRMED automatically
// ══════════════════════════════════════════════════════
void writeDoseEvent(const char* eventType, int slotIdx) {
  char doseId[48];
  snprintf(doseId, sizeof(doseId), "dose_%c_%lu",
           'A' + slotIdx, (unsigned long)millis());

  char iso[28]; nowIso(iso, sizeof(iso));

  // Servo fired = hand was physically present = mark as CONFIRMED
  bool isConfirmed = (strcmp(eventType, "servo_dispatched") == 0);

  JsonDocument doc;
  JsonObject f = doc["fields"].to<JsonObject>();
  f["id"]["stringValue"]                = doseId;
  f["deviceId"]["stringValue"]          = DEVICE_ID;
  f["slotId"]["stringValue"]            = String((char)('A' + slotIdx));
  f["medicineName"]["stringValue"]      = slots[slotIdx].name;
  f["eventType"]["stringValue"]         = eventType;
  f["status"]["stringValue"]            = isConfirmed ? "CONFIRMED" : "ALERTING";
  f["scheduledTime"]["stringValue"]     = iso;
  f["confirmationTime"]["stringValue"]  = isConfirmed ? iso : "";
  f["confirmationSource"]["stringValue"]= isConfirmed ? "sensor_hand_detection" : "";
  f["servoActuated"]["booleanValue"]    = isConfirmed;
  f["handDetected"]["booleanValue"]     = isConfirmed;

  char jsonBody[1024]; serializeJson(doc, jsonBody, sizeof(jsonBody));

  char url[256];
  snprintf(url, sizeof(url),
           FS_BASE "/devices/%s/doses?documentId=%s&key=%s",
           DEVICE_ID, doseId, FIREBASE_API_KEY);

  enqueueHttp(url, jsonBody, "POST");
  Serial.printf("[DOSE] Written: %s status=%s\n",
                doseId, isConfirmed ? "CONFIRMED" : "ALERTING");
}

// ══════════════════════════════════════════════════════
// FIRESTORE — heartbeat PATCH
// ══════════════════════════════════════════════════════
void sendHeartbeat() {
  JsonDocument doc;
  JsonObject f = doc["fields"].to<JsonObject>();
  f["isOnline"]["booleanValue"]  = true;
  f["deviceId"]["stringValue"]   = DEVICE_ID;
  f["wifiRssi"]["integerValue"]  = String(WiFi.RSSI());

  char jsonBody[256]; serializeJson(doc, jsonBody, sizeof(jsonBody));

  char url[256];
  snprintf(url, sizeof(url),
           FS_BASE "/devices/%s"
           "?updateMask.fieldPaths=isOnline"
           "&updateMask.fieldPaths=wifiRssi"
           "&key=%s",
           DEVICE_ID, FIREBASE_API_KEY);

  enqueueHttp(url, jsonBody, "PATCH");
}

// ══════════════════════════════════════════════════════
// FIRESTORE — fetch schedule (blocking, done at startup & every 30s)
// Uses its own client so it can read the response body
// ══════════════════════════════════════════════════════
void fetchSchedule() {
  if (WiFi.status() != WL_CONNECTED) return;

  char url[256];
  snprintf(url, sizeof(url),
           FS_BASE "/devices/%s/slots?key=%s",
           DEVICE_ID, FIREBASE_API_KEY);

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(10);
  HTTPClient http;
  if (!http.begin(client, url)) return;

  int code = http.GET();
  Serial.printf("[Schedule] GET → %d\n", code);

  if (code == 200) {
    String body = http.getString();
    JsonDocument doc;
    if (!deserializeJson(doc, body) && doc["documents"].is<JsonArray>()) {
      int idx = 0;
      for (JsonObject d : doc["documents"].as<JsonArray>()) {
        if (idx >= 4) break;
        JsonObject fld = d["fields"];

        slots[idx].enabled   = fld["enabled"]["booleanValue"] | false;
        const char* nm       = fld["medicineName"]["stringValue"] | "Medicine";
        strncpy(slots[idx].name, nm, sizeof(slots[idx].name)-1);
        slots[idx].timeCount = 0;

        if (fld["times"]["arrayValue"]["values"].is<JsonArray>()) {
          for (JsonObject tv : fld["times"]["arrayValue"]["values"].as<JsonArray>()) {
            if (slots[idx].timeCount >= 8) break;
            const char* t = tv["stringValue"] | "";
            int h = 0, m = 0;
            if (sscanf(t, "%d:%d", &h, &m) == 2) {
              slots[idx].hours[slots[idx].timeCount]   = h;
              slots[idx].minutes[slots[idx].timeCount] = m;
              slots[idx].timeCount++;
            }
          }
        }
        Serial.printf("[Slot %d] %s — %s — %d time(s)\n",
                      idx, slots[idx].name,
                      slots[idx].enabled ? "ON" : "OFF",
                      slots[idx].timeCount);
        idx++;
      }
      scheduleOk = true;
    }
  }
  http.end();
}

// ══════════════════════════════════════════════════════
// WiFi
// ══════════════════════════════════════════════════════
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_NAME, WIFI_PASSWORD);
  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t < 12000UL) delay(250);
  if (WiFi.status() == WL_CONNECTED)
    Serial.println("[WiFi] " + WiFi.localIP().toString());
}

// ══════════════════════════════════════════════════════
// SENSOR
// ══════════════════════════════════════════════════════
float readDist() {
  digitalWrite(TRIG_PIN, LOW);  delayMicroseconds(3);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long p = pulseIn(ECHO_PIN, HIGH, 25000UL);
  return p == 0 ? -1 : p * 0.0343f / 2.0f;
}

// ══════════════════════════════════════════════════════
// DISPENSING
// ══════════════════════════════════════════════════════
void startDispensing(int idx) {
  activeSlot   = idx;
  currentAngle = CLOSED_ANGLE;
  servos[idx].write(currentAngle);
  digitalWrite(ledPins[idx], HIGH);
  digitalWrite(BUZZER_PIN, LOW);
  buzzerState  = false;
  servoMode    = SERVO_OPENING;
  lastServoStep= millis();
  mode         = DISPENSING;

  // Hand detected → servo fires → automatically CONFIRMED in Firestore
  writeDoseEvent("servo_dispatched", idx);

  // ── Auto-confirmed notification on phone ──
  char timeStr[12] = "this time";
  if (rtcOk) {
    DateTime n = rtc.now();
    snprintf(timeStr, sizeof(timeStr), "%02d:%02d", n.hour(), n.minute());
  }

  char title[64], body[128];
  snprintf(title, sizeof(title), "\u2705 Medicine Taken \u2014 Slot %c", 'A' + idx);
  snprintf(body, sizeof(body),
           "%s dispensed at %s. Marked TAKEN automatically (sensor confirmed).",
           slots[idx].name, timeStr);
  writeAlert("CONFIRMED", title, body, idx, "success");
}

void finishDispensing() {
  servos[activeSlot].write(CLOSED_ANGLE);
  digitalWrite(ledPins[activeSlot], LOW);

  // Mark this slot+time as taken so missed-dose won't fire
  if (activeTimeIdx >= 0 && rtcOk) {
    DateTime n = rtc.now();
    int key = (n.year()*10000 + n.month()*100 + n.day()) * 10 + activeTimeIdx;
    lastDoseDate[activeSlot]   = key;
    lastMissedDate[activeSlot] = key; // prevent missed alert
  }

  activeSlot   = -1;
  activeTimeIdx= -1;
  handReadings = 0;
  alertStartMs = 0;
  mode         = WAITING_FOR_HAND_CLEAR;
}

void updateServo() {
  if (mode != DISPENSING) return;
  unsigned long now = millis();
  if (servoMode == SERVO_OPENING && now - lastServoStep >= SERVO_STEP_MS) {
    lastServoStep = now;
    currentAngle  = min(currentAngle + 2, OPEN_ANGLE);
    servos[activeSlot].write(currentAngle);
    if (currentAngle >= OPEN_ANGLE) { servoMode = SERVO_HOLDING; servoHoldStart = now; }
  }
  if (servoMode == SERVO_HOLDING && now - servoHoldStart >= SERVO_HOLD_MS) {
    servoMode = SERVO_CLOSING; lastServoStep = now;
  }
  if (servoMode == SERVO_CLOSING && now - lastServoStep >= SERVO_STEP_MS) {
    lastServoStep = now;
    currentAngle  = max(currentAngle - 2, CLOSED_ANGLE);
    servos[activeSlot].write(currentAngle);
    if (currentAngle <= CLOSED_ANGLE) finishDispensing();
  }
}

// ══════════════════════════════════════════════════════
// BUZZER
// ══════════════════════════════════════════════════════
void updateBuzzer() {
  bool on = (mode == BEEPING_FOR_HAND) &&
            ((millis() % BEEP_PERIOD_MS) < BEEP_ON_MS);
  if (on != buzzerState) {
    buzzerState = on;
    digitalWrite(BUZZER_PIN, buzzerState ? HIGH : LOW);
  }
}

// ══════════════════════════════════════════════════════
// DOSE TIME CHECK — handles T-1min, T+0, T+1min
// ══════════════════════════════════════════════════════
void checkDoseTime() {
  if (!rtcOk || !scheduleOk) return;

  DateTime now  = rtc.now();
  int todayBase = (now.year()*10000 + now.month()*100 + now.day()) * 10;
  int curTotalMin = now.hour() * 60 + now.minute();

  for (int i = 0; i < 4; i++) {
    if (!slots[i].enabled) continue;

    for (int t = 0; t < slots[i].timeCount; t++) {
      int scheduledMin = slots[i].hours[t] * 60 + slots[i].minutes[t];
      int key          = todayBase + t;

      // ── T - 1 min: Upcoming notification ──────────────────────────────────
      if (curTotalMin == scheduledMin - 1 &&
          lastAdvanceDate[i] != key) {
        lastAdvanceDate[i] = key;

        char title[64], body[128];
        snprintf(title, sizeof(title), "💊 Medicine in 1 Minute — Slot %c", 'A' + i);
        snprintf(body,  sizeof(body),
                 "%s is due at %02d:%02d. Get ready!",
                 slots[i].name, slots[i].hours[t], slots[i].minutes[t]);
        writeAlert("REMINDER_UPCOMING", title, body, i, "info");
        Serial.printf("[NOTIFY] 1-min advance: Slot %c\n", 'A' + i);
      }

      // ── T + 0: Start beeping / alert ──────────────────────────────────────
      if (mode == WAITING_FOR_DOSE &&
          curTotalMin == scheduledMin &&
          lastDoseDate[i] != key) {

        activeSlot    = i;
        activeTimeIdx = t;
        alertStartMs  = millis();
        handReadings  = 0;
        mode          = BEEPING_FOR_HAND;
        digitalWrite(ledPins[i], HIGH);

        writeDoseEvent("reminder_started", i);
        Serial.printf("[DOSE] Alert: Slot %c (%s) %02d:%02d\n",
                      'A'+i, slots[i].name, slots[i].hours[t], slots[i].minutes[t]);
        return;
      }

      // ── T + 1 min: Missed dose notification ───────────────────────────────
      // Fires if: past 1 min, dose not taken, missed alert not sent yet
      if (curTotalMin == scheduledMin + 1 &&
          lastDoseDate[i] != key &&
          lastMissedDate[i] != key) {
        lastMissedDate[i] = key;

        // Also exit beeping mode if still active for this slot
        if (mode == BEEPING_FOR_HAND && activeSlot == i) {
          digitalWrite(ledPins[i], LOW);
          digitalWrite(BUZZER_PIN, LOW);
          buzzerState  = false;
          activeSlot   = -1;
          activeTimeIdx= -1;
          alertStartMs = 0;
          mode         = WAITING_FOR_DOSE;
        }

        char title[64], body[128];
        snprintf(title, sizeof(title), "⚠️ Missed Medicine — Slot %c", 'A' + i);
        snprintf(body,  sizeof(body),
                 "%s was due at %02d:%02d but was NOT taken. Please take it now!",
                 slots[i].name, slots[i].hours[t], slots[i].minutes[t]);
        writeAlert("MISSED_DOSE", title, body, i, "alert");
        Serial.printf("[NOTIFY] Missed dose: Slot %c\n", 'A' + i);
      }
    }
  }
}

// ══════════════════════════════════════════════════════
// OLED
// ══════════════════════════════════════════════════════
void updateDisplay() {
  if (!oledOk) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(0, 0); display.print("Smart Dispenser");
  display.setCursor(96, 0);
  display.print(WiFi.status() == WL_CONNECTED ? "WiFi" : "----");
  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

  if (rtcOk) {
    DateTime n = rtc.now();
    char tb[8]; snprintf(tb, sizeof(tb), "%02d:%02d", n.hour(), n.minute());
    display.setTextSize(2); display.setCursor(20, 13); display.print(tb);
  }

  display.setTextSize(1); display.setCursor(0, 36);
  switch (mode) {
    case BEEPING_FOR_HAND:
      display.print("> BRING HAND NEAR <");
      display.setCursor(0, 47);
      display.print(activeSlot >= 0 ? slots[activeSlot].name : "");
      break;
    case DISPENSING:
      display.print("  DISPENSING...");
      display.setCursor(0, 47);
      display.print(activeSlot >= 0 ? slots[activeSlot].name : "");
      break;
    case WAITING_FOR_HAND_CLEAR:
      display.print("Move hand away"); break;
    default:
      display.print(scheduleOk ? "All slots ready" : "Syncing...");
  }

  display.setCursor(0, 56); display.print("Dist: ");
  if (distanceCm < 0) display.print("--");
  else { display.print(distanceCm, 1); display.print("cm"); }

  display.display();
}

// ══════════════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200); delay(500);
  Serial.println("\n[BOOT] Smart Dispenser v3.3");

  pinMode(BUZZER_PIN, OUTPUT); digitalWrite(BUZZER_PIN, LOW);
  pinMode(TRIG_PIN,   OUTPUT); digitalWrite(TRIG_PIN,   LOW);
  pinMode(ECHO_PIN,   INPUT);
  for (int i = 0; i < 4; i++) {
    pinMode(ledPins[i], OUTPUT); digitalWrite(ledPins[i], LOW);
    servos[i].setPeriodHertz(50);
    servos[i].attach(servoPins[i], 500, 2400);
    servos[i].write(CLOSED_ANGLE);
  }

  Wire.begin(SDA_PIN, SCL_PIN);

  rtcOk = rtc.begin();
  if (rtcOk && rtc.lostPower()) rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  Serial.println(rtcOk ? "[RTC] OK" : "[RTC] Not found");

  oledOk = display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (oledOk) {
    display.clearDisplay(); display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(10,10); display.println("Smart Dispenser v3.3");
    display.setCursor(10,22); display.println("Shivraj Deshmukh");
    display.setCursor(10,36); display.println("Connecting WiFi...");
    display.display();
  }

  const char* def[4] = {"Medicine A","Medicine B","Medicine C","Medicine D"};
  for (int i = 0; i < 4; i++) {
    strncpy(slots[i].name, def[i], sizeof(slots[i].name)-1);
    slots[i].enabled = false; slots[i].timeCount = 0;
  }

  // Start background HTTP worker on Core 0
  jobMutex = xSemaphoreCreateMutex();
  xTaskCreatePinnedToCore(httpWorkerTask, "http_worker", 8192, NULL, 1, NULL, 0);

  connectWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    sendHeartbeat();
    fetchSchedule();
    lastSchedulePoll = millis();
  }

  Serial.println("[BOOT] Ready!");
}

// ══════════════════════════════════════════════════════
// LOOP
// ══════════════════════════════════════════════════════
void loop() {
  unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  // Periodic schedule sync
  if (now - lastSchedulePoll >= SCHEDULE_POLL_MS) {
    lastSchedulePoll = now;
    sendHeartbeat();
    fetchSchedule();
  }

  // Sensor
  if (now - lastSensorPoll >= SENSOR_POLL_MS) {
    lastSensorPoll = now;
    distanceCm     = readDist();
    bool near      = (distanceCm > 0 && distanceCm <= HAND_DIST_CM);

    if (mode == BEEPING_FOR_HAND) {
      handReadings = near ? handReadings + 1 : 0;
      if (handReadings >= HAND_READINGS_NEEDED && activeSlot >= 0)
        startDispensing(activeSlot);
    } else if (mode == WAITING_FOR_HAND_CLEAR) {
      handReadings = near ? 0 : handReadings + 1;
      if (handReadings >= HAND_READINGS_NEEDED) {
        mode = WAITING_FOR_DOSE; handReadings = 0;
      }
    }
  }

  checkDoseTime();
  updateBuzzer();
  updateServo();

  if (now - lastDisplayUpdate >= 500UL) {
    lastDisplayUpdate = now;
    updateDisplay();
  }

  delay(5);
}
