import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/medicine_slot.dart';
import '../models/dose_record.dart';

class StorageService {
  static const String keyLanguage = 'pref_language';
  static const String keyRole = 'pref_role';
  static const String keyTimezone = 'pref_timezone';
  static const String keyServerUrl = 'pref_server_url';
  static const String keyDeviceId = 'pref_device_id';
  static const String keyPairingCode = 'pref_pairing_code';
  static const String keyIsPaired = 'pref_is_paired';
  static const String keyCachedSlots = 'pref_cached_slots';
  static const String keyCachedDoses = 'pref_cached_doses';
  static const String keyGracePeriod = 'pref_grace_period';

  final SharedPreferences _prefs;

  StorageService(this._prefs);

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return StorageService(prefs);
  }

  String get language => _prefs.getString(keyLanguage) ?? 'en'; // English by default
  Future<void> setLanguage(String lang) => _prefs.setString(keyLanguage, lang);

  String get role => _prefs.getString(keyRole) ?? 'patient';
  Future<void> setRole(String r) => _prefs.setString(keyRole, r);

  String get timezone => _prefs.getString(keyTimezone) ?? 'Asia/Kolkata';
  Future<void> setTimezone(String tz) => _prefs.setString(keyTimezone, tz);

  String get serverUrl => _prefs.getString(keyServerUrl) ?? 'http://10.0.2.2:3000';
  Future<void> setServerUrl(String url) => _prefs.setString(keyServerUrl, url);

  bool get isPaired => _prefs.getBool(keyIsPaired) ?? true; // Pre-paired for instant demo
  Future<void> setIsPaired(bool paired) => _prefs.setBool(keyIsPaired, paired);

  String get deviceId => _prefs.getString(keyDeviceId) ?? 'ESP32_DISPENSER_SHIVRAJ_01';
  Future<void> setDeviceId(String id) => _prefs.setString(keyDeviceId, id);

  String get pairingCode => _prefs.getString(keyPairingCode) ?? 'DISP-9842';
  Future<void> setPairingCode(String code) => _prefs.setString(keyPairingCode, code);

  static const String keyAuthToken = 'pref_auth_token';
  static const String keyFcmToken = 'pref_fcm_token';

  String? get authToken => _prefs.getString(keyAuthToken);
  Future<void> setAuthToken(String token) => _prefs.setString(keyAuthToken, token);

  String? get fcmToken => _prefs.getString(keyFcmToken);
  Future<void> setFcmToken(String token) => _prefs.setString(keyFcmToken, token);

  int get gracePeriodMinutes => _prefs.getInt(keyGracePeriod) ?? 15;
  Future<void> setGracePeriodMinutes(int mins) => _prefs.setInt(keyGracePeriod, mins);

  List<MedicineSlot>? getCachedSlots() {
    final raw = _prefs.getString(keyCachedSlots);
    if (raw == null) return null;
    try {
      final List<dynamic> list = jsonDecode(raw);
      return list.map((e) => MedicineSlot.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> setCachedSlots(List<MedicineSlot> slots) async {
    final jsonList = slots.map((s) => s.toJson()).toList();
    await _prefs.setString(keyCachedSlots, jsonEncode(jsonList));
  }

  List<DoseRecord>? getCachedDoses() {
    final raw = _prefs.getString(keyCachedDoses);
    if (raw == null) return null;
    try {
      final List<dynamic> list = jsonDecode(raw);
      return list.map((e) => DoseRecord.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> setCachedDoses(List<DoseRecord> doses) async {
    final jsonList = doses.map((d) => d.toJson()).toList();
    await _prefs.setString(keyCachedDoses, jsonEncode(jsonList));
  }
}
