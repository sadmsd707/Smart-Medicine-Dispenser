import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/medicine_slot.dart';
import '../models/dose_record.dart';
import '../models/device_telemetry.dart';
import '../models/caregiver_alert.dart';

/// ===========================================================================
/// FirestoreService — Direct Firestore SDK (Free Spark Plan, no Cloud Functions)
///
/// All reads/writes go straight to Firestore. No backend server needed.
/// The ESP32 uses the Firestore REST API to read schedules and write events.
///
/// Firestore structure:
///   devices/{deviceId}                      ← device doc (telemetry, settings)
///   devices/{deviceId}/slots/{slotId}       ← 4 medicine slot docs (A/B/C/D)
///   devices/{deviceId}/doses/{doseId}       ← dose audit records
///   devices/{deviceId}/alerts/{alertId}     ← caregiver alert records
/// ===========================================================================
class FirestoreService {
  static const String _pairingCode = 'DISP-9842';

  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  DocumentReference _deviceDoc(String deviceId) =>
      _db.collection('devices').doc(deviceId);

  CollectionReference _slotsCol(String deviceId) =>
      _deviceDoc(deviceId).collection('slots');

  CollectionReference _dosesCol(String deviceId) =>
      _deviceDoc(deviceId).collection('doses');

  CollectionReference _alertsCol(String deviceId) =>
      _deviceDoc(deviceId).collection('alerts');

