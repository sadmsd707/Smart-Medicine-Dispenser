import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/dispenser_provider.dart';
import '../localization/app_strings.dart';

class CaregiverDashboardScreen extends StatefulWidget {
  const CaregiverDashboardScreen({super.key});

  @override
  State<CaregiverDashboardScreen> createState() => _CaregiverDashboardScreenState();
}

class _CaregiverDashboardScreenState extends State<CaregiverDashboardScreen> {
  double _gracePeriodSlider = 15;
  bool _isSavingGrace = false;

  @override
  void initState() {
    super.initState();
    final provider = context.read<DispenserProvider>();
    _gracePeriodSlider = provider.device.gracePeriodMinutes.toDouble();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DispenserProvider>();
    final lang = provider.language;
    final dev = provider.device;
    final alerts = provider.caregiverAlerts;
    final missedDoses = provider.missedDoses;

    return RefreshIndicator(
      onRefresh: () => provider.syncAll(),
      child: ListView(
        padding: const EdgeInsets.only(bottom: 30),
        children: [
          // Caregiver Header Banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      AppStrings.get('caregiver_dashboard', lang: lang),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        dev.isOnline ? 'ESP32 ONLINE' : 'ESP32 OFFLINE',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Patient: Shivraj Deshmukh • Paired: ${dev.deviceId}',
                  style: TextStyle(fontSize: 12, color: Colors.blue.shade100),
                ),
                const SizedBox(height: 12),
                // Emergency Actions Row (Call / SMS)
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Dialing Patient: +91 98220 12345'),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        icon: const Icon(Icons.call, size: 16, color: Colors.white),
                        label: Text(
                          AppStrings.get('call_patient', lang: lang),
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white70),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Opening SMS: +91 98220 12345'),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        icon: const Icon(Icons.sms, size: 16, color: Colors.white),
                        label: Text(
                          AppStrings.get('sms_patient', lang: lang),
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white70),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Missed Doses High Priority Warning
          if (missedDoses.isNotEmpty)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFF87171), width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626), size: 24),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          lang == 'mr'
                              ? 'लक्ष द्या: ${missedDoses.length} औषधांची खात्री झालेली नाही!'
                              : 'Attention: ${missedDoses.length} Dose(s) Unconfirmed!',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF991B1B),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    lang == 'mr'
                        ? 'रुग्णाने विहित कृपा कालावधीत औषध घेतल्याची खात्री केलेली नाही. कृपया रुग्णाशी संपर्क साधा.'
                        : 'Patient did not confirm taking medicine within the grace period. Please verify with patient.',
                    style: const TextStyle(fontSize: 12, color: Color(0xFFB91C1C)),
                  ),
                  const Divider(height: 16),
                  ...missedDoses.map((m) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Text(
                          '• Slot ${m.slotId}: ${m.medicineName} (${m.doseText}) at ${m.scheduledTime}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF7F1D1D)),
                        ),
                      )),
                ],
              ),
            ),

          // Configurable Grace Period Card
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      AppStrings.get('grace_period_title', lang: lang),
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${_gracePeriodSlider.round()} ${AppStrings.get('minutes', lang: lang)}',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF2563EB)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  AppStrings.get('grace_period_desc', lang: lang),
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                Slider(
                  value: _gracePeriodSlider,
                  min: 5,
                  max: 60,
                  divisions: 11,
                  activeColor: const Color(0xFF2563EB),
                  label: '${_gracePeriodSlider.round()} min',
                  onChanged: (val) {
                    setState(() => _gracePeriodSlider = val);
                  },
                  onChangeEnd: (val) async {
                    setState(() => _isSavingGrace = true);
                    await provider.setGracePeriod(val.round());
                    setState(() => _isSavingGrace = false);
                  },
                ),
                if (_isSavingGrace)
                  const Center(
                    child: SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
              ],
            ),
          ),

          // Test Notification Action & Permissions Guide
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.notifications_active_outlined, color: Color(0xFF2563EB), size: 22),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        AppStrings.get('setup_guidance_title', lang: lang),
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  AppStrings.get('setup_guidance_body', lang: lang),
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () async {
                    final scaffold = ScaffoldMessenger.of(context);
                    final success = await provider.triggerTestNotification();
                    if (success) {
                      scaffold.showSnackBar(
                        SnackBar(
                          content: Text(AppStrings.get('test_notification_sent', lang: lang)),
                          backgroundColor: const Color(0xFF059669),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.send_rounded, size: 16),
                  label: Text(
                    AppStrings.get('test_notification_btn', lang: lang),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),

          // Caregiver Push Alert Feed / Event Audit Log
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  AppStrings.get('notification_feed', lang: lang),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                Text(
                  '${alerts.length} events',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),

          if (alerts.isEmpty)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              alignment: Alignment.center,
              child: Column(
                children: [
                  const Icon(Icons.done_all, size: 36, color: Color(0xFF94A3B8)),
                  const SizedBox(height: 8),
                  Text(
                    AppStrings.get('no_notifications', lang: lang),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: alerts.length,
              itemBuilder: (ctx, idx) {
                final notif = alerts[idx];
                final timeFormatted = DateFormat('dd MMM, HH:mm').format(notif.timestamp);

                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: notif.badgeColor.withOpacity(0.3)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: notif.badgeColor.withOpacity(0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(notif.icon, color: notif.badgeColor, size: 18),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    notif.title,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                ),
                                Text(
                                  timeFormatted,
                                  style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              notif.body,
                              style: const TextStyle(fontSize: 12, color: Color(0xFF334155)),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: Colors.grey.shade100,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    notif.deliveryMode,
                                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey.shade600),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
