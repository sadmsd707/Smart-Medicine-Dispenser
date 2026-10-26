import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/dispenser_provider.dart';
import '../localization/app_strings.dart';

class DevicePairingScreen extends StatefulWidget {
  const DevicePairingScreen({super.key});

  @override
  State<DevicePairingScreen> createState() => _DevicePairingScreenState();
}

class _DevicePairingScreenState extends State<DevicePairingScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _deviceIdController;
  late TextEditingController _pairingCodeController;
  late TextEditingController _caregiverNameController;
  late TextEditingController _caregiverPhoneController;

  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final provider = context.read<DispenserProvider>();
    _deviceIdController = TextEditingController(text: provider.device.deviceId);
    _pairingCodeController = TextEditingController(text: provider.device.pairingCode);
    _caregiverNameController = TextEditingController(text: 'Dr. Ramesh Deshmukh');
    _caregiverPhoneController = TextEditingController(text: '+91 98220 12345');
  }

  @override
  void dispose() {
    _deviceIdController.dispose();
    _pairingCodeController.dispose();
    _caregiverNameController.dispose();
    _caregiverPhoneController.dispose();
    super.dispose();
  }

  Future<void> _handlePair(DispenserProvider provider, String lang) async {
    setState(() => _errorMessage = null);

    if (!_formKey.currentState!.validate()) return;

    final success = await provider.pairDevice(
      deviceId: _deviceIdController.text.trim(),
      pairingCode: _pairingCodeController.text.trim(),
      caregiverName: _caregiverNameController.text.trim(),
      caregiverPhone: _caregiverPhoneController.text.trim(),
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppStrings.get('pair_success', lang: lang)),
          backgroundColor: const Color(0xFF059669),
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.pop(context);
    } else {
      setState(() {
        _errorMessage = provider.errorMessage ?? 'Pairing failed. Check device ID and code.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DispenserProvider>();
    final lang = provider.language;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          AppStrings.get('device_pairing', lang: lang),
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
            padding: const EdgeInsets.all(20),
            children: [
              // Hardware Icon Banner
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: const Color(0xFF059669).withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.qr_code_scanner, color: Color(0xFF059669), size: 36),
                ),
              ),

              const SizedBox(height: 16),

              Text(
                AppStrings.get('device_pairing', lang: lang),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
              ),

              const SizedBox(height: 6),

              Text(
                AppStrings.get('pairing_instruction', lang: lang),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              ),

              const SizedBox(height: 20),

              if (_errorMessage != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFF87171)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),

              // Firebase Firestore info banner
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF93C5FD)),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.cloud_done_outlined, color: Color(0xFF2563EB), size: 18),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Connected to Firebase Firestore (esp32-a5cbe). No server URL needed.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF1D4ED8)),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Device ID
              TextFormField(
                controller: _deviceIdController,
                decoration: InputDecoration(
                  labelText: AppStrings.get('device_id', lang: lang),
                  prefixIcon: const Icon(Icons.memory_rounded),
                  border: const OutlineInputBorder(),
                  helperText: 'Hardware Serial Number printed on enclosure',
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Device ID cannot be empty';
                  return null;
                },
              ),

              const SizedBox(height: 14),

              // Pairing Code
              TextFormField(
                controller: _pairingCodeController,
                decoration: InputDecoration(
                  labelText: AppStrings.get('pairing_code', lang: lang),
                  prefixIcon: const Icon(Icons.lock_outline),
                  border: const OutlineInputBorder(),
                  helperText: 'Default: DISP-9842',
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Pairing code cannot be empty';
                  return null;
                },
              ),

              const SizedBox(height: 14),

              // Caregiver Profile Info
              TextFormField(
                controller: _caregiverNameController,
                decoration: const InputDecoration(
                  labelText: 'Caregiver Name',
                  prefixIcon: Icon(Icons.person_outline),
                  border: OutlineInputBorder(),
                ),
              ),

              const SizedBox(height: 14),

              TextFormField(
                controller: _caregiverPhoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Caregiver Phone Number (SMS / Alerts)',
                  prefixIcon: Icon(Icons.phone_outlined),
                  border: OutlineInputBorder(),
                ),
              ),

              const SizedBox(height: 24),

              // Pair Button
              ElevatedButton.icon(
                onPressed: provider.isLoading ? null : () => _handlePair(provider, lang),
                icon: provider.isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Icon(Icons.link, size: 20),
                label: Text(
                  AppStrings.get('pair_button', lang: lang),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),

              const SizedBox(height: 12),

              // Quick fill demo button
              OutlinedButton.icon(
                onPressed: () {
                  setState(() {
                    _deviceIdController.text = 'ESP32_DISPENSER_SHIVRAJ_01';
                    _pairingCodeController.text = 'DISP-9842';
                  });
                },
                icon: const Icon(Icons.bolt, size: 16),
                label: const Text('Quick Fill Default ESP32 Demo'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
