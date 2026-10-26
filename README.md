# 💊 Smart Medicine Dispenser — IoT & Cloud Healthcare Ecosystem

[![Author](https://img.shields.io/badge/Author-Shivraj%20Deshmukh-blue.svg)](https://github.com/sadmsd707)
[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-ESP32%20%7C%20Flutter%20%7C%20Firebase-green.svg)](#)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)](#)

> An automated, cloud-connected medical adherence ecosystem designed and developed by **Shivraj Deshmukh**. Built with ESP32 edge microcontroller hardware, real-time Google Firebase infrastructure, and a native Flutter Android application.

---

## 📖 Overview

The **Smart Medicine Dispenser** is an automated, tamper-resilient healthcare system engineered to eliminate missed dosages, ensure punctual medication dispensing, and keep caregivers actively notified anywhere in the world in real-time.

### System Components
1. **ESP32 Edge Microcontroller Hardware**: 4 motorized compartments (Servos A–D), HC-SR04 ultrasonic hand-wave proximity sensor, DS3231 RTC clock for offline reliability, 0.96" SSD1306 OLED display, and audio/visual alarms.
2. **Native Android Flutter Application**: Real-time 0-second synchronization with Cloud Firestore, bilingual support (**English** & **मराठी - Marathi**), caregiver adherence dashboard, schedule manager, and accessible one-tap dose confirmation.
3. **Google Firebase Cloud Infrastructure**: Cloud Firestore NoSQL Database, Cloud Functions v2 HTTPS REST API, 1-minute automated scheduled adherence watchers, and Firebase Cloud Messaging (FCM v1) high-priority push notifications.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│              ESP32 Edge Hardware Unit                  │
│  - DS3231 I2C Real-Time Clock (Offline Precision)      │
│  - 4x Motorized Slots (SG90 Servos A, B, C, D)         │
│  - HC-SR04 Ultrasonic Hand Proximity Sensor           │
│  - 0.96" SSD1306 OLED Display (128x64)                 │
│  - NVS Flash Non-Volatile Memory (Offline Schedule)    │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS + Bearer Token Auth
                            ▼
┌────────────────────────────────────────────────────────┐
│             Firebase Cloud Infrastructure              │
│                                                        │
│  ┌────────────────────────┐   ┌─────────────────────┐  │
│  │   Cloud Functions API  │   │ Scheduled Watcher   │  │
│  │ - /api/device/pair     │   │ - 1-Minute Cron Job │  │
│  │ - /api/device/:id/sched│   │ - 15m Grace Watcher │  │
│  │ - /api/device/:id/event│   │ - Offline Detector  │  │
│  │ - /api/confirm-dose    │   └──────────┬──────────┘  │
│  └───────────┬────────────┘              │             │
│              ▼                           ▼             │
│  ┌──────────────────────────────────────────────────┐  │
│  │               Cloud Firestore DB                 │  │
│  │ - devices/{id}                                   │  │
│  │   ├─ slots/ (Schedules, Names, Quantities)       │  │
│  │   ├─ doses/ (Tamper-proof 6-State Audit Trail)   │  │
│  │   ├─ events/ (Idempotent Hardware Event Log)     │  │
│  │   └─ alerts/ (Instant Caregiver Dispatches)      │  │
│  └───────────────────────────┬──────────────────────┘  │
│                              │                         │
│  ┌───────────────────────────▼──────────────────────┐  │
│  │          Firebase Cloud Messaging (FCM v1)       │  │
│  │ - Heads-Up High-Priority Alert Broadcast         │  │
│  └───────────────────────────┬──────────────────────┘  │
└──────────────────────────────┼─────────────────────────┘
                               │ Real-Time Firestore Snapshots & FCM
                               ▼
┌────────────────────────────────────────────────────────┐
│              Flutter Android Native App                │
│ - Instant 0-second live sync with Firestore            │
│ - English & Marathi (मराठी) one-tap language switcher  │
│ - 4 Configurable medicine slot cards & schedules       │
│ - Accessible "I Took This Medicine" confirmation       │
│ - Caregiver real-time adherence analytics & history    │
└────────────────────────────────────────────────────────┘
```

---

## ⚖️ The Strict Truthfulness Rule

> [!IMPORTANT]
> **Truthfulness Rule**: The HC-SR04 ultrasonic sensor detects hand proximity near the dispenser nozzle; **it does not prove that a pill was dispensed or swallowed**. 
> - **Never infer "Taken" from sensor or servo movement.**
> - When the patient waves their hand, the dispenser actuates the servo, logs `servo_dispatched`, and transitions the dose state to **"Dispensed (Hand Detected)"**.
> - Adherence is confirmed **ONLY** when the patient explicitly taps **"I took this medicine" ("मी औषध घेतले")** in the app.
> - If no confirmation is recorded within the configured grace period (default: 15 minutes), the Firebase Scheduled Function flags the dose as **"Missed confirmation" / "Not confirmed"**, never a medically verified "Not taken".

---

## 🔌 Hardware Pinout & Wiring Specifications

| Component | Pin Function | ESP32 GPIO | Description |
|---|---|---|---|
| **OLED (SSD1306) & RTC** | SDA | `GPIO 21` | I2C Data bus (shared) |
| **OLED (SSD1306) & RTC** | SCL | `GPIO 22` | I2C Clock bus (shared) |
| **Servo Slot A** | PWM Signal | `GPIO 16` | Motorized Dispenser Slot A |
| **Servo Slot B** | PWM Signal | `GPIO 17` | Motorized Dispenser Slot B |
| **Servo Slot C** | PWM Signal | `GPIO 18` | Motorized Dispenser Slot C |
| **Servo Slot D** | PWM Signal | `GPIO 19` | Motorized Dispenser Slot D |
| **LED Slot A** | Digital Output | `GPIO 4` | Slot A Active Indicator |
| **LED Slot B** | Digital Output | `GPIO 2` | Slot B Active Indicator |
| **LED Slot C** | Digital Output | `GPIO 15` | Slot C Active Indicator |
| **LED Slot D** | Digital Output | `GPIO 13` | Slot D Active Indicator |
| **HC-SR04 Ultrasonic** | TRIG | `GPIO 5` | Proximity Trigger Pulse |
| **HC-SR04 Ultrasonic** | ECHO | `GPIO 3` (RX0) | Echo Pulse Measurement |
| **Active Buzzer** | Audio Output | `GPIO 23` | Audible Alarm & Chimes |

---

## 📡 ESP32 Firmware Setup ([`firmware/esp32_dispenser.ino`](firmware/esp32_dispenser.ino))

### 1. Flash to ESP32
1. Open [`firmware/esp32_dispenser.ino`](firmware/esp32_dispenser.ino) in Arduino IDE.
2. Install required libraries via Library Manager:
   - `ArduinoJson` (v6 or v7)
   - `RTClib` (by Adafruit)
   - `Adafruit SSD1306` & `Adafruit GFX Library`
   - `ESP32Servo`
3. Configure your local Wi-Fi SSID, Wi-Fi password, and Firebase Project details in the configuration section.
4. Select board: **ESP32 Dev Module** and flash via USB.

### 2. Captive Portal Wi-Fi Provisioning
1. Power up the ESP32. If not yet connected to Wi-Fi, it automatically creates a setup hotspot:
   - **SSID:** `SmartDispenser-Setup`
2. Connect using any smartphone. A captive portal page appears automatically (or browse to `http://192.168.4.1`).
3. Select your local Wi-Fi, enter password, and save.
4. Settings are permanently preserved in **ESP32 NVS Flash** memory across power cycles.

---

## 📱 Flutter Android Application ([`flutter_app/`](flutter_app/))

### Features
- **Zero-Latency Real-Time Sync**: Uses Firestore streams (`.snapshots()`) for immediate UI updates without polling.
- **Bilingual Interface**: Built-in instant toggle between **English** and **मराठी (Marathi)** for senior accessibility.
- **Offline Mode**: Local caching with `shared_preferences` and SQLite persistence so the app operates smoothly even during connectivity loss.

### Setup & Local Build
1. Copy the example configuration template:
   ```bash
   cp flutter_app/android/app/google-services.json.example flutter_app/android/app/google-services.json
   ```
2. Insert your Firebase credentials into `google-services.json`.
3. Build the application:
   ```powershell
   cd flutter_app
   flutter pub get
   flutter build apk --release
   ```

---

## ☁️ Firebase Cloud Infrastructure ([`functions/`](functions/))

### Services Used
- **Cloud Firestore**: Real-time NoSQL store with granular security rules ([`firestore.rules`](firestore.rules)).
- **Cloud Functions v2**: Express REST API endpoint for secure ESP32 and mobile client interaction.
- **Scheduled Watcher**: Automated 1-minute cron task that enforces grace periods and flags unconfirmed dosages.
- **Firebase Cloud Messaging (FCM v1)**: Multicast push notifications to registered caregiver device tokens.

### Deployment Commands
```powershell
# 1. Login to Firebase CLI
firebase login

# 2. Select target project
firebase use your-firebase-project-id

# 3. Deploy Firestore Rules and Indexes
firebase deploy --only firestore

# 4. Deploy Cloud Functions
firebase deploy --only functions
```

---

## 💻 Standalone Node.js Backend Alternative ([`backend/`](backend/))

For deployments preferring a private on-premise or local network server:
```powershell
cd backend
npm install
npm start
```
Runs an Express REST server on port `3000` with SSE real-time events, schedule persistence, and caregiver notifications.

---

## 📄 License & Copyright

**Copyright © 2026 Shivraj Deshmukh. All Rights Reserved.**

This software, firmware, schematics, and mobile application are the proprietary intellectual property of **Shivraj Deshmukh**.

All rights are reserved. No part of this project may be copied, modified, distributed, reverse-engineered, or used for commercial purposes without prior express written permission from the author.

For inquiries, contact **Shivraj Deshmukh** via GitHub: [@sadmsd707](https://github.com/sadmsd707).
