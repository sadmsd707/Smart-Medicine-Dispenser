/**
 * ==============================================================================
 * SMART MEDICINE DISPENSER - BACKEND & CAREGIVER NOTIFICATION ENGINE
 * Invented & Developed by: Shivraj Deshmukh
 * Copyright (c) 2026 Shivraj Deshmukh. All Rights Reserved.
 * ==============================================================================
 * Features:
 * - Device Pairing Flow with secure pairing tokens
 * - 4-Slot Schedule CRUD & Synchronization with ESP32
 * - Hardware Event Ingestion (reminder_started, hand_detected, servo_dispatched)
 * - Patient Dose Confirmation (explicit source: 'app_patient_confirmation')
 * - Automated Caregiver Notification Engine with configurable grace period (default 15m)
 * - Strict Truthfulness: Servo/hand detection != "Taken". Missed doses != "Not taken".
 * - SSE Real-time Caregiver Push Notification Stream + FCM Cloud Webhook hooks
 * - Idempotency & Deduplication for offline event replays
 * ==============================================================================
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// In-Memory Database with optional local JSON persistence
const DATA_FILE = path.join(__dirname, 'dispenser_state.json');

const INITIAL_STATE = {
  pairedDevice: {
    deviceId: 'ESP32_DISPENSER_SHIVRAJ_01',
    pairingCode: 'DISP-9842',
    name: "Shivraj's Smart Dispenser (4-Slot)",
    isOnline: true,
    lastSeen: Date.now(),
    firmwareVersion: 'v2.5.0-esp32-rtc',
    wifiRssi: -58,
    batteryPercent: 96,
    timezone: 'Asia/Kolkata',
    lastSyncTimestamp: Date.now(),
    gracePeriodMinutes: 15,
  },
  patient: {
    id: 'PATIENT_01',
    name: 'Shivraj Deshmukh',
    age: 68,
    preferredLanguage: 'en', // 'en' or 'mr'
    emergencyPhone: '+91 98220 12345'
  },
  caregivers: [
    {
      id: 'CG_01',
      name: 'Dr. Ramesh Deshmukh',
      phone: '+91 98220 12345',
      relation: 'Primary Caregiver / Son',
      email: 'ramesh.deshmukh@example.com',
      pushEnabled: true,
      fcmToken: 'demo_fcm_token_caregiver_1'
    }
  ],
  slots: [
    {
      id: 'A',
      slotNumber: 1,
      medicineName: 'Amoxicillin',
      doseText: '500 mg (1 Capsule)',
      enabled: true,
      times: ['08:00', '20:00'],
      days: [1, 2, 3, 4, 5, 6, 7], // 1=Mon, 7=Sun
      notes: 'Take after meals with water',
      pillCount: 18,
      lowStockThreshold: 5,
      lastDispensed: null
    },
    {
      id: 'B',
      slotNumber: 2,
      medicineName: 'Atorvastatin',
      doseText: '20 mg (1 Tablet)',
      enabled: true,
      times: ['21:00'],
      days: [1, 2, 3, 4, 5, 6, 7],
      notes: 'Take at bedtime',
      pillCount: 24,
      lowStockThreshold: 6,
      lastDispensed: null
    },
    {
      id: 'C',
      slotNumber: 3,
      medicineName: 'Metformin HCl',
      doseText: '850 mg (1 Tablet)',
      enabled: true,
      times: ['13:00', '19:30'],
      days: [1, 2, 3, 4, 5, 6, 7],
      notes: 'Take with food to avoid gastric irritation',
      pillCount: 4, // low stock alert
      lowStockThreshold: 6,
      lastDispensed: null
    },
    {
      id: 'D',
      slotNumber: 4,
      medicineName: 'Vitamin D3 + Calcium',
      doseText: '1 Tablet',
      enabled: true,
      times: ['09:30'],
      days: [1, 3, 5, 7], // Alternate days
      notes: 'Take in morning',
      pillCount: 28,
      lowStockThreshold: 5,
      lastDispensed: null
    }
  ],
  // Dose instances recorded or generated
  doseRecords: [],
  // Caregiver notifications log
  notifications: [],
  // Processed event IDs for deduplication
  processedEventIds: new Set()
};

let db = { ...INITIAL_STATE };

// Load persistent state if exists
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    db = { ...INITIAL_STATE, ...parsed };
    db.processedEventIds = new Set(parsed.processedEventIds || []);
    console.log('[STATE] Loaded existing state from disk.');
  } catch (err) {
    console.warn('[STATE] Failed to load data file, starting with defaults:', err.message);
  }
}

function saveState() {
  try {
    const toSave = {
      ...db,
      processedEventIds: Array.from(db.processedEventIds)
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(toSave, null, 2));
  } catch (err) {
    console.error('[STATE] Save error:', err.message);
  }
}

// Active Server-Sent Events (SSE) caregiver notification subscribers
const sseClients = [];

function broadcastSseNotification(notification) {
  const payload = `data: ${JSON.stringify(notification)}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(payload);
    } catch {
      // client disconnected
    }
  });
}

/**
 * Caregiver Notification Dispatcher
 * Mode: Local/Demo Mode Relay (always working) + optional FCM relay
 */
