import 'package:flutter/material.dart';

enum CompartmentId { A, B, C, D }

class MedicineSlot {
  final CompartmentId id;
  final int slotNumber;
  String medicineName;
  String doseText;
  bool enabled;
  List<String> times; // e.g. ["08:00", "20:00"]
  List<int> days; // 1=Mon, 7=Sun
  String notes;
  int pillCount;
  int lowStockThreshold;
  DateTime? lastDispensed;

  MedicineSlot({
    required this.id,
    required this.slotNumber,
    required this.medicineName,
    required this.doseText,
    required this.enabled,
    required this.times,
    required this.days,
    this.notes = '',
    this.pillCount = 20,
    this.lowStockThreshold = 5,
    this.lastDispensed,
  });

  String get slotLetter => id.name;

  Color get themeColor {
    switch (id) {
      case CompartmentId.A:
        return const Color(0xFF059669); // Emerald
      case CompartmentId.B:
        return const Color(0xFF0D9488); // Teal
      case CompartmentId.C:
        return const Color(0xFFD97706); // Amber
      case CompartmentId.D:
        return const Color(0xFFEA580C); // Warm Orange
    }
  }

  factory MedicineSlot.fromJson(Map<String, dynamic> json) {
    CompartmentId compId;
    switch (json['id']?.toString().toUpperCase()) {
      case 'B':
        compId = CompartmentId.B;
        break;
      case 'C':
        compId = CompartmentId.C;
        break;
      case 'D':
        compId = CompartmentId.D;
        break;
      case 'A':
      default:
        compId = CompartmentId.A;
        break;
    }

    return MedicineSlot(
      id: compId,
      slotNumber: json['slotNumber'] ?? (compId.index + 1),
      medicineName: json['medicineName'] ?? 'Medicine ${compId.name}',
      doseText: json['doseText'] ?? '1 Tablet',
      enabled: json['enabled'] ?? true,
      times: (json['times'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          ['08:00'],
      days: (json['days'] as List<dynamic>?)
              ?.map((e) => int.tryParse(e.toString()) ?? 1)
              .toList() ??
          [1, 2, 3, 4, 5, 6, 7],
      notes: json['notes'] ?? '',
      pillCount: json['pillCount'] ?? 20,
      lowStockThreshold: json['lowStockThreshold'] ?? 5,
      lastDispensed: json['lastDispensed'] != null
          ? DateTime.tryParse(json['lastDispensed'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': slotLetter,
      'slotNumber': slotNumber,
      'medicineName': medicineName,
      'doseText': doseText,
      'enabled': enabled,
      'times': times,
      'days': days,
      'notes': notes,
      'pillCount': pillCount,
      'lowStockThreshold': lowStockThreshold,
      'lastDispensed': lastDispensed?.toIso8601String(),
    };
  }

  MedicineSlot copyWith({
    String? medicineName,
    String? doseText,
    bool? enabled,
    List<String>? times,
    List<int>? days,
    String? notes,
    int? pillCount,
    int? lowStockThreshold,
    DateTime? lastDispensed,
  }) {
    return MedicineSlot(
      id: id,
      slotNumber: slotNumber,
      medicineName: medicineName ?? this.medicineName,
      doseText: doseText ?? this.doseText,
      enabled: enabled ?? this.enabled,
      times: times != null ? List<String>.from(times) : List<String>.from(this.times),
      days: days != null ? List<int>.from(days) : List<int>.from(this.days),
      notes: notes ?? this.notes,
      pillCount: pillCount ?? this.pillCount,
      lowStockThreshold: lowStockThreshold ?? this.lowStockThreshold,
      lastDispensed: lastDispensed ?? this.lastDispensed,
    );
  }
}
