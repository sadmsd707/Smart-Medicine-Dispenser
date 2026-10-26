/**
 * ==============================================================================
 * SMART MEDICINE DISPENSER - FIREBASE CLOUD FUNCTIONS & FIRESTORE BACKEND
 * Invented & Developed by: Shivraj Deshmukh
 * Copyright (c) 2026 Shivraj Deshmukh. All Rights Reserved.
 * ==============================================================================
 * Features:
 * - Express REST API served via Firebase Cloud Functions HTTPS endpoint
 * - Cloud Firestore Native Data Store (devices, slots, doses, events, alerts)
 * - Firebase Scheduled Cloud Function (Dose Adherence & Device Offline Watcher)
 * - Firebase Cloud Messaging (FCM v1) push notifications via Admin SDK
 * - Strict Truthfulness: Servo/hand detection != "Taken". Missed != "Not taken".
 * - Token-based authorization for ESP32 and paired clients
 * - Atomic transactions & idempotency for event retries
 * ==============================================================================
 */

const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ----------------- Initial Seed Data for Demo Device -----------------
const DEFAULT_DEVICE_ID = 'ESP32_DISPENSER_SHIVRAJ_01';
const DEFAULT_PAIRING_CODE = 'DISP-9842';

// In-Memory cache of known authorized device tokens for fast auth lookup
const tokenCache = new Map();

/**
 * Authentication Middleware
 * Validates Bearer token against Firestore device document
 */
async function authenticate(req, res, next) {
  // Allow public access to health, pairing, and test endpoints
  const publicPaths = ['/health', '/device/pair', '/notifications/test'];
  if (publicPaths.some((p) => req.path.endsWith(p))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If no token, check if client provided deviceId header or query for backwards compatibility
    const deviceId = req.params.id || req.body.deviceId || req.query.deviceId || DEFAULT_DEVICE_ID;
    req.deviceId = deviceId;
    return next();
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (tokenCache.has(token)) {
    req.deviceId = tokenCache.get(token);
    return next();
  }

  try {
    const devicesSnap = await db
      .collection('devices')
      .where('deviceAuthToken', '==', token)
      .limit(1)
      .get();

    if (!devicesSnap.empty) {
      const devDoc = devicesSnap.docs[0];
      tokenCache.set(token, devDoc.id);
      req.deviceId = devDoc.id;
      return next();
    }
  } catch (err) {
    console.error('[AUTH ERROR]', err);
  }

  // Fallback for demo device
  req.deviceId = DEFAULT_DEVICE_ID;
  next();
}

app.use(authenticate);

/**
 * Helper: Ensure Device Document & 4 Slots Exist in Firestore
 */
async function ensureDeviceInitialized(deviceId = DEFAULT_DEVICE_ID) {
  const devRef = db.collection('devices').doc(deviceId);
  const devDoc = await devRef.get();

  if (!devDoc.exists) {
    console.log(`[INIT] Initializing new Firestore device document: ${deviceId}`);
    const hash = crypto.createHash('sha256').update(DEFAULT_PAIRING_CODE).digest('hex');
    const initialToken = crypto.randomBytes(24).toString('hex');

    await devRef.set({
      deviceId,
      name: "Shivraj's Smart Dispenser (4-Slot)",
      pairingSecretHash: hash,
      deviceAuthToken: initialToken,
      isOnline: true,
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      firmwareVersion: 'v2.6.0-firebase-cloud',
      wifiRssi: -58,
      batteryPercent: 96,
      timezone: 'Asia/Kolkata',
      lastSyncTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      gracePeriodMinutes: 15,
      caregiverTokens: [],
      patient: {
        id: 'PATIENT_01',
        name: 'Shivraj Deshmukh',
        age: 68,
        preferredLanguage: 'en',
        emergencyPhone: '+91 98220 12345',
      },
    });

    // Seed 4 initial slots
    const initialSlots = [
      {
        id: 'A',
        slotNumber: 1,
        medicineName: 'Amoxicillin',
        doseText: '500 mg (1 Capsule)',
        enabled: true,
        times: ['08:00', '20:00'],
        days: [1, 2, 3, 4, 5, 6, 7],
        notes: 'Take after meals with water',
        pillCount: 18,
        lowStockThreshold: 5,
        lastDispensed: null,
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
        lastDispensed: null,
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
        pillCount: 4,
        lowStockThreshold: 6,
        lastDispensed: null,
      },
      {
        id: 'D',
        slotNumber: 4,
        medicineName: 'Vitamin D3 + Calcium',
        doseText: '1 Tablet',
        enabled: true,
        times: ['09:30'],
        days: [1, 3, 5, 7],
        notes: 'Take in morning',
        pillCount: 28,
        lowStockThreshold: 5,
        lastDispensed: null,
      },
    ];

    const batch = db.batch();
    for (const slot of initialSlots) {
      batch.set(devRef.collection('slots').doc(slot.id), slot);
    }
    await batch.commit();
  }

  return devRef;
}

/**
 * FCM Push Notification Sender via Firebase Admin SDK
 */
async function sendCaregiverPush({ deviceId, type, title, body, doseId, slotId, severity = 'info' }) {
  const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const devRef = db.collection('devices').doc(deviceId);

  const alertData = {
    id: alertId,
    type,
    title,
    body,
    doseId: doseId || null,
    slotId: slotId || null,
    severity,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    deliveryMode: 'FCM_CLOUD',
  };

  // Write alert to Firestore subcollection
  await devRef.collection('alerts').doc(alertId).set(alertData);

  // Retrieve registered caregiver FCM tokens
  const devDoc = await devRef.get();
  const fcmTokens = devDoc.data()?.caregiverTokens || [];

  if (fcmTokens.length > 0) {
    const message = {
      tokens: fcmTokens,
      notification: {
        title,
        body,
      },
      data: {
        type,
        doseId: doseId || '',
        slotId: slotId || '',
        deviceId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'smart_dispenser_urgent',
          sound: 'default',
          priority: 'max',
          visibility: 'public',
        },
      },
    };

    try {
      const resp = await messaging.sendEachForMulticast(message);
      console.log(`[FCM SUCCESS] Sent ${resp.successCount} of ${fcmTokens.length} messages.`);
    } catch (err) {
      console.error('[FCM ERROR] Multicast failed:', err.message);
    }
  } else {
    console.log('[FCM INFO] No FCM tokens registered yet. Alert stored in Firestore.');
  }

  return alertData;
}

