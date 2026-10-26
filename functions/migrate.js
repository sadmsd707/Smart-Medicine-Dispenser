/**
 * ==============================================================================
 * FIRESTORE MIGRATION SCRIPT FOR SMART MEDICINE DISPENSER
 * ==============================================================================
 * Migrates local JSON data from backend/dispenser_state.json to Cloud Firestore:
 * - Device state & Pairing credentials
 * - 4 Medicine Slot documents (subcollection: slots)
 * - Historical Dose logs (subcollection: doses)
 * - Caregiver Notifications (subcollection: alerts)
 * - Processed Event IDs for idempotency (subcollection: events)
 * ==============================================================================
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Initialize admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function runMigration() {
  console.log('[MIGRATION] Starting JSON to Cloud Firestore migration...');

  const dataFilePath = path.join(__dirname, '..', 'backend', 'dispenser_state.json');
  if (!fs.existsSync(dataFilePath)) {
    console.error(`[MIGRATION ERROR] Data file not found: ${dataFilePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(dataFilePath, 'utf8');
  const data = JSON.parse(raw);

  const deviceId = data.pairedDevice?.deviceId || 'ESP32_DISPENSER_SHIVRAJ_01';
  const devRef = db.collection('devices').doc(deviceId);

  console.log(`[MIGRATION] Target Device: ${deviceId}`);

  // 1. Migrate Device State
  const pairingCode = data.pairedDevice?.pairingCode || 'DISP-9842';
  const pairingHash = crypto.createHash('sha256').update(pairingCode).digest('hex');
  const authToken = crypto.randomBytes(32).toString('hex');

  await devRef.set({
    deviceId,
    name: data.pairedDevice?.name || "Shivraj's Smart Dispenser (4-Slot)",
    pairingSecretHash: pairingHash,
    deviceAuthToken: authToken,
    isOnline: data.pairedDevice?.isOnline ?? true,
    lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    firmwareVersion: data.pairedDevice?.firmwareVersion || 'v2.6.0-firebase-cloud',
    wifiRssi: data.pairedDevice?.wifiRssi || -58,
    batteryPercent: data.pairedDevice?.batteryPercent || 96,
    timezone: data.pairedDevice?.timezone || 'Asia/Kolkata',
    lastSyncTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    gracePeriodMinutes: data.pairedDevice?.gracePeriodMinutes || 15,
    patient: data.patient || {
      id: 'PATIENT_01',
      name: 'Shivraj Deshmukh',
      age: 68,
      preferredLanguage: 'en',
      emergencyPhone: '+91 98220 12345',
    },
    caregiverTokens: data.caregivers?.map((c) => c.fcmToken).filter(Boolean) || [],
  }, { merge: true });

  console.log('[MIGRATION] Migrated device state.');

  // 2. Migrate 4 Slots
  if (Array.isArray(data.slots)) {
    const batch = db.batch();
    for (const slot of data.slots) {
      const slotRef = devRef.collection('slots').doc(slot.id);
      batch.set(slotRef, {
        id: slot.id,
        slotNumber: slot.slotNumber,
        medicineName: slot.medicineName,
        doseText: slot.doseText,
        enabled: Boolean(slot.enabled),
        times: slot.times || ['08:00'],
        days: slot.days || [1, 2, 3, 4, 5, 6, 7],
        notes: slot.notes || '',
        pillCount: slot.pillCount !== undefined ? Number(slot.pillCount) : 20,
        lowStockThreshold: slot.lowStockThreshold || 5,
        lastDispensed: slot.lastDispensed ? new Date(slot.lastDispensed) : null,
      });
    }
    await batch.commit();
    console.log(`[MIGRATION] Migrated ${data.slots.length} medicine slots.`);
  }

  // 3. Migrate Dose History
  if (Array.isArray(data.doseRecords)) {
    const batch = db.batch();
    for (const dose of data.doseRecords) {
      const doseRef = devRef.collection('doses').doc(dose.id);
      batch.set(doseRef, {
        id: dose.id,
        slotId: dose.slotId,
        slotNumber: dose.slotNumber || 1,
        medicineName: dose.medicineName,
        doseText: dose.doseText,
        date: dose.date,
        scheduledTime: dose.scheduledTime,
        scheduledDateTimeIso: dose.scheduledDateTimeIso || `${dose.date}T${dose.scheduledTime}:00`,
        status: dose.status || 'UPCOMING',
        dispensedAt: dose.dispensedAt ? new Date(dose.dispensedAt) : null,
        confirmedAt: dose.confirmedAt ? new Date(dose.confirmedAt) : null,
        confirmationSource: dose.confirmationSource || null,
        caretakerNotifiedMissed: Boolean(dose.caretakerNotifiedMissed),
        caretakerNotifiedConfirmed: Boolean(dose.caretakerNotifiedConfirmed),
        notes: dose.notes || '',
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`[MIGRATION] Migrated ${data.doseRecords.length} dose records.`);
  }

  // 4. Migrate Caregiver Alerts
  if (Array.isArray(data.notifications)) {
    const batch = db.batch();
    for (const notif of data.notifications) {
      const alertRef = devRef.collection('alerts').doc(notif.id);
      batch.set(alertRef, {
        id: notif.id,
        type: notif.type || 'INFO',
        title: notif.title || 'Notification',
        body: notif.body || '',
        doseId: notif.doseId || null,
        slotId: notif.slotId || null,
        severity: notif.severity || 'info',
        timestamp: notif.timestamp ? new Date(notif.timestamp) : new Date(),
        deliveryMode: 'FCM_CLOUD',
      });
    }
    await batch.commit();
    console.log(`[MIGRATION] Migrated ${data.notifications.length} caregiver alerts.`);
  }

  // 5. Migrate Processed Event IDs
  if (Array.isArray(data.processedEventIds)) {
    const batch = db.batch();
    for (const evId of data.processedEventIds) {
      const evRef = devRef.collection('events').doc(evId);
      batch.set(evRef, {
        id: evId,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`[MIGRATION] Migrated ${data.processedEventIds.length} processed event IDs.`);
  }

  console.log('[MIGRATION COMPLETE] All data successfully written to Cloud Firestore.');
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[MIGRATION ERROR]', err);
      process.exit(1);
    });
}

module.exports = { runMigration };
