import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_app/models/medicine_slot.dart';
import 'package:flutter_app/models/dose_record.dart';
import 'package:flutter_app/localization/app_strings.dart';
import 'package:flutter_app/services/storage_service.dart';
import 'package:flutter_app/providers/dispenser_provider.dart';
import 'package:flutter_app/main.dart';
import 'package:provider/provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('MedicineSlot and DoseRecord Models', () {
    test('MedicineSlot correctly initializes and serializes to JSON', () {
      final slot = MedicineSlot(
        id: CompartmentId.A,
        slotNumber: 1,
        medicineName: 'Amoxicillin',
        doseText: '500 mg',
        enabled: true,
        times: ['08:00', '20:00'],
        days: [1, 2, 3, 4, 5, 6, 7],
      );

      expect(slot.slotLetter, 'A');
      expect(slot.times.length, 2);

      final json = slot.toJson();
      expect(json['id'], 'A');
      expect(json['medicineName'], 'Amoxicillin');

      final reconstructed = MedicineSlot.fromJson(json);
      expect(reconstructed.id, CompartmentId.A);
      expect(reconstructed.medicineName, 'Amoxicillin');
    });

    test('DoseRecord parses statuses correctly', () {
      expect(DoseRecord.parseStatus('ALERTING'), DoseStatus.alerting);
      expect(DoseRecord.parseStatus('DISPENSED'), DoseStatus.dispensed);
      expect(DoseRecord.parseStatus('CONFIRMED_TAKEN'), DoseStatus.confirmedTaken);
      expect(DoseRecord.parseStatus('MISSED_CONFIRMATION'), DoseStatus.missedConfirmation);
      expect(DoseRecord.parseStatus('UNKNOWN'), DoseStatus.upcoming);
    });
  });

  group('Localization Strings (English & Marathi)', () {
    test('AppStrings returns valid Marathi and English strings', () {
      expect(AppStrings.get('app_title', lang: 'mr'), 'स्मार्ट औषध वाटप यंत्र');
      expect(AppStrings.get('app_title', lang: 'en'), 'Smart Medicine Dispenser');

      expect(AppStrings.get('i_took_this_medicine', lang: 'mr'), 'मी औषध घेतले');
      expect(AppStrings.get('i_took_this_medicine', lang: 'en'), 'I Took This Medicine');

      expect(AppStrings.get('status_missed_confirmation', lang: 'mr'), contains('खात्री चुकली'));
      expect(AppStrings.get('status_missed_confirmation', lang: 'en'), 'Missed Confirmation');
    });
  });

  group('Widget Smoke Test', () {
    testWidgets('Renders SmartMedicineDispenserApp smoke test', (WidgetTester tester) async {
      SharedPreferences.setMockInitialValues({
        StorageService.keyLanguage: 'en',
        StorageService.keyRole: 'patient',
        StorageService.keyIsPaired: true,
      });

      final storage = await StorageService.init();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider(
              create: (_) => DispenserProvider(storage),
            ),
          ],
          child: const SmartMedicineDispenserApp(),
        ),
      );

      // Verify title is rendered
      expect(find.text('Smart Medicine Dispenser'), findsOneWidget);
      expect(find.text('Patient Mode'), findsOneWidget);
    });
  });
}