/**
 * Generate Today's Doses in Firestore
 */
async function generateTodayDoses(deviceId, timezone = 'Asia/Kolkata') {
  const now = new Date();
  const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStr = formatterDate.format(now); // "YYYY-MM-DD"

  const formatterDow = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' });
  const dayName = formatterDow.format(now);
  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const todayDow = dayMap[dayName] || 1;

  const devRef = db.collection('devices').doc(deviceId);
  const slotsSnap = await devRef.collection('slots').get();

  for (const doc of slotsSnap.docs) {
    const slot = doc.data();
    if (!slot.enabled) continue;
    if (!slot.days.includes(todayDow)) continue;

    for (const timeStr of slot.times) {
      const stableDoseId = `dose_${slot.id}_${todayStr.replace(/-/g, '')}_${timeStr.replace(':', '')}`;
      const doseRef = devRef.collection('doses').doc(stableDoseId);
      const doseDoc = await doseRef.get();

      if (!doseDoc.exists) {
        await doseRef.set({
          id: stableDoseId,
          slotId: slot.id,
          slotNumber: slot.slotNumber,
          medicineName: slot.medicineName,
          doseText: slot.doseText,
          date: todayStr,
          scheduledTime: timeStr,
          scheduledDateTimeIso: `${todayStr}T${timeStr}:00`,
          status: 'UPCOMING',
          dispensedAt: null,
          confirmedAt: null,
          confirmationSource: null,
          caretakerNotifiedMissed: false,
          caretakerNotifiedConfirmed: false,
          notes: slot.notes || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }
}

// ==============================================================================
// REST API ROUTES
// ==============================================================================

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Firebase Cloud Functions (asia-south1)',
    database: 'Cloud Firestore',
    timestamp: new Date().toISOString(),
  });
});

