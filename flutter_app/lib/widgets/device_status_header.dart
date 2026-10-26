import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/dispenser_provider.dart';
import '../localization/app_strings.dart';
import '../screens/timezone_dialog.dart';

class DeviceStatusHeader extends StatelessWidget {
  final VoidCallback? onOpenSettings;

  const DeviceStatusHeader({super.key, this.onOpenSettings});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DispenserProvider>();
    final lang = provider.language;
    final dev = provider.device;

    final syncTimeStr = provider.lastSyncTime != null
        ? DateFormat('HH:mm:ss').format(provider.lastSyncTime!)
        : 'Never';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Colors.grey.shade200, width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: App Title, Language Toggle, Role Switch
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF059669).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.medication_rounded, color: Color(0xFF059669), size: 24),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      AppStrings.get('app_title', lang: lang),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      provider.isPatient
                          ? AppStrings.get('role_patient', lang: lang)
                          : AppStrings.get('role_caregiver', lang: lang),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: provider.isPatient ? const Color(0xFF059669) : const Color(0xFF2563EB),
                      ),
                    ),
                  ],
                ),
              ),
              // Language Choice Toggle (English / Marathi)
              OutlinedButton.icon(
                onPressed: () {
                  final nextLang = lang == 'mr' ? 'en' : 'mr';
                  provider.setLanguage(nextLang);
                },
                icon: const Icon(Icons.translate, size: 16),
                label: Text(
                  AppStrings.get('switch_language', lang: lang),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
              ),
              const SizedBox(width: 6),
              // Role Switch
              IconButton(
                tooltip: AppStrings.get('switch_role', lang: lang),
                icon: Icon(
                  provider.isPatient ? Icons.supervisor_account : Icons.person,
                  color: const Color(0xFF0F172A),
                ),
                onPressed: () {
                  final nextRole = provider.isPatient ? 'caregiver' : 'patient';
                  provider.setRole(nextRole);
                },
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Row 2: Device Connection Badge, Battery, WiFi, Timezone, Sync Now
          Row(
            children: [
              // Online / Offline Status Chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: dev.isOnline ? const Color(0xFFDEF7EC) : const Color(0xFFFDE8E8),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: dev.isOnline ? const Color(0xFF31C48D) : const Color(0xFFF98080),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: dev.isOnline ? const Color(0xFF059669) : const Color(0xFFE02424),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      dev.isOnline
                          ? AppStrings.get('online', lang: lang)
                          : AppStrings.get('offline', lang: lang),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: dev.isOnline ? const Color(0xFF03543F) : const Color(0xFF9B1C1C),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 8),

              // Battery & WiFi
              if (dev.isOnline) ...[
                Icon(Icons.battery_5_bar, size: 16, color: Colors.grey.shade700),
                Text(
                  '${dev.batteryPercent}%',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade700, fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 6),
                Icon(Icons.wifi, size: 16, color: Colors.grey.shade700),
                Text(
                  '${dev.wifiRssi} dBm',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade700, fontWeight: FontWeight.w600),
                ),
              ],

              const Spacer(),

              // Timezone button
              InkWell(
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => const TimezoneDialog(),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.access_time, size: 13, color: Color(0xFF475569)),
                      const SizedBox(width: 4),
                      Text(
                        dev.timezone.split('/').last.replaceAll('_', ' '),
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(width: 8),

              // Manual Sync Now button
              InkWell(
                onTap: provider.isSyncing ? null : () => provider.syncAll(),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF059669).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      provider.isSyncing
                          ? const SizedBox(
                              width: 12,
                              height: 12,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF059669)),
                            )
                          : const Icon(Icons.sync, size: 13, color: Color(0xFF059669)),
                      const SizedBox(width: 4),
                      Text(
                        provider.isSyncing
                            ? '...'
                            : AppStrings.get('sync_now', lang: lang),
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // Last sync timestamp caption
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              '${AppStrings.get('last_synced', lang: lang)}: $syncTimeStr • ${dev.name}',
              style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
            ),
          ),
        ],
      ),
    );
  }
}