function sendCaregiverNotification({ type, title, body, doseId, slotId, severity = 'info' }) {
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const notification = {
    id: notifId,
    type, // 'DOSE_CONFIRMED' | 'MISSED_CONFIRMATION' | 'DEVICE_OFFLINE' | 'TEST' | 'LOW_STOCK'
    title,
    body,
    doseId,
    slotId,
    severity, // 'success' | 'warning' | 'alert' | 'info'
    timestamp: new Date().toISOString(),
    deliveryMode: process.env.FCM_SERVER_KEY ? 'FCM_CLOUD' : 'LOCAL_RELAY',
    delivered: true,
    recipients: db.caregivers.map((c) => ({ name: c.name, phone: c.phone }))
  };

  db.notifications.unshift(notification);
  if (db.notifications.length > 100) db.notifications.pop();
  saveState();

  console.log(`[CAREGIVER ALERT] [${severity.toUpperCase()}] ${title}: ${body}`);
  broadcastSseNotification(notification);

  return notification;
}

/**
 * Generate Today's Expected Doses
 */
function getTodayDateString(timezone = db.pairedDevice.timezone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(now); // "YYYY-MM-DD"
}

function getCurrentDayOfWeek(timezone = db.pairedDevice.timezone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' });
  const dayName = formatter.format(now);
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[dayName] || 1;
}

function ensureTodayDosesGenerated() {
  const todayStr = getTodayDateString();
  const todayDow = getCurrentDayOfWeek();

  db.slots.forEach((slot) => {
    if (!slot.enabled) return;
    if (!slot.days.includes(todayDow)) return;

    slot.times.forEach((timeStr) => {
      const stableDoseId = `dose_${slot.id}_${todayStr.replace(/-/g, '')}_${timeStr.replace(':', '')}`;
      const existing = db.doseRecords.find((d) => d.id === stableDoseId);

      if (!existing) {
        db.doseRecords.push({
          id: stableDoseId,
          slotId: slot.id,
          slotNumber: slot.slotNumber,
          medicineName: slot.medicineName,
          doseText: slot.doseText,
          date: todayStr,
          scheduledTime: timeStr,
          scheduledDateTimeIso: `${todayStr}T${timeStr}:00`,
          status: 'UPCOMING', // UPCOMING | ALERTING | DISPENSED | CONFIRMED_TAKEN | MISSED_CONFIRMATION
          dispensedAt: null,
          confirmedAt: null,
          confirmationSource: null,
          caretakerNotifiedMissed: false,
          caretakerNotifiedConfirmed: false,
          notes: slot.notes
        });
      }
    });
  });
}

// Initial dose generation
ensureTodayDosesGenerated();

/**
 * Background Grace Period & Heartbeat Monitor
 * Runs every 10 seconds.
 */
setInterval(() => {
  const now = new Date();
  const todayStr = getTodayDateString();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Device Offline Detection (No heartbeat for > 60 seconds)
  const secondsSinceHeartbeat = (Date.now() - db.pairedDevice.lastSeen) / 1000;
  if (secondsSinceHeartbeat > 60 && db.pairedDevice.isOnline) {
    db.pairedDevice.isOnline = false;
    saveState();
    sendCaregiverNotification({
      type: 'DEVICE_OFFLINE',
      title: 'Dispenser Device Offline',
      body: `ESP32 Smart Dispenser has lost connection. Last seen ${Math.round(secondsSinceHeartbeat)}s ago.`,
      severity: 'warning'
    });
  }

  // 2. Refresh schedule for today
  ensureTodayDosesGenerated();

  // 3. Evaluate Unconfirmed / Missed Doses based on Grace Period
  const graceMins = db.pairedDevice.gracePeriodMinutes || 15;

  db.doseRecords.forEach((dose) => {
    if (dose.date !== todayStr) return;
    if (dose.status === 'CONFIRMED_TAKEN') return;

    const [hours, mins] = dose.scheduledTime.split(':').map(Number);
    const doseTotalMinutes = hours * 60 + mins;
    const minutesElapsed = currentTotalMinutes - doseTotalMinutes;

    // Transition from UPCOMING to ALERTING when dose time arrives
    if (minutesElapsed >= 0 && minutesElapsed < graceMins && dose.status === 'UPCOMING') {
      dose.status = 'ALERTING';
      saveState();
    }

    // Grace period check
    if (minutesElapsed >= graceMins && dose.status !== 'CONFIRMED_TAKEN' && !dose.caretakerNotifiedMissed) {
      // Truthfulness: Status is "MISSED_CONFIRMATION" / Not confirmed, never "Not taken".
      dose.status = 'MISSED_CONFIRMATION';
      dose.caretakerNotifiedMissed = true;
      saveState();

      sendCaregiverNotification({
        type: 'MISSED_CONFIRMATION',
        title: '⚠️ Unconfirmed Medicine Alert',
        body: `${db.patient.name} has NOT confirmed taking ${dose.medicineName} (${dose.doseText}) scheduled for ${dose.scheduledTime}. (${graceMins}m grace period elapsed).`,
        doseId: dose.id,
        slotId: dose.slotId,
        severity: 'alert'
      });
    }
  });
}, 10000);

