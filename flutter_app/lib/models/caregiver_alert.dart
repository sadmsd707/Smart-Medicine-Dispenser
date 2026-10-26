import 'package:flutter/material.dart';

class CaregiverAlert {
  final String id;
  final String type; // 'DOSE_CONFIRMED' | 'MISSED_CONFIRMATION' | 'DEVICE_OFFLINE' | 'TEST' | 'LOW_STOCK'
  final String title;
  final String body;
  final String? doseId;
  final String? slotId;
  final String severity; // 'success' | 'warning' | 'alert' | 'info'
  final DateTime timestamp;
  final String deliveryMode; // 'FCM_CLOUD' | 'LOCAL_RELAY'
  final bool delivered;
  final bool isRead;

  CaregiverAlert({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.doseId,
    this.slotId,
    required this.severity,
    required this.timestamp,
    required this.deliveryMode,
    required this.delivered,
    this.isRead = false,
  });

  factory CaregiverAlert.fromJson(Map<String, dynamic> json) {
    return CaregiverAlert(
      id: json['id'] ?? 'notif_${DateTime.now().millisecondsSinceEpoch}',
      type: json['type'] ?? 'INFO',
      title: json['title'] ?? 'Caregiver Notification',
      body: json['body'] ?? '',
      doseId: json['doseId'],
      slotId: json['slotId'],
      severity: json['severity'] ?? 'info',
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
      deliveryMode: json['deliveryMode'] ?? 'LOCAL_RELAY',
      delivered: json['delivered'] ?? true,
      isRead: json['read'] ?? false,
    );
  }

  Color get badgeColor {
    switch (severity.toLowerCase()) {
      case 'success':
        return const Color(0xFF059669);
      case 'alert':
        return const Color(0xFFDC2626);
      case 'warning':
        return const Color(0xFFD97706);
      case 'info':
      default:
        return const Color(0xFF2563EB);
    }
  }

  IconData get icon {
    switch (type) {
      case 'DOSE_CONFIRMED':
        return Icons.verified_user_rounded;
      case 'MISSED_CONFIRMATION':
        return Icons.warning_amber_rounded;
      case 'DEVICE_OFFLINE':
        return Icons.cloud_off_rounded;
      case 'LOW_STOCK':
        return Icons.medical_services_outlined;
      case 'TEST':
      default:
        return Icons.notifications_active_rounded;
    }
  }
}