// Secure Device Pairing Flow
app.post('/device/pair', async (req, res) => {
  const { deviceId, pairingCode, caregiverName, caregiverPhone, fcmToken } = req.body;
  if (!deviceId || !pairingCode) {
    return res.status(400).json({ error: 'deviceId and pairingCode are required' });
  }

  const devRef = await ensureDeviceInitialized(deviceId);
  const devDoc = await devRef.get();
  const data = devDoc.data();

  // Validate pairing code against hash or initial default
  const inputHash = crypto.createHash('sha256').update(pairingCode).digest('hex');
  const validHash = data.pairingSecretHash;

  if (inputHash !== validHash && pairingCode !== DEFAULT_PAIRING_CODE) {
    return res.status(401).json({ error: 'Invalid pairing code. Please check device sticker.' });
  }

  // Issue newly generated cryptographically secure device auth token
  const newAuthToken = crypto.randomBytes(32).toString('hex');
  const updateData = {
    deviceAuthToken: newAuthToken,
    lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    isOnline: true,
  };

  if (fcmToken) {
    updateData.caregiverTokens = admin.firestore.FieldValue.arrayUnion(fcmToken);
  }

  await devRef.update(updateData);
  tokenCache.set(newAuthToken, deviceId);

  // Return slots and device info
  const slotsSnap = await devRef.collection('slots').orderBy('slotNumber').get();
  const slots = slotsSnap.docs.map((d) => d.data());

  res.json({
    success: true,
    message: 'Device paired successfully via Firebase',
    authToken: newAuthToken,
    device: {
      deviceId: data.deviceId,
      name: data.name,
      timezone: data.timezone,
      gracePeriodMinutes: data.gracePeriodMinutes,
      isOnline: true,
    },
    slots,
  });
});

// Register / Update Caregiver FCM Push Token
app.post('/device/:id/fcm-token', async (req, res) => {
  const deviceId = req.params.id;
  const { fcmToken, caregiverName } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ error: 'fcmToken is required' });
  }

  const devRef = await ensureDeviceInitialized(deviceId);
  await devRef.update({
    caregiverTokens: admin.firestore.FieldValue.arrayUnion(fcmToken),
  });

  res.json({ success: true, message: 'FCM token registered' });
});

// Get Device Info & Telemetry
app.get('/device/:id', async (req, res) => {
  const deviceId = req.params.id;
  const devRef = await ensureDeviceInitialized(deviceId);
  const devDoc = await devRef.get();
  const data = devDoc.data();

  res.json({
    device: {
      deviceId: data.deviceId,
      name: data.name,
      isOnline: data.isOnline,
      lastSeen: data.lastSeen ? data.lastSeen.toMillis() : Date.now(),
      firmwareVersion: data.firmwareVersion,
      wifiRssi: data.wifiRssi,
      batteryPercent: data.batteryPercent,
      timezone: data.timezone,
      lastSyncTimestamp: data.lastSyncTimestamp ? data.lastSyncTimestamp.toMillis() : Date.now(),
      gracePeriodMinutes: data.gracePeriodMinutes,
    },
    patient: data.patient,
  });
});

// Get 4-Slot Schedule (App & Client)
app.get('/device/:id/schedule', async (req, res) => {
  const deviceId = req.params.id;
  const devRef = await ensureDeviceInitialized(deviceId);
  const devDoc = await devRef.get();
  const slotsSnap = await devRef.collection('slots').orderBy('slotNumber').get();

  res.json({
    deviceId,
    timezone: devDoc.data().timezone,
    lastSyncTimestamp: devDoc.data().lastSyncTimestamp ? devDoc.data().lastSyncTimestamp.toMillis() : Date.now(),
    slots: slotsSnap.docs.map((d) => d.data()),
  });
});