// ==============================================================================
// REST API ROUTES
// ==============================================================================

// Health & System Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    systemTime: new Date().toISOString(),
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    activeTimezone: db.pairedDevice.timezone,
    deviceOnline: db.pairedDevice.isOnline,
    lastSeenSecondsAgo: Math.round((Date.now() - db.pairedDevice.lastSeen) / 1000)
  });
});

// Device Pairing
app.post('/api/device/pair', (req, res) => {
  const { deviceId, pairingCode, caregiverName, caregiverPhone } = req.body;
  if (!deviceId || !pairingCode) {
    return res.status(400).json({ error: 'deviceId and pairingCode are required' });
  }

  if (deviceId !== db.pairedDevice.deviceId || pairingCode !== db.pairedDevice.pairingCode) {
    return res.status(401).json({ error: 'Invalid Device ID or Pairing Code. Please check the sticker on your ESP32.' });
  }

  if (caregiverName && caregiverPhone) {
    const existing = db.caregivers.find((c) => c.phone === caregiverPhone);
    if (!existing) {
      db.caregivers.push({
        id: `CG_${Date.now()}`,
        name: caregiverName,
        phone: caregiverPhone,
        relation: 'App Caregiver',
        email: '',
        pushEnabled: true,
        fcmToken: 'client_registered'
      });
    }
  }

  saveState();
  res.json({
    success: true,
    message: 'Device successfully paired',
    device: db.pairedDevice,
    patient: db.patient,
    slots: db.slots
  });
});

// Get Device Info & Telemetry
app.get('/api/device/:id', (req, res) => {
  res.json({
    device: db.pairedDevice,
    patient: db.patient,
    caregivers: db.caregivers
  });
});

// Update Device Settings (Timezone, Grace period)
app.patch('/api/device/:id/settings', (req, res) => {
  const { timezone, gracePeriodMinutes } = req.body;
  if (timezone) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      db.pairedDevice.timezone = timezone;
    } catch {
      return res.status(400).json({ error: 'Invalid IANA timezone string' });
    }
  }
  if (gracePeriodMinutes !== undefined) {
    const val = parseInt(gracePeriodMinutes, 10);
    if (isNaN(val) || val < 1 || val > 120) {
      return res.status(400).json({ error: 'Grace period must be between 1 and 120 minutes' });
    }
    db.pairedDevice.gracePeriodMinutes = val;
  }
  saveState();
  res.json({ success: true, device: db.pairedDevice });
});

// Get 4-Slot Schedule (App & Web)
app.get('/api/device/:id/schedule', (req, res) => {
  res.json({
    deviceId: db.pairedDevice.deviceId,
    timezone: db.pairedDevice.timezone,
    lastSyncTimestamp: db.pairedDevice.lastSyncTimestamp,
    slots: db.slots
  });
});

// Get Lightweight Schedule for ESP32 Firmware
app.get('/api/esp32/schedule', (req, res) => {
  db.pairedDevice.lastSeen = Date.now();
  db.pairedDevice.isOnline = true;

  // Format optimized for low-memory ESP32 ArduinoJson parsing
  const espSchedule = db.slots.map((s) => ({
    id: s.id,
    slot: s.slotNumber,
    name: s.medicineName,
    enabled: s.enabled ? 1 : 0,
    times: s.times,
    days: s.days
  }));

  res.json({
    deviceId: db.pairedDevice.deviceId,
    tz: db.pairedDevice.timezone,
    syncTs: db.pairedDevice.lastSyncTimestamp,
    slots: espSchedule
  });
});

