import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/dispenser_provider.dart';
import '../localization/app_strings.dart';
import '../models/dose_record.dart';

class TodayScheduleView extends StatelessWidget {
  const TodayScheduleView({super.key});

  String _getStatusText(DoseStatus status, String lang) {
    switch (status) {
      case DoseStatus.upcoming:
        return AppStrings.get('status_upcoming', lang: lang);
      case DoseStatus.alerting:
        return AppStrings.get('status_alerting', lang: lang);
      case DoseStatus.dispensed:
        return AppStrings.get('status_dispensed', lang: lang);
      case DoseStatus.confirmedTaken:
        return AppStrings.get('status_confirmed_taken', lang: lang);
      case DoseStatus.missedConfirmation:
        return AppStrings.get('status_missed_confirmation', lang: lang);
      case DoseStatus.deviceOffline:
        return AppStrings.get('status_device_offline', lang: lang);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DispenserProvider>();
    final lang = provider.language;
    final doses = provider.doses;

    // Filter today's doses
    final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final todayDoses = doses.where((d) => d.date == todayStr || d.date.isEmpty).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                AppStrings.get('today_schedule', lang: lang),
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF059669).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  DateFormat('dd MMM yyyy').format(DateTime.now()),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF059669),
                  ),
                ),
              ),
            ],
          ),
        ),

        if (todayDoses.isEmpty)
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
                const Icon(Icons.event_available, size: 40, color: Color(0xFF94A3B8)),
                const SizedBox(height: 8),
                Text(
                  lang == 'mr'
                      ? 'आजसाठी कोणतेही औषध वेळापत्रक नाही किंवा डिव्हाइस समक्रमित होत आहे.'
                      : 'No doses scheduled for today or schedules syncing.',
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
            itemCount: todayDoses.length,
            itemBuilder: (context, idx) {
              final dose = todayDoses[idx];
              final canConfirm = dose.status == DoseStatus.alerting ||
                  dose.status == DoseStatus.dispensed ||
                  dose.status == DoseStatus.missedConfirmation;

              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: dose.statusColor.withOpacity(0.4),
                    width: dose.status == DoseStatus.alerting ? 2 : 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.02),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      // Status Icon Badge
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: dose.statusColor.withOpacity(0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(dose.statusIcon, color: dose.statusColor, size: 22),
                      ),
                      const SizedBox(width: 12),
                      // Details
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  dose.scheduledTime,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.grey.shade100,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    'Slot ${dose.slotId}',
                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              dose.medicineName,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                            Text(
                              dose.doseText,
                              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                            ),
                            const SizedBox(height: 4),
                            // Status label
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: dose.statusColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                _getStatusText(dose.status, lang),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: dose.statusColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Quick Confirm Button if alerting or dispensed
                      if (canConfirm)
                        ElevatedButton(
                          onPressed: () => provider.confirmDose(
                            doseId: dose.id,
                            slotId: dose.slotId,
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: Text(
                            AppStrings.get('i_took_this_medicine', lang: lang),
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }
}
