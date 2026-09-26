import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:phone_numbers_parser/phone_numbers_parser.dart';
import 'package:rental_manager/core/validation.dart';
import 'package:rental_manager/core/phone_field.dart';
import 'package:rental_manager/core/payload_validation.dart';
import 'package:rental_manager/core/widgets.dart';

void main() {
  test('Phone validation uses selected country metadata', () {
    expect(parsedPhone('98765-43210')?.international, '+919876543210');
    for (final value in [
      '987654321',
      '98765432101',
      '+9109876543210',
      '+91919876543210',
      'a9876543210',
    ]) {
      expect(phoneProblem(value), isNotNull, reason: value);
    }
    expect(phoneProblem('41234567', country: IsoCode.NO), isNull);
    expect(phoneProblem('020 7946 0018', country: IsoCode.GB), isNull);
    expect(phoneProblem('+33 6 12 34 56 78', country: IsoCode.FR), isNull);
    expect(phoneProblem('+47 41234567', country: IsoCode.IN), isNotNull);
  });
  test(
    'Counts, money, email, required values and dates reject invalid input',
    () {
      expect(numberProblem('2', integer: true), isNull);
      for (final value in ['1.5', '-1', 'NaN', 'Infinity', '1e2']) {
        expect(numberProblem(value, integer: true), isNotNull);
      }
      expect(numberProblem('12.50'), isNull);
      expect(numberProblem('12.345'), isNotNull);
      expect(() => inputCount('1.5'), throwsA(isA<InputProblem>()));
      expect(emailProblem(' user@example.com '), isNull);
      for (final value in [
        'a@b',
        'a@@example.com',
        'a..b@example.com',
        'a b@example.com',
      ]) {
        expect(emailProblem(value), isNotNull);
      }
      expect(textProblem('  ', required: true), isNotNull);
      expect(dateRangeProblem('2026-09-26', '2026-09-25'), isNotNull);
      expect(
        () => validatePayload('/expenses', {
          'category': 'Fuel',
          'amount': double.infinity,
        }),
        throwsA(isA<InputProblem>()),
      );
      expect(
        () => validatePayload('/expenses', {
          'category': 'Fuel',
          'amount': 10,
          'date': '2026-02-30',
        }),
        throwsA(isA<InputProblem>()),
      );
    },
  );
  testWidgets('Inline errors preserve text and clear after correction', (
    tester,
  ) async {
    final count = TextEditingController(text: '1.5'),
        name = TextEditingController(text: 'Keep this');
    addTearDown(count.dispose);
    addTearDown(name.dispose);
    var submitted = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Form(
            child: Column(
              children: [
                Field('Name', name, required: true),
                Field('Quantity', count, integer: true, required: true, min: 1),
                ActionButton('Save', () async {
                  submitted = true;
                }),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(submitted, isFalse);
    expect(find.text('Quantity must be a whole number.'), findsOneWidget);
    expect(count.text, '1.5');
    expect(name.text, 'Keep this');
    await tester.enterText(find.widgetWithText(TextField, 'Quantity *'), '2');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(submitted, isTrue);
    expect(find.text('Quantity must be a whole number.'), findsNothing);
  });
  testWidgets('Phone input stores country code once', (tester) async {
    final phone = TextEditingController();
    addTearDown(phone.dispose);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Form(
            child: Column(
              children: [
                PhoneField(phone, required: true),
                ActionButton('Save', () async {}),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.enterText(find.byType(TextField), '+91 (98765) 43210');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(phone.text, '+919876543210');
  });
}