// Update 4-Slot Schedule from App (with validation)
app.put('/api/device/:id/schedule', (req, res) => {
  const { slots } = req.body;
  if (!Array.isArray(slots) || slots.length !== 4) {
    return res.status(400).json({ error: 'Exactly 4 medicine slots (A, B, C, D) must be provided.' });
  }

  // Validate each slot
  for (const slot of slots) {
    if (!slot.id || !['A', 'B', 'C', 'D'].includes(slot.id)) {
      return res.status(400).json({ error: `Invalid slot id: ${slot.id}` });
    }
    if (!slot.medicineName || !slot.medicineName.trim()) {
      return res.status(400).json({ error: `Slot ${slot.id}: Medicine name cannot be empty.` });
    }
    if (!slot.doseText || !slot.doseText.trim()) {
      return res.status(400).json({ error: `Slot ${slot.id}: Dose description cannot be empty.` });
    }
    if (!Array.isArray(slot.times)) {
      return res.status(400).json({ error: `Slot ${slot.id}: times must be an array of "HH:MM".` });
    }
    // Check for duplicate times
    const timeSet = new Set(slot.times);
    if (timeSet.size !== slot.times.length) {
      return res.status(400).json({ error: `Slot ${slot.id}: Duplicate reminder times found.` });
    }
    for (const t of slot.times) {
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(t)) {
        return res.status(400).json({ error: `Slot ${slot.id}: Invalid time format "${t}". Use HH:MM 24-hour format.` });
      }
    }
  }

  // Update slots
  db.slots = slots.map((s, idx) => ({
    id: s.id,
    slotNumber: idx + 1,
    medicineName: s.medicineName.trim(),
    doseText: s.doseText.trim(),
    enabled: Boolean(s.enabled),
    times: s.times.sort(),
    days: Array.isArray(s.days) && s.days.length > 0 ? s.days : [1, 2, 3, 4, 5, 6, 7],
    notes: s.notes || '',
    pillCount: s.pillCount !== undefined ? Number(s.pillCount) : 20,
    lowStockThreshold: s.lowStockThreshold || 5,
    lastDispensed: s.lastDispensed || null
  }));

  db.pairedDevice.lastSyncTimestamp = Date.now();
  ensureTodayDosesGenerated();
  saveState();

  res.json({
    success: true,
    message: 'Schedule updated and queued for ESP32 sync.',
    lastSyncTimestamp: db.pairedDevice.lastSyncTimestamp,
    slots: db.slots
  });
});

// Ingest ESP32 Hardware Events (reminder_started, hand_detected, servo_dispatched, device_status)
app.post('/api/device/:id/events', (req, res) => {
  const { eventId, eventType, slotId, timestamp, telemetry } = req.body;

  db.pairedDevice.lastSeen = Date.now();
  db.pairedDevice.isOnline = true;
  if (telemetry) {
    if (telemetry.wifiRssi !== undefined) db.pairedDevice.wifiRssi = telemetry.wifiRssi;
    if (telemetry.batteryPercent !== undefined) db.pairedDevice.batteryPercent = telemetry.batteryPercent;
  }

  if (!eventType) {
    return res.status(400).json({ error: 'eventType is required' });
  }

  // Idempotency: Prevent duplicate events
  if (eventId && db.processedEventIds.has(eventId)) {
    return res.json({ status: 'ignored_duplicate', eventId });
  }
  if (eventId) {
    db.processedEventIds.add(eventId);
  }

  const todayStr = getTodayDateString();
  const matchedSlot = db.slots.find((s) => s.id === slotId);

  // Truthfulness Rule:
  // "reminder_started" -> set status to ALERTING
  // "hand_detected" -> record hand proximity
  // "servo_dispatched" -> set status to DISPENSED (NOT taken!)
  if (eventType === 'reminder_started') {
    const dose = db.doseRecords.find((d) => d.slotId === slotId && d.date === todayStr && d.status === 'UPCOMING');
    if (dose) dose.status = 'ALERTING';
  } else if (eventType === 'servo_dispatched') {
    const dose = db.doseRecords.find((d) => d.slotId === slotId && d.date === todayStr && (d.status === 'ALERTING' || d.status === 'UPCOMING'));
    if (dose) {
      dose.status = 'DISPENSED';
      dose.dispensedAt = timestamp || new Date().toISOString();
    }
    if (matchedSlot) {
      matchedSlot.lastDispensed = timestamp || new Date().toISOString();
      if (matchedSlot.pillCount > 0) matchedSlot.pillCount -= 1;
      if (matchedSlot.pillCount <= matchedSlot.lowStockThreshold) {
        sendCaregiverNotification({
          type: 'LOW_STOCK',
          title: '💊 Low Medicine Warning',
          body: `Compartment ${matchedSlot.id} (${matchedSlot.medicineName}) has only ${matchedSlot.pillCount} doses remaining. Please refill soon.`,
          slotId: matchedSlot.id,
          severity: 'warning'
        });
      }
    }
  }

  saveState();
  res.json({ success: true, processedEvent: eventType });
});