  // ---------------------------------------------------------------------------
  // Pairing — verifies pairing code, seeds device doc if needed
  // ---------------------------------------------------------------------------
  Future<bool> pairDevice({
    required String deviceId,
    required String enteredCode,
    String? caregiverName,
    String? caregiverPhone,
    String? fcmToken,
  }) async {
    if (enteredCode.trim() != _pairingCode) return false;

    final devRef = _deviceDoc(deviceId);
    final snap = await devRef.get();

    if (!snap.exists) {
      // Seed device document on first pair
      await devRef.set({
        'deviceId': deviceId,
        'pairingCode': _pairingCode,
        'isOnline': false,
        'lastSeen': FieldValue.serverTimestamp(),
        'timezone': 'Asia/Kolkata',
        'gracePeriodMinutes': 30,
        'firmware': 'unknown',
        'caregivers': [],
        'fcmTokens': [],
      });

      // Seed 4 default slots
      final defaultSlots = _defaultSlots();
      for (final slot in defaultSlots) {
        await _slotsCol(deviceId).doc(slot.slotLetter).set(slot.toJson());
      }
    }

    // Register caregiver
    final updates = <String, dynamic>{};
    if (caregiverName != null || caregiverPhone != null) {
      final current = (snap.data() as Map<String, dynamic>?)?['caregivers'] as List? ?? [];
      final entry = {
        'name': caregiverName ?? '',
        'phone': caregiverPhone ?? '',
        'addedAt': DateTime.now().toIso8601String(),
      };
      if (!current.any((c) => c['phone'] == caregiverPhone)) {
        current.add(entry);
        updates['caregivers'] = current;
      }
    }
    if (fcmToken != null) {
      final currentTokens = (snap.data() as Map<String, dynamic>?)?['fcmTokens'] as List? ?? [];
      if (!currentTokens.contains(fcmToken)) {
        currentTokens.add(fcmToken);
        updates['fcmTokens'] = currentTokens;
      }
    }
    if (updates.isNotEmpty) {
      await devRef.update(updates);
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Device Telemetry
  // ---------------------------------------------------------------------------
  Future<DeviceTelemetry> getDevice(String deviceId) async {
    try {
      final snap = await _deviceDoc(deviceId).get();
      if (snap.exists && snap.data() != null) {
        return DeviceTelemetry.fromJson(snap.data() as Map<String, dynamic>);
      }
    } catch (e) {
      debugPrint('[FIRESTORE] getDevice error: $e');
    }
    return DeviceTelemetry.defaultDevice();
  }

  Stream<DeviceTelemetry> deviceStream(String deviceId) {
    return _deviceDoc(deviceId).snapshots().map((snap) {
      if (snap.exists && snap.data() != null) {
        return DeviceTelemetry.fromJson(snap.data() as Map<String, dynamic>);
      }
      return DeviceTelemetry.defaultDevice();
    });
  }

  Future<void> updateDeviceSettings(
    String deviceId, {
    String? timezone,
    int? gracePeriodMinutes,
  }) async {
    final updates = <String, dynamic>{};
    if (timezone != null) updates['timezone'] = timezone;
    if (gracePeriodMinutes != null) updates['gracePeriodMinutes'] = gracePeriodMinutes;
    if (updates.isNotEmpty) {
      await _deviceDoc(deviceId).update(updates);
    }
  }

  // ---------------------------------------------------------------------------
  // Medicine Slots (Schedule)
  // ---------------------------------------------------------------------------
  Future<List<MedicineSlot>> getSlots(String deviceId) async {
    try {
      final snap = await _slotsCol(deviceId).get();
      if (snap.docs.isEmpty) {
        // Seed defaults if no slots exist yet
        await _seedDefaultSlots(deviceId);
        return _defaultSlots();
      }
      final slots = snap.docs
          .map((d) => MedicineSlot.fromJson(d.data() as Map<String, dynamic>))
          .toList();
      slots.sort((a, b) => a.slotNumber.compareTo(b.slotNumber));
      return slots;
    } catch (e) {
      debugPrint('[FIRESTORE] getSlots error: $e');
      return _defaultSlots();
    }
  }

  Stream<List<MedicineSlot>> slotsStream(String deviceId) {
    return _slotsCol(deviceId).orderBy('slotNumber').snapshots().map((snap) {
      if (snap.docs.isEmpty) return _defaultSlots();
      return snap.docs
          .map((d) => MedicineSlot.fromJson(d.data() as Map<String, dynamic>))
          .toList();
    });
  }

  Future<void> updateSlot(String deviceId, MedicineSlot slot) async {
    await _slotsCol(deviceId).doc(slot.slotLetter).set(slot.toJson(), SetOptions(merge: true));
  }

  Future<void> updateAllSlots(String deviceId, List<MedicineSlot> slots) async {
    final batch = _db.batch();
    for (final slot in slots) {
      batch.set(
        _slotsCol(deviceId).doc(slot.slotLetter),
        slot.toJson(),
        SetOptions(merge: true),
      );
    }
    await batch.commit();
  }

  Future<void> refillSlot(String deviceId, String slotLetter, int pillCount) async {
    await _slotsCol(deviceId).doc(slotLetter).update({'pillCount': pillCount});
  }

  // ---------------------------------------------------------------------------
  // Dose Records
  // ---------------------------------------------------------------------------
  Future<List<DoseRecord>> getDoseHistory(String deviceId, {int limit = 100}) async {
    try {
      final snap = await _dosesCol(deviceId)
          .orderBy('scheduledTime', descending: true)
          .limit(limit)
          .get();
      return snap.docs
          .map((d) => DoseRecord.fromJson(d.data() as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('[FIRESTORE] getDoseHistory error: $e');
      return [];
    }
  }

  Stream<List<DoseRecord>> dosesStream(String deviceId) {
    return _dosesCol(deviceId)
        .orderBy('scheduledTime', descending: true)
        .limit(60)
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => DoseRecord.fromJson(d.data() as Map<String, dynamic>))
            .toList());
  }

  /// Called by patient to confirm they took their medicine.
  /// Truthfulness rule: this marks PATIENT_CONFIRMED, never "Taken" from sensor.
  Future<DoseRecord?> confirmDose({
    required String deviceId,
    required String doseId,
    required String slotId,
    String? notes,
  }) async {
    final doseRef = _dosesCol(deviceId).doc(doseId);
    final now = DateTime.now().toIso8601String();

    try {
      await _db.runTransaction((tx) async {
        final snap = await tx.get(doseRef);
        if (!snap.exists) throw Exception('Dose $doseId not found');

        final data = snap.data() as Map<String, dynamic>;
        final currentStatus = data['status'] as String? ?? '';

        // Only allow confirmation if dose is in alerting/dispensed/pending state
        if (currentStatus == 'CONFIRMED') {
          throw Exception('Dose already confirmed');
        }

        tx.update(doseRef, {
          'status': 'CONFIRMED',
          'confirmationTime': now,
          'confirmationSource': 'app_patient',
          'notes': notes ?? '',
          'updatedAt': FieldValue.serverTimestamp(),
        });

        // Write a caregiver alert
        final alertRef = _alertsCol(deviceId).doc();
        tx.set(alertRef, {
          'id': alertRef.id,
          'deviceId': deviceId,
          'type': 'CONFIRMED',
          'title': '✅ Medicine Confirmed',
          'body':
              'Patient confirmed taking ${data['medicineName'] ?? 'medicine'} '
              '(${data['doseText'] ?? ''}) at ${_fmtTime(now)}. '
              'NOTE: This is a self-report, not sensor proof.',
          'slotId': slotId,
          'doseId': doseId,
          'severity': 'info',
          'timestamp': FieldValue.serverTimestamp(),
          'read': false,
        });
      });

      final updated = await doseRef.get();
      return DoseRecord.fromJson(updated.data() as Map<String, dynamic>);
    } catch (e) {
      debugPrint('[FIRESTORE] confirmDose error: $e');
      return null;
    }
  }

  /// Marks doses as MISSED_CONFIRMATION after grace period.
  /// Called locally by the app timer — no Cloud Functions needed.
  Future<int> checkAndMarkMissedDoses(String deviceId, int gracePeriodMinutes) async {
    int marked = 0;
    try {
      final now = DateTime.now();
      final snap = await _dosesCol(deviceId)
          .where('status', isEqualTo: 'ALERTING')
          .get();

      for (final doc in snap.docs) {
        final data = doc.data() as Map<String, dynamic>;
        final scheduledStr = data['scheduledTime'] as String?;
        if (scheduledStr == null) continue;

        final scheduled = DateTime.tryParse(scheduledStr);
        if (scheduled == null) continue;

        final elapsed = now.difference(scheduled).inMinutes;
        if (elapsed >= gracePeriodMinutes) {
          await _db.runTransaction((tx) async {
            final fresh = await tx.get(doc.reference);
            final s = (fresh.data() as Map<String, dynamic>?)?['status'];
            if (s != 'ALERTING') return; // already changed

            tx.update(doc.reference, {
              'status': 'MISSED_CONFIRMATION',
              'updatedAt': FieldValue.serverTimestamp(),
            });

            final alertRef = _alertsCol(deviceId).doc();
            tx.set(alertRef, {
              'id': alertRef.id,
              'deviceId': deviceId,
              'type': 'MISSED_CONFIRMATION',
              'title': '⚠️ Unconfirmed Medicine Alert',
              'body':
                  'Patient has NOT confirmed taking ${data['medicineName'] ?? 'medicine'} '
                  '(${data['doseText'] ?? ''}) scheduled for ${data['scheduledTime'] ?? ''}. '
                  '${gracePeriodMinutes}m grace period has elapsed.',
              'slotId': data['slotId'] ?? '',
              'doseId': doc.id,
              'severity': 'alert',
              'timestamp': FieldValue.serverTimestamp(),
              'read': false,
            });
          });
          marked++;
        }
      }
    } catch (e) {
      debugPrint('[FIRESTORE] checkAndMarkMissedDoses error: $e');
    }
    return marked;
  }

  // ---------------------------------------------------------------------------
  // Caregiver Alerts
  // ---------------------------------------------------------------------------
  Stream<List<CaregiverAlert>> alertsStream(String deviceId) {
    return _alertsCol(deviceId)
        .orderBy('timestamp', descending: true)
        .limit(50)
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => CaregiverAlert.fromJson(d.data() as Map<String, dynamic>))
            .toList());
  }