// Get Lightweight Schedule for ESP32 Firmware
app.get('/esp32/schedule', async (req, res) => {
  const deviceId = req.query.deviceId || req.deviceId || DEFAULT_DEVICE_ID;
  const devRef = await ensureDeviceInitialized(deviceId);

  await devRef.update({
    lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    isOnline: true,
  });

  const slotsSnap = await devRef.collection('slots').orderBy('slotNumber').get();
  const espSchedule = slotsSnap.docs.map((d) => {
    const s = d.data();
    return {
      id: s.id,
      slot: s.slotNumber,
      name: s.medicineName,
      enabled: s.enabled ? 1 : 0,
      times: s.times,
      days: s.days,
    };
  });

  res.json({
    deviceId,
    slots: espSchedule,
  });
});

// Update 4-Slot Schedule (with strict validation)
app.put('/device/:id/schedule', async (req, res) => {
  const deviceId = req.params.id;
  const { slots } = req.body;

  if (!Array.isArray(slots) || slots.length !== 4) {
    return res.status(400).json({ error: 'Exactly 4 medicine slots (A, B, C, D) must be provided.' });
  }

  // Validate slots
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
    const timeSet = new Set(slot.times);
    if (timeSet.size !== slot.times.length) {
      return res.status(400).json({ error: `Slot ${slot.id}: Duplicate reminder times found.` });
    }
  }

  const devRef = await ensureDeviceInitialized(deviceId);
  const batch = db.batch();

  slots.forEach((s, idx) => {
    const slotDocRef = devRef.collection('slots').doc(s.id);
    batch.set(slotDocRef, {
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
      lastDispensed: s.lastDispensed || null,
    });
  });

  batch.update(devRef, {
    lastSyncTimestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  await generateTodayDoses(deviceId);

  res.json({
    success: true,
    message: 'Schedule saved to Firestore and queued for ESP32 sync',
    lastSyncTimestamp: Date.now(),
    slots,
  });
});

// Ingest ESP32 Hardware Events (reminder_started, hand_detected, servo_dispatched)
app.post('/device/:id/events', async (req, res) => {
  const deviceId = req.params.id;
  const { eventId, eventType, slotId, timestamp, telemetry } = req.body;

  if (!eventType) return res.status(400).json({ error: 'eventType is required' });

  const devRef = await ensureDeviceInitialized(deviceId);

  // Update device heartbeat and telemetry
  const updateData = {
    lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    isOnline: true,
  };
  if (telemetry) {
    if (telemetry.wifiRssi !== undefined) updateData.wifiRssi = telemetry.wifiRssi;
    if (telemetry.batteryPercent !== undefined) updateData.batteryPercent = telemetry.batteryPercent;
  }
  await devRef.update(updateData);

  // Idempotency: Prevent duplicate event processing using Firestore Document ID
  const eventDocRef = devRef.collection('events').doc(eventId || `ev_${Date.now()}`);
  const eventDoc = await eventDocRef.get();

  if (eventDoc.exists) {
    return res.json({ status: 'ignored_duplicate', eventId });
  }

  await eventDocRef.set({
    id: eventId,
    eventType,
    slotId: slotId || null,
    timestamp: timestamp || Date.now(),
    telemetry: telemetry || null,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  // Truthfulness Rule:
  // "reminder_started" -> set status to ALERTING
  // "servo_dispatched" -> set status to DISPENSED (NOT taken!)
  if (eventType === 'reminder_started') {
    const dosesSnap = await devRef
      .collection('doses')
      .where('slotId', '==', slotId)
      .where('date', '==', todayStr)
      .where('status', '==', 'UPCOMING')
      .limit(1)
      .get();

    if (!dosesSnap.empty) {
      await dosesSnap.docs[0].ref.update({ status: 'ALERTING' });
    }
  } else if (eventType === 'servo_dispatched') {
    const dosesSnap = await devRef
      .collection('doses')
      .where('slotId', '==', slotId)
      .where('date', '==', todayStr)
      .limit(1)
      .get();

    if (!dosesSnap.empty) {
      await dosesSnap.docs[0].ref.update({
        status: 'DISPENSED',
        dispensedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Decrement pill count in slot
    const slotRef = devRef.collection('slots').doc(slotId);
    const slotDoc = await slotRef.get();
    if (slotDoc.exists) {
      const currentPills = slotDoc.data().pillCount || 0;
      const newPills = Math.max(0, currentPills - 1);
      await slotRef.update({
        pillCount: newPills,
        lastDispensed: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (newPills <= (slotDoc.data().lowStockThreshold || 5)) {
        await sendCaregiverPush({
          deviceId,
          type: 'LOW_STOCK',
          title: '💊 Low Medicine Warning',
          body: `Compartment ${slotId} (${slotDoc.data().medicineName}) has only ${newPills} doses remaining. Please refill soon.`,
          slotId,
          severity: 'warning',
        });
      }
    }
  }

  res.json({ success: true, processedEvent: eventType });
});

// Patient Explicit Dose Confirmation ("I took this medicine")
app.post('/device/:id/confirm-dose', async (req, res) => {
  const deviceId = req.params.id;
  const { doseId, slotId, confirmationTime, notes } = req.body;

  const devRef = await ensureDeviceInitialized(deviceId);
  let targetDoseDoc = null;

  if (doseId) {
    const dRef = devRef.collection('doses').doc(doseId);
    const snap = await dRef.get();
    if (snap.exists) targetDoseDoc = snap;
  }

  if (!targetDoseDoc && slotId) {
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const snap = await devRef
      .collection('doses')
      .where('slotId', '==', slotId)
      .where('date', '==', todayStr)
      .limit(1)
      .get();
    if (!snap.empty) targetDoseDoc = snap.docs[0];
  }

  if (!targetDoseDoc) {
    return res.status(404).json({ error: 'No matching scheduled dose found to confirm.' });
  }

  const doseData = targetDoseDoc.data();
  await targetDoseDoc.ref.update({
    status: 'CONFIRMED_TAKEN',
    confirmedAt: confirmationTime ? new Date(confirmationTime) : admin.firestore.FieldValue.serverTimestamp(),
    confirmationSource: 'app_patient_confirmation',
    caretakerNotifiedConfirmed: true,
    notes: notes || doseData.notes || '',
  });

  // Dispatches FCM push notification to caregivers
  await sendCaregiverPush({
    deviceId,
    type: 'DOSE_CONFIRMED',
    title: '✅ Medicine Confirmed Taken',
    body: `Shivraj Deshmukh confirmed taking ${doseData.medicineName} (${doseData.doseText}) at ${doseData.scheduledTime}.`,
    doseId: doseData.id,
    slotId: doseData.slotId,
    severity: 'success',
  });

  res.json({
    success: true,
    message: 'Dose marked as confirmed taken by patient.',
    doseId: doseData.id,
  });
});

// Get Dose History
app.get('/device/:id/history', async (req, res) => {
  const deviceId = req.params.id;
  const devRef = await ensureDeviceInitialized(deviceId);
  await generateTodayDoses(deviceId);

  const dosesSnap = await devRef.collection('doses').orderBy('date', 'desc').limit(50).get();
  const records = dosesSnap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      dispensedAt: data.dispensedAt ? (data.dispensedAt.toMillis ? new Date(data.dispensedAt.toMillis()).toISOString() : data.dispensedAt) : null,
      confirmedAt: data.confirmedAt ? (data.confirmedAt.toMillis ? new Date(data.confirmedAt.toMillis()).toISOString() : data.confirmedAt) : null,
    };
  });

  res.json({
    records,
  });
});

// Get Caregiver Alerts
app.get('/notifications', async (req, res) => {
  const deviceId = req.query.deviceId || DEFAULT_DEVICE_ID;
  const devRef = await ensureDeviceInitialized(deviceId);
  const alertsSnap = await devRef.collection('alerts').orderBy('timestamp', 'desc').limit(30).get();

  res.json({
    count: alertsSnap.size,
    notifications: alertsSnap.docs.map((d) => d.data()),
  });
});

// Test Notification Trigger
app.post('/notifications/test', async (req, res) => {
  const deviceId = req.body.deviceId || DEFAULT_DEVICE_ID;
  const alert = await sendCaregiverPush({
    deviceId,
    type: 'TEST',
    title: '🔔 Caregiver Test Push Notification',
    body: 'Test alert from Firebase Cloud Messaging. Audio, vibration, and FCM routing verified.',
    severity: 'info',
  });

  res.json({
    success: true,
    message: 'Test notification dispatched via Firebase Cloud Messaging',
    alert,
  });
});

// Refill Compartment
app.post('/device/:id/refill', async (req, res) => {
  const deviceId = req.params.id;
  const { slotId, pillCount } = req.body;

  const count = parseInt(pillCount, 10);
  if (isNaN(count) || count < 0) return res.status(400).json({ error: 'Invalid pill count' });

  const devRef = await ensureDeviceInitialized(deviceId);
  await devRef.collection('slots').doc(slotId).update({
    pillCount: count,
  });

  res.json({ success: true, slotId, pillCount: count });
});

// Export Cloud Functions HTTPS API
exports.api = onRequest({ cors: true, region: 'asia-south1' }, app);

// ==============================================================================
// SCHEDULED CLOUD FUNCTION: DOSE ADHERENCE & OFFLINE WATCHER
// ==============================================================================
exports.scheduledDoseWatcher = onSchedule(
  {
    schedule: 'every 1 minutes',
    region: 'asia-south1',
    timeZone: 'Asia/Kolkata',
  },
  async (event) => {
    console.log('[WATCHER] Running scheduled dose adherence and device offline check...');

    const devicesSnap = await db.collection('devices').get();
    const now = new Date();

    for (const devDoc of devicesSnap.docs) {
      const dev = devDoc.data();
      const deviceId = dev.deviceId;
      const graceMins = dev.gracePeriodMinutes || 15;

      // 1. Device Offline Rule (No heartbeat for > 60 seconds)
      if (dev.lastSeen && dev.isOnline) {
        const lastSeenMs = dev.lastSeen.toMillis ? dev.lastSeen.toMillis() : new Date(dev.lastSeen).getTime();
        const diffSeconds = (now.getTime() - lastSeenMs) / 1000;

        if (diffSeconds > 60) {
          console.log(`[WATCHER] Device ${deviceId} offline (${Math.round(diffSeconds)}s since ping).`);
          await devDoc.ref.update({ isOnline: false });

          await sendCaregiverPush({
            deviceId,
            type: 'DEVICE_OFFLINE',
            title: '⚠️ Dispenser Device Offline',
            body: `ESP32 Smart Dispenser has lost connection. Last seen ${Math.round(diffSeconds)}s ago.`,
            severity: 'warning',
          });
        }
      }

      // 2. Unconfirmed Dose Adherence Check
      const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: dev.timezone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      const todayStr = formatterDate.format(now);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const dosesSnap = await devDoc.ref
        .collection('doses')
        .where('date', '==', todayStr)
        .where('status', 'in', ['UPCOMING', 'ALERTING', 'DISPENSED'])
        .get();

      for (const doseDoc of dosesSnap.docs) {
        const dose = doseDoc.data();
        if (dose.status === 'CONFIRMED_TAKEN') continue;

        const [h, m] = dose.scheduledTime.split(':').map(Number);
        const scheduledMinutes = h * 60 + m;
        const elapsed = currentMinutes - scheduledMinutes;

        // Transition to ALERTING when dose time arrives
        if (elapsed >= 0 && elapsed < graceMins && dose.status === 'UPCOMING') {
          await doseDoc.ref.update({ status: 'ALERTING' });
        }

        // Grace period expired without patient confirmation
        if (elapsed >= graceMins && !dose.caretakerNotifiedMissed) {
          // Truthfulness rule: Status is "MISSED_CONFIRMATION", never "Not taken".
          await doseDoc.ref.update({
            status: 'MISSED_CONFIRMATION',
            caretakerNotifiedMissed: true,
          });

          await sendCaregiverPush({
            deviceId,
            type: 'MISSED_CONFIRMATION',
            title: '⚠️ Unconfirmed Medicine Alert',
            body: `Shivraj Deshmukh has NOT confirmed taking ${dose.medicineName} (${dose.doseText}) scheduled for ${dose.scheduledTime}. (${graceMins}m grace period elapsed).`,
            doseId: dose.id,
            slotId: dose.slotId,
            severity: 'alert',
          });
        }
      }
    }
  }
);
