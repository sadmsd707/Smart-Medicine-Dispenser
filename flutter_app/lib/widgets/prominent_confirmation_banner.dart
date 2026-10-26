import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/dispenser_provider.dart';
import '../localization/app_strings.dart';
import '../models/dose_record.dart';

class ProminentConfirmationBanner extends StatelessWidget {
  const ProminentConfirmationBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DispenserProvider>();
    final lang = provider.language;
    final activeDose = provider.activeAlertingDose;

    // If no dose is currently alerting or dispensed, don't show the urgent banner
    if (activeDose == null) return const SizedBox.shrink();

    final isDispensed = activeDose.status == DoseStatus.dispensed;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDispensed ? const Color(0xFFF0FDF4) : const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDispensed ? const Color(0xFF86EFAC) : const Color(0xFFFCD34D),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: (isDispensed ? Colors.green : Colors.amber).withOpacity(0.12),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header: Alert Icon + Status text
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDispensed ? const Color(0xFF059669) : const Color(0xFFD97706),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isDispensed ? Icons.motion_photos_on : Icons.alarm_on,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isDispensed
                          ? AppStrings.get('status_dispensed', lang: lang)
                          : AppStrings.get('status_alerting', lang: lang),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: isDispensed ? const Color(0xFF065F46) : const Color(0xFF92400E),
                      ),
                    ),
                    Text(
                      '${activeDose.slotId} • ${activeDose.scheduledTime}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDispensed ? const Color(0xFF047857) : const Color(0xFFB45309),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Medicine Name & Dosage Card
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  activeDose.medicineName,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  activeDose.doseText,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF334155),
                  ),
                ),
                if (activeDose.notes != null && activeDose.notes!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.info_outline, size: 14, color: Color(0xFF0284C7)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          activeDose.notes!,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF0284C7), fontStyle: FontStyle.italic),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 12),

          Text(
            AppStrings.get('confirm_dose_prompt', lang: lang),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
          ),

          const SizedBox(height: 8),

          // Big Accessible "I TOOK THIS MEDICINE" Button
          ElevatedButton.icon(
            onPressed: provider.isLoading
                ? null
                : () async {
                    final scaffold = ScaffoldMessenger.of(context);
                    final success = await provider.confirmDose(
                      doseId: activeDose.id,
                      slotId: activeDose.slotId,
                    );
                    if (success) {
                      scaffold.showSnackBar(
                        SnackBar(
                          content: Text(AppStrings.get('confirmed_success', lang: lang)),
                          backgroundColor: const Color(0xFF059669),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  },
            icon: provider.isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                : const Icon(Icons.check_circle_outline, size: 28),
            label: Text(
              provider.isLoading
                  ? AppStrings.get('confirming', lang: lang)
                  : AppStrings.get('i_took_this_medicine', lang: lang),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.5,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 4,
            ),
          ),

          const SizedBox(height: 8),

          // Truthfulness rule disclaimer snippet
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.8),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.verified, size: 14, color: Color(0xFF059669)),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    lang == 'mr'
                        ? 'सत्यता नियम: ॲपमध्ये "मी औषध घेतले" दाबल्यावरच औषध घेतल्याची खात्री नोंदवली जाते.'
                        : 'Truthfulness Rule: Dispenser hand detection does not verify ingestion. Explicit confirmation required.',
                    style: const TextStyle(fontSize: 10, color: Color(0xFF475569)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
