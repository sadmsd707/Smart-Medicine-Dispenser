import 'package:flutter/material.dart';

enum DoseStatus {
  upcoming,
  alerting,
  dispensed,
  confirmedTaken,
  missedConfirmation,
  deviceOffline,
}

class DoseRecord {
  final String id;
  final String slotId;
  final int slotNumber;
  final String medicineName;
  final String doseText;
  final String date; // YYYY-MM-DD
  final String scheduledTime; // HH:MM
  final DoseStatus status;
  final DateTime? dispensedAt;
  final DateTime? confirmedAt;
  final String? confirmationSource; // e.g. "app_patient_confirmation"
  final String? notes;
  final bool caretakerNotifiedMissed;
  final bool caretakerNotifiedConfirmed;

  DoseRecord({
    required this.id,
    required this.slotId,
    required this.slotNumber,
    required this.medicineName,
    required this.doseText,
    required this.date,
    required this.scheduledTime,
    required this.status,
    this.dispensedAt,
    this.confirmedAt,
    this.confirmationSource,
    this.notes,
    this.caretakerNotifiedMissed = false,
    this.caretakerNotifiedConfirmed = false,
  });

  static DoseStatus parseStatus(String? statusStr) {
    switch (statusStr?.toUpperCase()) {
      case 'ALERTING':
        return DoseStatus.alerting;
      case 'DISPENSED':
        return DoseStatus.dispensed;
      case 'CONFIRMED_TAKEN':
      case 'TAKEN':
        return DoseStatus.confirmedTaken;
      case 'MISSED_CONFIRMATION':
      case 'MISSED':
      case 'NOT_CONFIRMED':
        return DoseStatus.missedConfirmation;
      case 'DEVICE_OFFLINE':
      case 'OFFLINE':
        return DoseStatus.deviceOffline;
      case 'UPCOMING':
      default:
        return DoseStatus.upcoming;
    }
  }

  factory DoseRecord.fromJson(Map<String, dynamic> json) {
    return DoseRecord(
      id: json['id'] ?? 'dose_${DateTime.now().millisecondsSinceEpoch}',
      slotId: json['slotId'] ?? 'A',
      slotNumber: json['slotNumber'] ?? 1,
      medicineName: json['medicineName'] ?? 'Medicine',
      doseText: json['doseText'] ?? '1 Dose',
      date: json['date'] ?? '',
      scheduledTime: json['scheduledTime'] ?? '08:00',
      status: parseStatus(json['status']?.toString()),
      dispensedAt: json['dispensedAt'] != null
          ? DateTime.tryParse(json['dispensedAt'].toString())
          : null,
      confirmedAt: json['confirmedAt'] != null
          ? DateTime.tryParse(json['confirmedAt'].toString())
          : null,
      confirmationSource: json['confirmationSource'],
      notes: json['notes'],
      caretakerNotifiedMissed: json['caretakerNotifiedMissed'] ?? false,
      caretakerNotifiedConfirmed: json['caretakerNotifiedConfirmed'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'slotId': slotId,
      'slotNumber': slotNumber,
      'medicineName': medicineName,
      'doseText': doseText,
      'date': date,
      'scheduledTime': scheduledTime,
      'status': status.name,
      'dispensedAt': dispensedAt?.toIso8601String(),
      'confirmedAt': confirmedAt?.toIso8601String(),
      'confirmationSource': confirmationSource,
      'notes': notes,
      'caretakerNotifiedMissed': caretakerNotifiedMissed,
      'caretakerNotifiedConfirmed': caretakerNotifiedConfirmed,
    };
  }

  Color get statusColor {
    switch (status) {
      case DoseStatus.upcoming:
        return const Color(0xFF64748B); // Slate
      case DoseStatus.alerting:
        return const Color(0xFFD97706); // Amber
      case DoseStatus.dispensed:
        return const Color(0xFF0284C7); // Sky Blue
      case DoseStatus.confirmedTaken:
        return const Color(0xFF059669); // Emerald Green
      case DoseStatus.missedConfirmation:
        return const Color(0xFFDC2626); // Rose / Red
      case DoseStatus.deviceOffline:
        return const Color(0xFF475569); // Dark Slate
    }
  }

  IconData get statusIcon {
    switch (status) {
      case DoseStatus.upcoming:
        return Icons.schedule;
      case DoseStatus.alerting:
        return Icons.notifications_active;
      case DoseStatus.dispensed:
        return Icons.motion_photos_on;
      case DoseStatus.confirmedTaken:
        return Icons.check_circle;
      case DoseStatus.missedConfirmation:
        return Icons.error_outline;
      case DoseStatus.deviceOffline:
        return Icons.cloud_off;
    }
  }
}
