import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/medicine_slot.dart';
import '../providers/dispenser_provider.dart';
import '../localization/app_strings.dart';
import '../screens/slot_editor_screen.dart';

class SlotCard extends StatelessWidget {
  final MedicineSlot slot;

  const SlotCard({super.key, required this.slot});

  String _formatDays(List<int> days, String lang) {
    if (days.length == 7) {
      return lang == 'mr' ? 'दररोज (Every day)' : 'Every day';
    }
    const dayNamesEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayNamesMr = ['सोम', 'मंगळ', 'बुध', 'गुरू', 'शुक्र', 'शनी', 'रवी'];
    final names = lang == 'mr' ? dayNamesMr : dayNamesEn;
    return days.map((d) => names[d - 1]).join(', ');
  }

  void _showRefillDialog(BuildContext context, DispenserProvider provider, String lang) {
    final controller = TextEditingController(text: '${slot.pillCount + 10}');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${AppStrings.get('refill', lang: lang)} - ${slot.slotLetter}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${slot.medicineName} (${slot.doseText})'),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: AppStrings.get('remaining_pills', lang: lang),
                border: const OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(AppStrings.get('cancel', lang: lang)),
          ),
          ElevatedButton(
            onPressed: () {
              final count = int.tryParse(controller.text) ?? slot.pillCount;
              provider.refillSlot(slot.slotLetter, count);
              Navigator.pop(ctx);
            },
            child: Text(AppStrings.get('save_changes', lang: lang)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DispenserProvider>();
    final lang = provider.language;
    final isLowStock = slot.pillCount <= slot.lowStockThreshold;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: slot.enabled ? slot.themeColor.withOpacity(0.3) : Colors.grey.shade300,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Card Header with Slot Badge & Enabled Toggle
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: slot.enabled ? slot.themeColor.withOpacity(0.08) : Colors.grey.shade100,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
            ),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: slot.enabled ? slot.themeColor : Colors.grey.shade400,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    slot.slotLetter,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${AppStrings.get('four_slots', lang: lang).split(' ').first} ${slot.slotNumber} (${slot.slotLetter})',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: slot.enabled ? slot.themeColor : Colors.grey.shade600,
                          letterSpacing: 0.5,
                        ),
                      ),
                      Text(
                        slot.medicineName,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: slot.enabled ? const Color(0xFF0F172A) : Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ),
                ),
                // Enabled / Disabled Toggle
                Switch(
                  value: slot.enabled,
                  activeColor: slot.themeColor,
                  onChanged: (val) {
                    final updated = slot.copyWith(enabled: val);
                    provider.saveSlot(updated);
                  },
                ),
              ],
            ),
          ),

          // Card Body
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Dose text
                Row(
                  children: [
                    const Icon(Icons.medication, size: 16, color: Color(0xFF64748B)),
                    const SizedBox(width: 6),
                    Text(
                      slot.doseText,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF334155),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 8),

                // Reminder times chips
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: slot.times.map((t) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: slot.themeColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.alarm, size: 12, color: slot.themeColor),
                          const SizedBox(width: 4),
                          Text(
                            t,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: slot.themeColor,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),

                const SizedBox(height: 8),

                // Days of week
                Row(
                  children: [
                    const Icon(Icons.calendar_today, size: 13, color: Color(0xFF64748B)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _formatDays(slot.days, lang),
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                    ),
                  ],
                ),

                // Notes if present
                if (slot.notes.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.notes, size: 13, color: Color(0xFF0284C7)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          slot.notes,
                          style: const TextStyle(fontSize: 11, color: Color(0xFF0284C7), fontStyle: FontStyle.italic),
                        ),
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 12),

                // Inventory Progress Bar
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '${AppStrings.get('remaining_pills', lang: lang)}: ${slot.pillCount} doses',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: isLowStock ? const Color(0xFFDC2626) : const Color(0xFF475569),
                                ),
                              ),
                              if (isLowStock)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEE2E2),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    AppStrings.get('low_stock_warning', lang: lang),
                                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFFDC2626)),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          LinearProgressIndicator(
                            value: (slot.pillCount / 30.0).clamp(0.0, 1.0),
                            backgroundColor: Colors.grey.shade200,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              isLowStock ? const Color(0xFFDC2626) : slot.themeColor,
                            ),
                            minHeight: 6,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Action Buttons: Edit Schedule & Refill
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: () => _showRefillDialog(context, provider, lang),
                      icon: const Icon(Icons.add_shopping_cart, size: 15),
                      label: Text(
                        AppStrings.get('refill', lang: lang),
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (ctx) => SlotEditorScreen(slot: slot),
                          ),
                        );
                      },
                      icon: const Icon(Icons.edit, size: 14),
                      label: Text(
                        AppStrings.get('edit_schedule', lang: lang),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: slot.themeColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
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
  }
}
