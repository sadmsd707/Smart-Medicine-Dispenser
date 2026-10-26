import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/medicine_slot.dart';
import '../models/dose_record.dart';
import '../models/device_telemetry.dart';
import '../models/caregiver_alert.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class ApiService {
  String baseUrl;
  String? authToken;

  ApiService({
    this.baseUrl = 'https://asia-south1-esp32-a5cbe.cloudfunctions.net/api',
    this.authToken,
  });

  Uri _uri(String endpoint) => Uri.parse('$baseUrl$endpoint');

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (authToken != null && authToken!.isNotEmpty)
          'Authorization': 'Bearer $authToken',
      };

  Future<DeviceTelemetry> getDevice(String deviceId) async {
    try {
      final res = await http
          .get(_uri('/api/device/$deviceId'), headers: _headers)
          .timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        return DeviceTelemetry.fromJson(data['device'] as Map<String, dynamic>);
      } else {
        throw ApiException('Failed to load device info (${res.statusCode})', res.statusCode);
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach dispenser backend at $baseUrl: $e');
    }
  }

  Future<String?> pairDevice({
    required String deviceId,
    required String pairingCode,
    String? caregiverName,
    String? caregiverPhone,
    String? fcmToken,
  }) async {
    try {
      final body = jsonEncode({
        'deviceId': deviceId,
        'pairingCode': pairingCode,
        'caregiverName': caregiverName,
        'caregiverPhone': caregiverPhone,
        'fcmToken': fcmToken,
      });

      final res = await http
          .post(_uri('/api/device/pair'), headers: _headers, body: body)
          .timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final token = data['authToken'] as String?;
        if (token != null) {
          authToken = token;
        }
        return token ?? 'paired';
      } else {
        final data = jsonDecode(res.body);
        throw ApiException(data['error'] ?? 'Pairing failed', res.statusCode);
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Pairing connection error: $e');
    }
  }

  Future<bool> registerFcmToken(String deviceId, String token) async {
    try {
      final body = jsonEncode({'fcmToken': token});
      final res = await http
          .post(_uri('/api/device/$deviceId/fcm-token'), headers: _headers, body: body)
          .timeout(const Duration(seconds: 5));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<List<MedicineSlot>> getSchedule(String deviceId) async {
    try {
      final res = await http
          .get(_uri('/api/device/$deviceId/schedule'), headers: _headers)
          .timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data['slots'] as List<dynamic>;
        return list.map((e) => MedicineSlot.fromJson(e as Map<String, dynamic>)).toList();
      } else {
        throw ApiException('Failed to retrieve schedules', res.statusCode);
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Schedule retrieval failed: $e');
    }
  }

  Future<bool> updateSchedule(String deviceId, List<MedicineSlot> slots) async {
    try {
      final body = jsonEncode({
        'slots': slots.map((s) => s.toJson()).toList(),
      });

      final res = await http
          .put(_uri('/api/device/$deviceId/schedule'), headers: _headers, body: body)
          .timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        return true;
      } else {
        final data = jsonDecode(res.body);
        throw ApiException(data['error'] ?? 'Schedule update failed', res.statusCode);
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Failed to sync schedule: $e');
    }
  }

  Future<DoseRecord> confirmDose({
    required String deviceId,
    required String doseId,
    required String slotId,
    String? notes,
  }) async {
    try {
      final body = jsonEncode({
        'doseId': doseId,
        'slotId': slotId,
        'confirmationTime': DateTime.now().toIso8601String(),
        'source': 'app_patient_confirmation',
        'notes': notes,
      });

      final res = await http
          .post(_uri('/api/device/$deviceId/confirm-dose'), headers: _headers, body: body)
          .timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        return DoseRecord.fromJson(data['dose'] as Map<String, dynamic>);
      } else {
        final data = jsonDecode(res.body);
        throw ApiException(data['error'] ?? 'Dose confirmation failed', res.statusCode);
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Confirmation sync error: $e');
    }
  }

  Future<List<DoseRecord>> getHistory(String deviceId) async {
    try {
      final res = await http
          .get(_uri('/api/device/$deviceId/history'), headers: _headers)
          .timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data['records'] as List<dynamic>;
        return list.map((e) => DoseRecord.fromJson(e as Map<String, dynamic>)).toList();
      } else {
        throw ApiException('Failed to retrieve history', res.statusCode);
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('History sync error: $e');
    }
  }

  Future<List<CaregiverAlert>> getNotifications() async {
    try {
      final res = await http
          .get(_uri('/api/notifications'), headers: _headers)
          .timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data['notifications'] as List<dynamic>;
        return list.map((e) => CaregiverAlert.fromJson(e as Map<String, dynamic>)).toList();
      } else {
        throw ApiException('Failed to load caregiver alerts', res.statusCode);
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Caregiver alerts fetch error: $e');
    }
  }

  Future<bool> sendTestNotification() async {
    try {
      final res = await http
          .post(_uri('/api/notifications/test'), headers: _headers)
          .timeout(const Duration(seconds: 6));
      return res.statusCode == 200;
    } catch (e) {
      throw ApiException('Test push failed: $e');
    }
  }

  Future<bool> updateDeviceSettings({
    required String deviceId,
    String? timezone,
    int? gracePeriodMinutes,
  }) async {
    try {
      final body = jsonEncode({
        if (timezone != null) 'timezone': timezone,
        if (gracePeriodMinutes != null) 'gracePeriodMinutes': gracePeriodMinutes,
      });

      final res = await http
          .patch(_uri('/api/device/$deviceId/settings'), headers: _headers, body: body)
          .timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (e) {
      throw ApiException('Failed to update settings: $e');
    }
  }

  Future<bool> refillSlot({
    required String deviceId,
    required String slotId,
    required int pillCount,
  }) async {
    try {
      final body = jsonEncode({
        'slotId': slotId,
        'pillCount': pillCount,
      });

      final res = await http
          .post(_uri('/api/device/$deviceId/refill'), headers: _headers, body: body)
          .timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (e) {
      throw ApiException('Refill update failed: $e');
    }
  }
}
