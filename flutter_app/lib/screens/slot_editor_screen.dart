import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/medicine_slot.dart';
import '../providers/dispenser_provider.dart';
import '../localization/app_strings.dart';

class SlotEditorScreen extends StatefulWidget {
  final MedicineSlot slot;

  const SlotEditorScreen({super.key, required this.slot});

  @override
  State<SlotEditorScreen> createState() => _SlotEditorScreenState();
}

class _SlotEditorScreenState extends State<SlotEditorScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _doseController;
  late TextEditingController _notesController;
  late TextEditingController _pillsController;

  late bool _enabled;
  late List<String> _times;
  late List<int> _days;

  String? _validationError;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.slot.medicineName);
    _doseController = TextEditingController(text: widget.slot.doseText);
    _notesController = TextEditingController(text: widget.slot.notes);
    _pillsController = TextEditingController(text: widget.slot.pillCount.toString());
    _enabled = widget.slot.enabled;
    _times = List<String>.from(widget.slot.times);
    _days = List<int>.from(widget.slot.days);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _doseController.dispose();
    _notesController.dispose();
    _pillsController.dispose();
    super.dispose();
  }

  Future<void> _pickNewTime(String lang) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 8, minute: 0),
    );

    if (picked != null) {
      final hourStr = picked.hour.toString().padLeft(2, '0');
      final minuteStr = picked.minute.toString().padLeft(2, '0');
      final formattedTime = '$hourStr:$minuteStr';

      if (_times.contains(formattedTime)) {
        setState(() {
          _validationError = AppStrings.get('duplicate_time_error', lang: lang);
        });
        return;
      }

      setState(() {
        _times.add(formattedTime);
        _times.sort();
        _validationError = null;
      });
    }
  }

  void _removeTime(String time) {
    setState(() {
      _times.remove(time);
      _validationError = null;
    });
  }

  void _toggleDay(int dayIndex) {
    setState(() {
      if (_days.contains(dayIndex)) {
        if (_days.length > 1) {
          _days.remove(dayIndex);
        }
      } else {
        _days.add(dayIndex);
        _days.sort();
      }
    });
  }

  Future<void> _saveAndSync(DispenserProvider provider, String lang) async {
    setState(() => _validationError = null);

    if (!_formKey.currentState!.validate()) return;

    if (_times.isEmpty) {
      setState(() {
        _validationError = AppStrings.get('times_empty_error', lang: lang);
      });
      return;
    }

    final updated = widget.slot.copyWith(
      medicineName: _nameController.text.trim(),
      doseText: _doseController.text.trim(),
      enabled: _enabled,
      times: _times,
      days: _days,
      notes: _notesController.text.trim(),
      pillCount: int.tryParse(_pillsController.text) ?? widget.slot.pillCount,
    );

    final success = await provider.saveSlot(updated);
    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            lang == 'mr'
                ? 'वेळापत्रक ESP32 शी समक्रमित झाले!'
                : 'Schedule saved & synced to ESP32!',
          ),
          backgroundColor: const Color(0xFF059669),
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.pop(context);
    } else {
      setState(() {
        _validationError = provider.errorMessage ?? 'Failed to save schedule';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DispenserProvider>();
    final lang = provider.language;
    final themeColor = widget.slot.themeColor;

    const dayLabelsEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayLabelsMr = ['सोम', 'मंगळ', 'बुध', 'गुरू', 'शुक्र', 'शनी', 'रवी'];
    final dayLabels = lang == 'mr' ? dayLabelsMr : dayLabelsEn;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          '${AppStrings.get('edit_schedule', lang: lang)} - ${widget.slot.slotLetter}',
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0.5,
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Top Slot Header
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: themeColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: themeColor.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: themeColor,
                      radius: 20,
                      child: Text(
                        widget.slot.slotLetter,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Compartment ${widget.slot.slotLetter} (Servo GPIO ${15 + widget.slot.slotNumber})',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: themeColor),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            AppStrings.get('four_slots', lang: lang),
                            style: const TextStyle(fontSize: 13, color: Color(0xFF334155)),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _enabled,
                      activeColor: themeColor,
                      onChanged: (v) => setState(() => _enabled = v),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Error display if validation failed
              if (_validationError != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFF87171)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _validationError!,
                          style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),

              // Medicine Name Field
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: AppStrings.get('medicine_name', lang: lang),
                  prefixIcon: const Icon(Icons.medication_rounded),
                  border: const OutlineInputBorder(),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return AppStrings.get('name_empty_error', lang: lang);
                  }
                  return null;
                },
              ),

              const SizedBox(height: 14),

              // Dose Description Field
              TextFormField(
                controller: _doseController,
                decoration: InputDecoration(
                  labelText: AppStrings.get('dose_desc', lang: lang),
                  prefixIcon: const Icon(Icons.description_outlined),
                  border: const OutlineInputBorder(),
                  helperText: lang == 'mr' ? 'उदा. १ गोळी जेवणानंतर' : 'e.g., 500mg (1 Tablet after lunch)',
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return AppStrings.get('dose_empty_error', lang: lang);
                  }
                  return null;
                },
              ),

              const SizedBox(height: 14),

              // Remaining Pills / Inventory
              TextFormField(
                controller: _pillsController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: AppStrings.get('remaining_pills', lang: lang),
                  prefixIcon: const Icon(Icons.inventory_2_outlined),
                  border: const OutlineInputBorder(),
                ),
              ),

              const SizedBox(height: 20),

              // Reminder Times Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    AppStrings.get('reminder_times', lang: lang),
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                  TextButton.icon(
                    onPressed: () => _pickNewTime(lang),
                    icon: const Icon(Icons.add_alarm, size: 18),
                    label: Text(AppStrings.get('add_time', lang: lang)),
                    style: TextButton.styleFrom(foregroundColor: themeColor),
                  ),
                ],
              ),

              const SizedBox(height: 8),

              if (_times.isEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    AppStrings.get('times_empty_error', lang: lang),
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  ),
                )
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _times.map((t) {
                    return Chip(
                      avatar: const Icon(Icons.access_time, size: 16, color: Colors.white),
                      label: Text(
                        t,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      backgroundColor: themeColor,
                      deleteIcon: const Icon(Icons.close, size: 16, color: Colors.white70),
                      onDeleted: () => _removeTime(t),
                    );
                  }).toList(),
                ),

              const SizedBox(height: 20),

              // Days of the Week Selection
              Text(
                AppStrings.get('days_of_week', lang: lang),
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 8),

              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: List.generate(7, (idx) {
                  final dayNum = idx + 1; // 1..7
                  final isSelected = _days.contains(dayNum);
                  return FilterChip(
                    label: Text(dayLabels[idx]),
                    selected: isSelected,
                    selectedColor: themeColor.withOpacity(0.2),
                    checkmarkColor: themeColor,
                    labelStyle: TextStyle(
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? themeColor : const Color(0xFF475569),
                    ),
                    onSelected: (_) => _toggleDay(dayNum),
                  );
                }),
              ),

              const SizedBox(height: 20),

              // Optional Notes Field
              TextFormField(
                controller: _notesController,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: AppStrings.get('optional_notes', lang: lang),
                  prefixIcon: const Icon(Icons.note_alt_outlined),
                  border: const OutlineInputBorder(),
                  helperText: lang == 'mr' ? 'उदा. कोमट पाण्यासोबत घ्या' : 'e.g. Take with warm water, avoid milk',
                ),
              ),

              const SizedBox(height: 24),

              // Save & Sync Button
              ElevatedButton.icon(
                onPressed: provider.isLoading ? null : () => _saveAndSync(provider, lang),
                icon: provider.isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Icon(Icons.cloud_upload_outlined, size: 20),
                label: Text(
                  AppStrings.get('save_changes', lang: lang),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: themeColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 2,
                ),
              ),

              const SizedBox(height: 12),

              OutlinedButton(
                onPressed: () => Navigator.pop(context),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(AppStrings.get('cancel', lang: lang)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
