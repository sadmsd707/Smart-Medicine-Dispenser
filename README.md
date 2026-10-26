# 💊 Smart Medicine Dispenser

> **Automated IoT & Cloud Healthcare Ecosystem for Scheduled Medication Dispensation, Real-Time Adherence Tracking & Caregiver Alerts**

[![ESP32](https://img.shields.io/badge/ESP32-Espressif-E7352C?style=flat-square&logo=espressif&logoColor=white)](https://www.espressif.com/)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?style=flat-square&logo=flutter&logoColor=white)](https://flutter.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Functions-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![C++](https://img.shields.io/badge/C++-Embedded-00599C?style=flat-square&logo=cplusplus&logoColor=white)](https://isocpp.org/)
[![Arduino](https://img.shields.io/badge/Arduino-Framework-00979D?style=flat-square&logo=arduino&logoColor=white)](https://www.arduino.cc/)

**Smart Medicine Dispenser** is a modern, high-performance IoT and cloud-connected healthcare solution engineered for patients, caregivers, and medical assistants to ensure punctual, tamper-resilient medication adherence. It combines ESP32 edge microcontroller hardware with servo-driven multi-compartment dispensing, offline precision real-time clock synchronization, non-contact ultrasonic hand detection, and an instant zero-latency Flutter Android mobile app backed by Google Cloud Firestore and Cloud Functions.

---

## ✨ Features

- **🎯 Multi-Compartment Motorized Dispensing**:
  - 4 independently controlled compartments (Slots A, B, C, D) actuated by SG90 micro-servos.
  - Dedicated active indicator LEDs for each compartment to visually guide seniors and patients.
  - Non-volatile storage (ESP32 NVS Flash) caches dosage schedules for 100% offline autonomy.
- **⏱️ Precision Offline RTC Synchronization**:
  - Integrated DS3231 I2C Real-Time Clock with coin battery backup maintains millisecond-accurate scheduling without internet dependency.
  - Automatic time synchronization and drift correction whenever Wi-Fi is available.
- **📡 Touchless Proximity Dispensing**:
  - Non-contact HC-SR04 ultrasonic sensor dispenses medication when a hand is waved within 10 cm.
  - Integrated 0.96" SSD1306 OLED display provides visual cues, slot labels, and animated feedback.
  - Audible chime alarm using an active buzzer with distinctive tones for due medicines and warnings.
- **📱 Native Flutter Mobile Application**:
  - Real-time 0-second bidirectional sync using Cloud Firestore reactive snapshot streams (`.snapshots()`).
  - Bilingual UI with one-tap toggle between **English** and **मराठी (Marathi)** for elderly convenience.
  - Prominent high-contrast "I Took This Medicine" confirmation button for senior accessibility.
  - Comprehensive Caregiver Dashboard with adherence tracking, slot configuration, and dose history.
- **☁️ Cloud Adherence & Notification Engine**:
  - Firebase Cloud Functions v2 REST API for authenticated edge and mobile communication.
  - 1-minute automated scheduled watcher (`scheduledDoseWatcher`) monitoring adherence and device heartbeats.
  - High-priority Heads-Up Android alerts dispatched via Firebase Cloud Messaging (FCM v1).
- **⚖️ Strict Medical Truthfulness Architecture**:
  - Hardware separation: Hand wave & servo movement logs `servo_dispatched` (Dispensed state), **not** "Taken".
  - Adherence is strictly confirmed only when the patient explicitly acknowledges consumption in the app.
  - Unconfirmed doses transition to "Missed Confirmation" after a configurable grace period (default 15 mins).

---

## 🛠️ Tech Stack

### Embedded Hardware & Firmware
- **Microcontroller**: ESP32-WROOM-32 (Dual Core 240MHz, Wi-Fi & BLE)
- **Language & Framework**: C++ / Arduino Core for ESP32
- **Sensors & Actuators**: HC-SR04 Ultrasonic Sensor, DS3231 I2C RTC, 4x SG90 Micro Servos, Active Buzzer
- **Display**: 0.96" I2C SSD1306 Monochrome OLED (128x64)
- **Key Libraries**: `ESP32Servo`, `RTClib`, `Adafruit_SSD1306`, `Adafruit_GFX`, `ArduinoJson`

### Mobile Application
- **Framework**: [Flutter](https://flutter.dev/) (Dart 3.x)
- **State Management**: [Provider](https://pub.dev/packages/provider)
- **Cloud Backend SDK**: [Cloud Firestore](https://pub.dev/packages/cloud_firestore) & [Firebase Core](https://pub.dev/packages/firebase_core)
- **Push Notifications**: [Firebase Cloud Messaging (FCM)](https://pub.dev/packages/firebase_messaging) & [flutter_local_notifications](https://pub.dev/packages/flutter_local_notifications)
- **Local Persistence**: `shared_preferences` & offline caching

### Cloud Infrastructure & Backend
- **Cloud Provider**: Google Cloud / Firebase (Blaze / Spark)
- **Database**: Cloud Firestore (NoSQL Native Document Store)
- **Serverless Compute**: Firebase Cloud Functions v2 (Node.js 20 runtime)
- **API Framework**: Express 4 with CORS & Token Authorization
- **Scheduled Tasks**: Cloud Scheduler (1-minute adherence & offline cron job)
- **Push Delivery**: Firebase Admin SDK (FCM v1 HTTP/v1 API)

### Standalone Local Backend (Alternative)
- **Server**: Node.js & Express 4
- **Real-time Stream**: Server-Sent Events (SSE)
- **Data Persistence**: File-backed JSON store (`backend/dispenser_state.json`)

---

## 📁 Project Structure

```text
Medicine Dispensor/
├── firmware/
│   └── esp32_dispenser.ino     # Complete ESP32 C++ firmware (Wi-Fi, RTC, Servos, OLED, API)
├── flutter_app/                # Production Flutter Android mobile application
│   ├── android/                # Android native project configuration & gradle scripts
│   │   └── app/
│   │       ├── build.gradle.kts
│   │       └── google-services.json.example # Firebase configuration template
│   ├── lib/
│   │   ├── localization/
│   │   │   └── app_strings.dart       # English & Marathi (मराठी) bilingual localization
│   │   ├── models/                    # Data models (MedicineSlot, DoseRecord, Alert)
│   │   ├── providers/                 # DispenserProvider state management
│   │   ├── screens/                   # Patient Home, Caregiver Dashboard, Pairing, Slot Editor
│   │   ├── services/                  # FirestoreService, ApiService, StorageService
│   │   ├── widgets/                   # SlotCard, StatusHeader, ConfirmationBanner
│   │   ├── firebase_options.dart      # FlutterFire client configuration
│   │   └── main.dart                  # Mobile application entry point
│   └── pubspec.yaml            # Flutter dependencies and assets
├── functions/                  # Firebase Cloud Functions v2 backend
│   ├── index.js                # Express REST API, Scheduled Watcher & FCM Push Engine
│   ├── migrate.js              # Firestore database seeder & migration script
│   └── package.json            # Cloud Functions Node.js dependencies
├── backend/                    # Standalone Node.js Express server (Local Network alternative)
│   ├── dispenser_state.json    # Local state store & seed records
│   ├── render.yaml             # Render cloud deployment configuration
│   ├── server.js               # Express API with SSE events & schedule manager
│   └── package.json
├── src/                        # Shared web components & React dashboard
│   ├── components/             # CompartmentCard, AdherenceView, Header, Modals
│   ├── context/                # DispenserContext state provider
│   └── types/                  # TypeScript interface definitions
├── .gitignore                  # Git ignore rules for keys, secrets, and binaries
├── firebase.json               # Firebase deployment configuration
├── firestore.indexes.json      # Firestore composite indexes
├── firestore.rules             # Firestore security rules
├── LICENSE                     # Proprietary software license
├── package.json                # Root package configuration
├── README.md                   # Project documentation
└── tsconfig.json               # TypeScript compiler configuration
```

---

## 🔌 Hardware Pinout & Wiring Specifications

| Component | Pin Function | ESP32 GPIO | Description |
|---|---|---|---|
| **OLED (SSD1306) & RTC** | SDA | `GPIO 21` | I2C Data bus (shared between OLED and DS3231) |
| **OLED (SSD1306) & RTC** | SCL | `GPIO 22` | I2C Clock bus (shared between OLED and DS3231) |
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

## 🚀 Getting Started

### Prerequisites

- [Arduino IDE](https://www.arduino.cc/en/software) with **ESP32 Board Support** installed
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (version **3.22.x** or higher)
- [Node.js](https://nodejs.org/) (version **20.x** recommended)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)

---

### Installation & Setup

#### 1. Hardware Firmware Setup
1. Open [`firmware/esp32_dispenser.ino`](firmware/esp32_dispenser.ino) in Arduino IDE.
2. Install required Arduino libraries:
   - `ArduinoJson`
   - `RTClib`
   - `Adafruit SSD1306` & `Adafruit GFX Library`
   - `ESP32Servo`
3. Set your Wi-Fi credentials and Firebase endpoint in the configuration section:
   ```cpp
   const char* WIFI_NAME     = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   const char* FIREBASE_API_KEY = "YOUR_FIREBASE_API_KEY";
   ```
4. Connect your ESP32 board via USB, select **ESP32 Dev Module**, and click **Upload**.

#### 2. Captive Portal Wi-Fi Provisioning (Optional)
If Wi-Fi credentials are not hardcoded:
1. Power up the ESP32. It will automatically broadcast a setup hotspot named **`SmartDispenser-Setup`**.
2. Connect from any mobile phone or PC and open `http://192.168.4.1`.
3. Select your local home Wi-Fi network, enter password, and submit. The credentials are permanently stored in ESP32 NVS Flash memory.

#### 3. Firebase Cloud Deployment
1. Log in to Firebase CLI:
   ```bash
   firebase login
   ```
2. Select your Firebase project:
   ```bash
   firebase use your-project-id
   ```
3. Deploy Firestore rules and indexes:
   ```bash
   firebase deploy --only firestore
   ```
4. Deploy Cloud Functions (REST API & Scheduled Watcher):
   ```bash
   firebase deploy --only functions
   ```

#### 4. Flutter Mobile App Configuration & Build
1. Set up the Android configuration:
   ```bash
   cp flutter_app/android/app/google-services.json.example flutter_app/android/app/google-services.json
   ```
2. Open `flutter_app/android/app/google-services.json` and insert your Firebase project details.
3. Install dependencies and compile the APK:
   ```bash
   cd flutter_app
   flutter pub get
   flutter build apk --release
   ```
   The compiled APK will be located at `flutter_app/build/app/outputs/flutter-apk/app-release.apk`.

---

## 💻 Running the Application

### 1. Start the Standalone Local Backend (Optional)
If running without Firebase:
```bash
cd backend
npm install
npm start
```
The server will start on `http://localhost:3000` (or `PORT=3000`), serving REST endpoints and SSE real-time event broadcasts.

### 2. Device Operation Workflow
1. **Scheduled Alarm**: At scheduled medication time, the ESP32 sounds the buzzer, flashes the designated slot LED, and displays the medicine name on the OLED screen.
2. **Touchless Dispense**: The patient waves their hand over the ultrasonic sensor (< 10 cm). The servo opens the compartment and reports `servo_dispatched` to the cloud.
3. **App Confirmation**: The patient taps **"I Took This Medicine"** in the Flutter app to confirm adherence.
4. **Caregiver Notification**: If no confirmation is logged within 15 minutes, the Cloud Function flags the dose as missed and dispatches an urgent push notification to caregivers.

---

## 📡 API Reference Overview

The Cloud Functions and backend expose the following REST API endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Healthcheck and server status |
| `POST` | `/device/pair` | Secure device pairing with authentication token issuance |
| `GET` | `/device/:id` | Retrieve dispenser telemetry, battery, and online status |
| `GET` | `/device/:id/schedule` | Retrieve complete 4-slot medicine schedules |
| `PUT` | `/device/:id/schedule` | Update slot timing, dosage description, and pill count |
| `GET` | `/esp32/schedule` | Lightweight compact schedule payload for microcontroller sync |
| `POST` | `/device/:id/events` | Ingest hardware events (`reminder_started`, `hand_detected`, `servo_dispatched`) |
| `POST` | `/confirm-dose` | Explicit patient adherence confirmation from mobile app |
| `GET` | `/device/:id/doses` | Retrieve daily dose audit trail and adherence history |
| `POST` | `/device/:id/fcm-token` | Register or update caregiver Firebase Cloud Messaging push token |

---

## 🔒 Copyright & Ownership

Copyright © 2026 Shivraj Deshmukh. All Rights Reserved.  
This project is proprietary software developed by Shivraj Deshmukh. Unauthorized copying, distribution, or commercial use is strictly prohibited.
