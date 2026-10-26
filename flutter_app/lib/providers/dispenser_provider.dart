import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../models/medicine_slot.dart';
import '../models/dose_record.dart';
import '../models/device_telemetry.dart';
import '../models/caregiver_alert.dart';
import '../services/firestore_service.dart';
import '../services/storage_service.dart';

// ---------------------------------------------------------------------------
// Local Notifications Setup (Free Plan — no Cloud Functions needed)
// ---------------------------------------------------------------------------
final FlutterLocalNotificationsPlugin _localNotifications =
    FlutterLocalNotificationsPlugin();

Future<void> initLocalNotifications() async {
  const android = AndroidInitializationSettings('@mipmap/ic_launcher');
  await _localNotifications.initialize(
    const InitializationSettings(android: android),
  );

  // Create notification channel for medicine reminders
  const channel = AndroidNotificationChannel(
    'medicine_reminders',
    'Medicine Reminders',
    description: 'Smart Medicine Dispenser alerts and reminders',
    importance: Importance.high,
    playSound: true,
  );
  await _localNotifications
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);
}

Future<void> showLocalNotification({
  required int id,
  required String title,
  required String body,
}) async {
  await _localNotifications.show(
    id,
    title,
    body,
    const NotificationDetails(
      android: AndroidNotificationDetails(
        'medicine_reminders',
        'Medicine Reminders',
        channelDescription: 'Smart Medicine Dispenser alerts',
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// DispenserProvider — Free Plan (Direct Firestore, Local Notifications)
// ---------------------------------------------------------------------------
class DispenserProvider extends ChangeNotifier {
  final StorageService _storage;
  final FirestoreService _fs = FirestoreService();

  static const String _deviceId = 'ESP32_DISPENSER_SHIVRAJ_01';

  // Real-time stream subscriptions
  StreamSubscription<DeviceTelemetry>? _deviceSub;
  StreamSubscription<List<MedicineSlot>>? _slotsSub;
  StreamSubscription<List<DoseRecord>>? _dosesSub;
  StreamSubscription<List<CaregiverAlert>>? _alertsSub;

  // Background missed-dose checker (replaces Cloud Functions scheduler)
  Timer? _missedDoseTimer;

  String _language = 'en';
  String _role = 'patient';
  bool _isPaired = false;

  DeviceTelemetry _device = DeviceTelemetry.defaultDevice();
  List<MedicineSlot> _slots = [];
  List<DoseRecord> _doses = [];
  List<CaregiverAlert> _caregiverAlerts = [];

  bool _isLoading = false;
  bool _isSyncing = false;
  String? _errorMessage;
  DateTime? _lastSyncTime;

  DispenserProvider(this._storage) {
    _language = _storage.language;
    _role = _storage.role;
    _isPaired = _storage.isPaired;

    // Load cached data immediately for instant UI render
    _slots = _storage.getCachedSlots() ?? [];
    _doses = _storage.getCachedDoses() ?? [];

    // Init local notifications (free, no server needed)
    initLocalNotifications();

    // Start Firebase real-time listeners
    _initFirestoreListeners();

    // Init FCM (for receiving push if ever enabled later)
    _initFcm();

    // Missed-dose checker runs every 5 min inside the app
    _startMissedDoseChecker();

    // Initial sync
    syncAll();
  }

  // ── Getters ──────────────────────────────────────────────────────────────
  String get language => _language;
  String get role => _role;
  bool get isPatient => _role == 'patient';
  bool get isCaregiver => _role == 'caregiver';
  bool get isPaired => _isPaired;
  String get deviceId => _deviceId;

  DeviceTelemetry get device => _device;
  List<MedicineSlot> get slots => _slots;
  List<DoseRecord> get doses => _doses;
  List<CaregiverAlert> get caregiverAlerts => _caregiverAlerts;

  bool get isLoading => _isLoading;
  bool get isSyncing => _isSyncing;
  String? get errorMessage => _errorMessage;
  DateTime? get lastSyncTime => _lastSyncTime;
  bool get isDeviceOnline => _device.isOnline;

  DoseRecord? get activeAlertingDose {
    try {
      return _doses.firstWhere(
        (d) => d.status == DoseStatus.alerting || d.status == DoseStatus.dispensed,
      );
    } catch (_) {
      return null;
    }
  }

  List<DoseRecord> get missedDoses =>
      _doses.where((d) => d.status == DoseStatus.missedConfirmation).toList();

  int get unreadAlertCount => _caregiverAlerts.where((a) => !a.isRead).length;

  // ── Firestore Real-Time Listeners ────────────────────────────────────────
  void _initFirestoreListeners() {
    _cancelListeners();
    try {
      _deviceSub = _fs.deviceStream(_deviceId).listen(
        (dev) {
          _device = dev;
          notifyListeners();
        },
        onError: (e) => debugPrint('[FIRESTORE] device stream error: $e'),
      );

      _slotsSub = _fs.slotsStream(_deviceId).listen(
        (s) {
          if (s.isNotEmpty) {
            _slots = s;
            _storage.setCachedSlots(s);
            notifyListeners();
          }
        },
        onError: (e) => debugPrint('[FIRESTORE] slots stream error: $e'),
      );

      _dosesSub = _fs.dosesStream(_deviceId).listen(
        (d) {
          _doses = d;
          _storage.setCachedDoses(d);
          // Show local notification if a new alerting dose arrives
          _checkForNewAlerts(d);
          notifyListeners();
        },
        onError: (e) => debugPrint('[FIRESTORE] doses stream error: $e'),
      );

      _alertsSub = _fs.alertsStream(_deviceId).listen(
        (a) {
          _caregiverAlerts = a;
          notifyListeners();
        },
        onError: (e) => debugPrint('[FIRESTORE] alerts stream error: $e'),
      );
    } catch (e) {
      debugPrint('[FIRESTORE] listener init error (offline mode): $e');
    }
  }

  // Show local notification when a new alerting dose appears
  final Set<String> _notifiedDoseIds = {};
  void _checkForNewAlerts(List<DoseRecord> doses) {
    for (final dose in doses) {
      if ((dose.status == DoseStatus.alerting || dose.status == DoseStatus.dispensed) &&
          !_notifiedDoseIds.contains(dose.id)) {
        _notifiedDoseIds.add(dose.id);
        showLocalNotification(
          id: dose.id.hashCode,
          title: '💊 Medicine Reminder',
          body: 'Time for ${dose.medicineName} — ${dose.doseText}. '
              'Please confirm after taking.',
        );
      }
    }
  }

  // ── Missed-Dose Checker (runs inside app — replaces Cloud Functions) ─────
  void _startMissedDoseChecker() {
    _missedDoseTimer?.cancel();
    _missedDoseTimer = Timer.periodic(const Duration(minutes: 5), (_) async {
      if (!_isPaired) return;
      final grace = _device.gracePeriodMinutes;
      final marked = await _fs.checkAndMarkMissedDoses(_deviceId, grace);
      if (marked > 0) {
        debugPrint('[MISSED-DOSE] Marked $marked dose(s) as MISSED_CONFIRMATION');
        showLocalNotification(
          id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
          title: '⚠️ Unconfirmed Medicine Alert',
          body: '$marked medicine(s) not confirmed within ${grace}m grace period.',
        );
      }
    });
  }

  // ── FCM Init (optional — for future use) ─────────────────────────────────
  Future<void> _initFcm() async {
    try {
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true, badge: true, sound: true,
      );
      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        final token = await messaging.getToken();
        if (token != null) {
          debugPrint('[FCM] Token: $token');
          await _storage.setFcmToken(token);
        }
      }
      FirebaseMessaging.onMessage.listen((msg) {
        debugPrint('[FCM] Foreground: ${msg.notification?.title}');
        syncAll();
      });
    } catch (e) {
      debugPrint('[FCM] Not available: $e');
    }
  }

  void _cancelListeners() {
    _deviceSub?.cancel();
    _slotsSub?.cancel();
    _dosesSub?.cancel();
    _alertsSub?.cancel();
  }

  // ── Pairing ──────────────────────────────────────────────────────────────
  Future<bool> pairDevice({
    required String deviceId,
    required String pairingCode,
    String? caregiverName,
    String? caregiverPhone,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final ok = await _fs.pairDevice(
        deviceId: deviceId,
        enteredCode: pairingCode,
        caregiverName: caregiverName,
        caregiverPhone: caregiverPhone,
        fcmToken: _storage.fcmToken,
      );

      if (ok) {
        _isPaired = true;
        await _storage.setIsPaired(true);
        await _storage.setDeviceId(deviceId);
        _initFirestoreListeners();
        await syncAll();
        return true;
      }
      _errorMessage = 'Invalid pairing code. Please check and try again.';
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> unpair() async {
    _isPaired = false;
    await _storage.setIsPaired(false);
    _cancelListeners();
    notifyListeners();
  }

  // ── Sync (initial fetch, supplements real-time listeners) ────────────────
  Future<void> syncAll() async {
    _isSyncing = true;
    notifyListeners();

    try {
      final dev = await _fs.getDevice(_deviceId);
      _device = dev;

      if (_slots.isEmpty) {
        final serverSlots = await _fs.getSlots(_deviceId);
        if (serverSlots.isNotEmpty) {
          _slots = serverSlots;
          await _storage.setCachedSlots(_slots);
        }
      }

      final hist = await _fs.getDoseHistory(_deviceId);
      _doses = hist;
      await _storage.setCachedDoses(hist);

      final alerts = await _fs.getAlerts(_deviceId);
      _caregiverAlerts = alerts;

      _lastSyncTime = DateTime.now();
      _errorMessage = null;
    } catch (e) {
      _errorMessage = e.toString();
      _device = _device.copyWith(isOnline: false);
      debugPrint('[SYNC] Error: $e');
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  // ── Schedule Management ───────────────────────────────────────────────────
  Future<bool> saveSlot(MedicineSlot updatedSlot) async {
    final index = _slots.indexWhere((s) => s.id == updatedSlot.id);
    if (index == -1) return false;

    _isLoading = true;
    notifyListeners();

    try {
      await _fs.updateSlot(_deviceId, updatedSlot);
      final updated = List<MedicineSlot>.from(_slots);
      updated[index] = updatedSlot;
      _slots = updated;
      await _storage.setCachedSlots(_slots);
      _lastSyncTime = DateTime.now();
      _errorMessage = null;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Dose Confirmation ─────────────────────────────────────────────────────
  /// Strict truthfulness: patient explicitly confirms — not inferred from sensor.
  Future<bool> confirmDose({
    required String doseId,
    required String slotId,
    String? notes,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final updated = await _fs.confirmDose(
        deviceId: _deviceId,
        doseId: doseId,
        slotId: slotId,
        notes: notes,
      );

      if (updated != null) {
        final idx = _doses.indexWhere((d) => d.id == doseId);
        if (idx != -1) {
          _doses[idx] = updated;
        } else {
          _doses.insert(0, updated);
        }
        await _storage.setCachedDoses(_doses);
        _errorMessage = null;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Refill ────────────────────────────────────────────────────────────────
  Future<bool> refillSlot(String slotLetter, int pillCount) async {
    try {
      await _fs.refillSlot(_deviceId, slotLetter, pillCount);
      final idx = _slots.indexWhere((s) => s.slotLetter == slotLetter);
      if (idx != -1) {
        _slots[idx] = _slots[idx].copyWith(pillCount: pillCount);
        await _storage.setCachedSlots(_slots);
        notifyListeners();
      }
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  // ── Settings ──────────────────────────────────────────────────────────────
  Future<void> setLanguage(String lang) async {
    _language = lang;
    await _storage.setLanguage(lang);
    notifyListeners();
  }

  Future<void> setRole(String r) async {
    _role = r;
    await _storage.setRole(r);
    notifyListeners();
  }

  Future<void> setGracePeriod(int minutes) async {
    try {
      await _fs.updateDeviceSettings(_deviceId, gracePeriodMinutes: minutes);
      _device = _device.copyWith(gracePeriodMinutes: minutes);
      await _storage.setGracePeriodMinutes(minutes);
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
    }
  }

  Future<void> setTimezone(String tz) async {
    try {
      await _fs.updateDeviceSettings(_deviceId, timezone: tz);
      _device = _device.copyWith(timezone: tz);
      await _storage.setTimezone(tz);
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
    }
  }

  Future<void> markAlertRead(String alertId) async {
    await _fs.markAlertRead(_deviceId, alertId);
    final idx = _caregiverAlerts.indexWhere((a) => a.id == alertId);
    if (idx != -1) {
      notifyListeners();
    }
  }

  // ── Test Notification ─────────────────────────────────────────────────────
  Future<bool> triggerTestNotification() async {
    await showLocalNotification(
      id: 9999,
      title: '🧪 Test Notification',
      body: 'Smart Medicine Dispenser notifications are working correctly!',
    );
    return true;
  }

  @override
  void dispose() {
    _cancelListeners();
    _missedDoseTimer?.cancel();
    super.dispose();
  }
}
