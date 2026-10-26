import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/dispenser_provider.dart';
import '../localization/app_strings.dart';
import '../models/dose_record.dart';

class DoseHistoryScreen extends StatefulWidget {
  const DoseHistoryScreen({super.key});

  @override
  State<DoseHistoryScreen> createState() => _DoseHistoryScreenState();
}

class _DoseHistoryScreenState extends State<DoseHistoryScreen> {
  String _slotFilter = 'ALL';
  String _statusFilter = 'ALL';

  String _formatDateTime(DateTime? dt) {
    if (dt == null) return '-';
    return DateFormat('dd MMM, HH:mm:ss').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DispenserProvider>();
    final lang = provider.language;
    final allDoses = provider.doses;

    final filtered = allDoses.where((d) {
      if (_slotFilter != 'ALL' && d.slotId != _slotFilter) return false;
      if (_statusFilter != 'ALL') {
        if (_statusFilter == 'CONFIRMED' && d.status != DoseStatus.confirmedTaken) return false;
        if (_statusFilter == 'MISSED' && d.status != DoseStatus.missedConfirmation) return false;
        if (_statusFilter == 'DISPENSED' && d.status != DoseStatus.dispensed) return false;
      }
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          AppStrings.get('dose_history', lang: lang),
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0.5,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Filter Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Colors.white,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    const Text('Slot: ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ...['ALL', 'A', 'B', 'C', 'D'].map((s) => Padding(
                          padding: const EdgeInsets.only(right: 4),
                          child: ChoiceChip(
                            label: Text(s),
                            selected: _slotFilter == s,
                            onSelected: (_) => setState(() => _slotFilter = s),
                          ),
                        )),
                    const SizedBox(width: 8),
                    const Text('Status: ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ...['ALL', 'CONFIRMED', 'MISSED', 'DISPENSED'].map((st) => Padding(
                          padding: const EdgeInsets.only(right: 4),
                          child: ChoiceChip(
                            label: Text(st),
                            selected: _statusFilter == st,
                            onSelected: (_) => setState(() => _statusFilter = st),
                          ),
                        )),
                  ],
                ),
              ),
            ),

            // Truthfulness Notice Alert
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, size: 16, color: Color(0xFF2563EB)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      lang == 'mr'
                          ? 'नोंद: "घेतले" ही स्थिती रुग्णाने ॲपमध्ये खात्री केल्यावरच नोंदवली जाते.'
                          : 'Note: "Confirmed taken" is only recorded via explicit patient confirmation.',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF1E40AF)),
                    ),
                  ),
                ],
              ),
            ),

            // Dose List
            Expanded(
              child: filtered.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.history_toggle_off, size: 48, color: Color(0xFF94A3B8)),
                          const SizedBox(height: 8),
                          Text(
                            lang == 'mr' ? 'कोणत्याही नोंदी आढळल्या नाहीत.' : 'No dose records found.',
                            style: const TextStyle(color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      itemCount: filtered.length,
                      itemBuilder: (ctx, idx) {
                        final dose = filtered[idx];
                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade200),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.02),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Row 1: Medicine & Status Badge
                              Row(
                                children: [
                                  CircleAvatar(
                                    radius: 14,
                                    backgroundColor: dose.statusColor.withOpacity(0.15),
                                    child: Icon(dose.statusIcon, size: 16, color: dose.statusColor),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${dose.medicineName} (${dose.doseText})',
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF0F172A),
                                          ),
                                        ),
                                        Text(
                                          'Compartment ${dose.slotId} • Scheduled: ${dose.date} ${dose.scheduledTime}',
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: dose.statusColor.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: dose.statusColor.withOpacity(0.3)),
                                    ),
                                    child: Text(
                                      dose.status.name.toUpperCase().replaceAll('_', ' '),
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: dose.statusColor,
                                      ),
                                    ),
                                  ),
                                ],
                              ),

                              const Divider(height: 16),

                              // Audit Trail Timestamps
                              Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text('Servo Dispensed:', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                        Text(
                                          _formatDateTime(dose.dispensedAt),
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text('Patient Confirmed:', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                        Text(
                                          _formatDateTime(dose.confirmedAt),
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: dose.confirmedAt != null ? const Color(0xFF059669) : Colors.grey.shade400,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),

                              if (dose.confirmationSource != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  'Source: ${dose.confirmationSource}',
                                  style: TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: Colors.grey.shade500),
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
