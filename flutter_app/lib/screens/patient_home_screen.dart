import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/dispenser_provider.dart';
import '../localization/app_strings.dart';
import '../widgets/device_status_header.dart';
import '../widgets/prominent_confirmation_banner.dart';
import '../widgets/slot_card.dart';
import '../widgets/today_schedule_view.dart';
import 'dose_history_screen.dart';
import 'device_pairing_screen.dart';
import 'caregiver_dashboard_screen.dart';

class PatientHomeScreen extends StatelessWidget {
  const PatientHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DispenserProvider>();
    final lang = provider.language;
    final isOnline = provider.isDeviceOnline;
    final slots = provider.slots;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(
          children: [
            // Top App Bar with Device, Language, Role, and Sync Status
            DeviceStatusHeader(
              onOpenSettings: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (ctx) => const DevicePairingScreen()),
                );
              },
            ),

            // If Caregiver mode is active, show the Caregiver Dashboard
            if (provider.isCaregiver)
              const Expanded(child: CaregiverDashboardScreen())
            else
              // Patient Mode
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () => provider.syncAll(),
                  child: ListView(
                    padding: const EdgeInsets.only(bottom: 24),
                    children: [
                      // Offline Warning Banner if ESP32 is disconnected
                      if (!isOnline)
                        Container(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFFBEB),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFFDE68A)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.cloud_off, color: Color(0xFFD97706), size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  lang == 'mr'
                                      ? 'डिव्हाइस ऑफलाइन आहे. स्थानिक RTC घड्याळानुसार कप्पे सुरू राहतील आणि नेटवर्क परत आल्यावर घटना समक्रमित होतील.'
                                      : 'Dispenser is offline. Operates using local DS3231 RTC clock and queues events until reconnected.',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF92400E)),
                                ),
                              ),
                            ],
                          ),
                        ),

                      // Urgent Dose Confirmation Action Banner (When Alerting / Dispensed)
                      const ProminentConfirmationBanner(),

                      // 4 Editable Medicine Slots Header
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              AppStrings.get('four_slots', lang: lang),
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            TextButton.icon(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (ctx) => const DoseHistoryScreen()),
                                );
                              },
                              icon: const Icon(Icons.history, size: 16),
                              label: Text(
                                AppStrings.get('dose_history', lang: lang).split(' ').first,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // 4 Medicine Slots Cards
                      if (slots.isEmpty)
                        const Center(child: CircularProgressIndicator())
                      else
                        ...slots.map((s) => SlotCard(key: ValueKey(s.slotLetter), slot: s)),

                      const SizedBox(height: 12),

                      // Today's Adherence Timeline
                      const TodayScheduleView(),

                      const SizedBox(height: 16),

                      // Truthfulness Rule Full Notice
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.verified_user_outlined, size: 18, color: Color(0xFF475569)),
                                const SizedBox(width: 8),
                                Text(
                                  AppStrings.get('truthfulness_rule_title', lang: lang),
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF334155),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              AppStrings.get('truthfulness_rule_body', lang: lang),
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.4),
                            ),
                          ],
                        ),
                      ),

                      // Bottom Device Pairing Link
                      Center(
                        child: TextButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (ctx) => const DevicePairingScreen()),
                            );
                          },
                          icon: const Icon(Icons.settings, size: 14, color: Color(0xFF64748B)),
                          label: Text(
                            AppStrings.get('device_pairing', lang: lang),
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
