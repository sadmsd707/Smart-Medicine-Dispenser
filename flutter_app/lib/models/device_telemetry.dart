class DeviceTelemetry {
  final String deviceId;
  final String pairingCode;
  final String name;
  final bool isOnline;
  final DateTime lastSeen;
  final String firmwareVersion;
  final int wifiRssi;
  final int batteryPercent;
  final String timezone;
  final DateTime lastSyncTimestamp;
  final int gracePeriodMinutes;

  DeviceTelemetry({
    required this.deviceId,
    required this.pairingCode,
    required this.name,
    required this.isOnline,
    required this.lastSeen,
    required this.firmwareVersion,
    required this.wifiRssi,
    required this.batteryPercent,
    required this.timezone,
    required this.lastSyncTimestamp,
    required this.gracePeriodMinutes,
  });

  factory DeviceTelemetry.defaultDevice() {
    return DeviceTelemetry(
      deviceId: 'ESP32_DISPENSER_SHIVRAJ_01',
      pairingCode: 'DISP-9842',
      name: "Shivraj's Smart Dispenser",
      isOnline: true,
      lastSeen: DateTime.now(),
      firmwareVersion: 'v2.5.0-esp32-rtc',
      wifiRssi: -58,
      batteryPercent: 96,
      timezone: 'Asia/Kolkata',
      lastSyncTimestamp: DateTime.now(),
      gracePeriodMinutes: 15,
    );
  }

  factory DeviceTelemetry.fromJson(Map<String, dynamic> json) {
    return DeviceTelemetry(
      deviceId: json['deviceId'] ?? 'ESP32_DISPENSER_SHIVRAJ_01',
      pairingCode: json['pairingCode'] ?? 'DISP-9842',
      name: json['name'] ?? 'Smart Dispenser',
      isOnline: json['isOnline'] ?? false,
      lastSeen: json['lastSeen'] != null
          ? (json['lastSeen'] is int
              ? DateTime.fromMillisecondsSinceEpoch(json['lastSeen'])
              : DateTime.tryParse(json['lastSeen'].toString()) ?? DateTime.now())
          : DateTime.now(),
      firmwareVersion: json['firmwareVersion'] ?? 'v2.5.0',
      wifiRssi: json['wifiRssi'] ?? -60,
      batteryPercent: json['batteryPercent'] ?? 95,
      timezone: json['timezone'] ?? 'Asia/Kolkata',
      lastSyncTimestamp: json['lastSyncTimestamp'] != null
          ? (json['lastSyncTimestamp'] is int
              ? DateTime.fromMillisecondsSinceEpoch(json['lastSyncTimestamp'])
              : DateTime.tryParse(json['lastSyncTimestamp'].toString()) ?? DateTime.now())
          : DateTime.now(),
      gracePeriodMinutes: json['gracePeriodMinutes'] ?? 15,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'deviceId': deviceId,
      'pairingCode': pairingCode,
      'name': name,
      'isOnline': isOnline,
      'lastSeen': lastSeen.millisecondsSinceEpoch,
      'firmwareVersion': firmwareVersion,
      'wifiRssi': wifiRssi,
      'batteryPercent': batteryPercent,
      'timezone': timezone,
      'lastSyncTimestamp': lastSyncTimestamp.millisecondsSinceEpoch,
      'gracePeriodMinutes': gracePeriodMinutes,
    };
  }

  DeviceTelemetry copyWith({
    bool? isOnline,
    DateTime? lastSeen,
    int? wifiRssi,
    int? batteryPercent,
    String? timezone,
    DateTime? lastSyncTimestamp,
    int? gracePeriodMinutes,
  }) {
    return DeviceTelemetry(
      deviceId: deviceId,
      pairingCode: pairingCode,
      name: name,
      isOnline: isOnline ?? this.isOnline,
      lastSeen: lastSeen ?? this.lastSeen,
      firmwareVersion: firmwareVersion,
      wifiRssi: wifiRssi ?? this.wifiRssi,
      batteryPercent: batteryPercent ?? this.batteryPercent,
      timezone: timezone ?? this.timezone,
      lastSyncTimestamp: lastSyncTimestamp ?? this.lastSyncTimestamp,
      gracePeriodMinutes: gracePeriodMinutes ?? this.gracePeriodMinutes,
    );
  }
}