  Future<List<CaregiverAlert>> getAlerts(String deviceId) async {
    try {
      final snap = await _alertsCol(deviceId)
          .orderBy('timestamp', descending: true)
          .limit(50)
          .get();
      return snap.docs
          .map((d) => CaregiverAlert.fromJson(d.data() as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('[FIRESTORE] getAlerts error: $e');
      return [];
    }
  }

  Future<void> markAlertRead(String deviceId, String alertId) async {
    await _alertsCol(deviceId).doc(alertId).update({'read': true});
  }

  // ---------------------------------------------------------------------------
  // Default Slots Seed
  // ---------------------------------------------------------------------------
  Future<void> _seedDefaultSlots(String deviceId) async {
    final batch = _db.batch();
    for (final slot in _defaultSlots()) {
      batch.set(_slotsCol(deviceId).doc(slot.slotLetter), slot.toJson());
    }
    await batch.commit();
  }

  static List<MedicineSlot> _defaultSlots() => [
        MedicineSlot(
          id: CompartmentId.A,
          slotNumber: 1,
          medicineName: 'Amoxicillin',
          doseText: '500 mg (1 Capsule)',
          enabled: true,
          times: ['08:00', '20:00'],
          days: [1, 2, 3, 4, 5, 6, 7],
          notes: 'Take with warm water after food',
          pillCount: 18,
          lowStockThreshold: 5,
        ),
        MedicineSlot(
          id: CompartmentId.B,
          slotNumber: 2,
          medicineName: 'Atorvastatin',
          doseText: '20 mg (1 Tablet)',
          enabled: true,
          times: ['21:00'],
          days: [1, 2, 3, 4, 5, 6, 7],
          notes: 'Take at bedtime',
          pillCount: 24,
          lowStockThreshold: 6,
        ),
        MedicineSlot(
          id: CompartmentId.C,
          slotNumber: 3,
          medicineName: 'Metformin HCl',
          doseText: '850 mg (1 Tablet)',
          enabled: true,
          times: ['13:00', '19:30'],
          days: [1, 2, 3, 4, 5, 6, 7],
          notes: 'Take with meals',
          pillCount: 4,
          lowStockThreshold: 6,
        ),
        MedicineSlot(
          id: CompartmentId.D,
          slotNumber: 4,
          medicineName: 'Vitamin D3 + Calcium',
          doseText: '1 Tablet',
          enabled: true,
          times: ['09:30'],
          days: [1, 3, 5, 7],
          notes: 'Take in morning',
          pillCount: 28,
          lowStockThreshold: 5,
        ),
      ];

  static String _fmtTime(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}
