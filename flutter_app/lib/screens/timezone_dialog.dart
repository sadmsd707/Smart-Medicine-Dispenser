import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/dispenser_provider.dart';
import '../localization/app_strings.dart';

class TimezoneDialog extends StatelessWidget {
  const TimezoneDialog({super.key});

  static const List<Map<String, String>> popularTimezones = [
    {'name': 'India Standard Time (IST)', 'tz': 'Asia/Kolkata'},
    {'name': 'Coordinated Universal Time (UTC)', 'tz': 'UTC'},
    {'name': 'US Eastern Time (ET)', 'tz': 'America/New_York'},
    {'name': 'US Pacific Time (PT)', 'tz': 'America/Los_Angeles'},
    {'name': 'British Summer / GMT', 'tz': 'Europe/London'},
    {'name': 'Gulf Standard Time (GST)', 'tz': 'Asia/Dubai'},
    {'name': 'Singapore / Malaysia (SGT)', 'tz': 'Asia/Singapore'},
    {'name': 'Australian Eastern Time (AET)', 'tz': 'Australia/Sydney'},
  ];

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DispenserProvider>();
    final lang = provider.language;
    final currentTz = provider.device.timezone;

    return AlertDialog(
      title: Row(
        children: [
          const Icon(Icons.public, color: Color(0xFF059669)),
          const SizedBox(width: 8),
          Text(
            AppStrings.get('change_timezone', lang: lang),
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
        ],
      ),
      content: SizedBox(
        width: double.maxFinite,
        child: ListView.separated(
          shrinkWrap: true,
          itemCount: popularTimezones.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (ctx, idx) {
            final item = popularTimezones[idx];
            final tz = item['tz']!;
            final isSelected = tz == currentTz;

            return ListTile(
              title: Text(
                item['name']!,
                style: TextStyle(
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected ? const Color(0xFF059669) : const Color(0xFF1E293B),
                ),
              ),
              subtitle: Text(tz, style: const TextStyle(fontSize: 12)),
              trailing: isSelected
                  ? const Icon(Icons.check_circle, color: Color(0xFF059669))
                  : null,
              onTap: () {
                provider.setTimezone(tz);
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Timezone updated to $tz'),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
            );
          },
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(AppStrings.get('cancel', lang: lang)),
        ),
      ],
    );
  }
}