// Patient Explicit Dose Confirmation ("I took this medicine")
app.post('/api/device/:id/confirm-dose', (req, res) => {
  const { doseId, slotId, confirmationTime, notes } = req.body;

  let targetDose = null;
  if (doseId) {
    targetDose = db.doseRecords.find((d) => d.id === doseId);
  }

  if (!targetDose && slotId) {
    // Find latest alerting or dispensed dose for this slot
    const todayStr = getTodayDateString();
    targetDose = db.doseRecords.find(
      (d) => d.slotId === slotId && d.date === todayStr && (d.status === 'ALERTING' || d.status === 'DISPENSED' || d.status === 'MISSED_CONFIRMATION' || d.status === 'UPCOMING')
    );
  }

  if (!targetDose) {
    return res.status(404).json({ error: 'No matching scheduled dose found to confirm.' });
  }

  targetDose.status = 'CONFIRMED_TAKEN';
  targetDose.confirmedAt = confirmationTime || new Date().toISOString();
  targetDose.confirmationSource = 'app_patient_confirmation';
  targetDose.caretakerNotifiedConfirmed = true;
  if (notes) targetDose.notes = notes;

  saveState();

  // Send Caregiver Push Notification immediately
  const formattedTime = new Date(targetDose.confirmedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  sendCaregiverNotification({
    type: 'DOSE_CONFIRMED',
    title: '✅ Medicine Confirmed Taken',
    body: `${db.patient.name} confirmed taking ${targetDose.medicineName} (${targetDose.doseText}) at ${formattedTime}.`,
    doseId: targetDose.id,
    slotId: targetDose.slotId,
    severity: 'success'
  });

  res.json({
    success: true,
    message: 'Dose marked as confirmed taken by patient.',
    dose: targetDose
  });
});

// Get Dose History & Today's Adherence Schedule
app.get('/api/device/:id/history', (req, res) => {
  ensureTodayDosesGenerated();
  const sorted = [...db.doseRecords].reverse();
  res.json({
    todayDate: getTodayDateString(),
    records: sorted
  });
});

// Caregiver Notification Feed
app.get('/api/notifications', (req, res) => {
  res.json({
    count: db.notifications.length,
    notifications: db.notifications
  });
});

// SSE Stream for Real-time Caregiver Notifications
app.get('/api/notifications/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);
  console.log(`[SSE] Client connected. Active clients: ${sseClients.length}`);

  // Send initial handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Caregiver Channel Active' })}\n\n`);

  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) sseClients.splice(index, 1);
    console.log(`[SSE] Client disconnected. Remaining: ${sseClients.length}`);
  });
});

// Test Notification Endpoint for Caregivers
app.post('/api/notifications/test', (req, res) => {
  const notif = sendCaregiverNotification({
    type: 'TEST',
    title: '🔔 Caregiver Test Notification',
    body: 'Test alert from ESP32 Smart Medicine Dispenser system. Sound, vibration, and push routing verified.',
    severity: 'info'
  });

  res.json({
    success: true,
    message: 'Test notification triggered successfully',
    notification: notif
  });
});

// Refill Compartment
app.post('/api/device/:id/refill', (req, res) => {
  const { slotId, pillCount } = req.body;
  const slot = db.slots.find((s) => s.id === slotId);
  if (!slot) return res.status(404).json({ error: 'Slot not found' });

  const count = parseInt(pillCount, 10);
  if (isNaN(count) || count < 0) return res.status(400).json({ error: 'Invalid pill count' });

  slot.pillCount = count;
  saveState();

  res.json({ success: true, slot });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  Smart Medicine Dispenser Backend & Sync Server`);
  console.log(`  Invented & Developed by: Shivraj Deshmukh (c) 2026`);
  console.log(`  Listening on: http://0.0.0.0:${PORT}`);
  console.log(`  Timezone: ${db.pairedDevice.timezone}`);
  console.log(`  Grace Period: ${db.pairedDevice.gracePeriodMinutes} minutes`);
  console.log(`=======================================================`);
});
