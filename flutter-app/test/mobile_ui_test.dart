import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:rental_manager/app/controller.dart';
import 'package:rental_manager/core/api.dart';
import 'package:rental_manager/core/models.dart';
import 'package:rental_manager/core/storage.dart';
import 'package:rental_manager/core/theme.dart';
import 'package:rental_manager/core/widgets.dart';
import 'package:rental_manager/features/catalog.dart';
import 'package:rental_manager/features/home.dart';
import 'package:rental_manager/features/rentals.dart';
import 'package:rental_manager/features/team.dart';

class MemoryStore extends LocalStore {
  MemoryStore() : super(tokens: MemoryTokenStore());
  final values = <String, String>{};
  @override
  Future<void> init() async {}
  @override
  String get(String key) => values[key] ?? '';
  @override
  Future<void> put(String key, String value) async => values[key] = value;
  @override
  Future<void> remove(String key) async => values.remove(key);
}

http.Response json(Object body, [int status = 200]) =>
    http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json'});

AppController appWith(Future<http.Response> Function(http.Request) handler) => AppController(
  store: MemoryStore(),
  api: ApiClient(token: () => 't', client: MockClient(handler)),
)
  ..ready = true
  ..token = 't';

Widget scoped(AppController app, Widget home) => AppScope(
  controller: app,
  child: MaterialApp(theme: rentalTheme(Brightness.light), home: home),
);

/// Height of the Android navigation bar (3-button mode) in logical pixels.
const navBar = 48.0;

/// A 360×740 phone drawing edge-to-edge behind a 24dp status bar and a
/// 48dp navigation bar, as Android 15+ does for apps targeting SDK 35+.
void phone(WidgetTester tester, {double width = 360, double height = 740}) {
  tester.view.devicePixelRatio = 3;
  tester.view.physicalSize = Size(width * 3, height * 3);
  const insets = FakeViewPadding(top: 24 * 3, bottom: navBar * 3);
  tester.view.padding = insets;
  tester.view.viewPadding = insets;
  addTearDown(tester.view.reset);
}

/// Scrolls every scrollable to its end, as a user would to reach the last action.
Future<void> scrollToEnd(WidgetTester tester) async {
  for (final state in tester.stateList<ScrollableState>(find.byType(Scrollable))) {
    final position = state.position;
    if (position.axis == Axis.vertical) position.jumpTo(position.maxScrollExtent);
  }
  await tester.pumpAndSettle();
}

void expectAboveNavBar(WidgetTester tester, Finder finder) {
  final screen = tester.view.physicalSize.height / tester.view.devicePixelRatio;
  expect(
    tester.getRect(finder).bottom,
    lessThanOrEqualTo(screen - navBar),
    reason: 'the action must sit above the system navigation bar, not under it',
  );
}

void main() {
  testWidgets('Bottom sheets keep their last action above the navigation bar', (tester) async {
    phone(tester);
    await tester.pumpWidget(
      MaterialApp(
        theme: rentalTheme(Brightness.light),
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => sheet(
                context,
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 900),
                    ElevatedButton(onPressed: () {}, child: const Text('Save')),
                  ],
                ),
              ),
              child: const Text('Open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    await scrollToEnd(tester);
    expectAboveNavBar(tester, find.text('Save'));
  });

  testWidgets('New rental shows whole-number quantities and keeps Confirm reachable', (tester) async {
    phone(tester);
    Map<String, dynamic>? created;
    final app = appWith((r) async {
      if (r.url.path == '/rentals/bulk') {
        created = jsonDecode(r.body) as Map<String, dynamic>;
        return json([]);
      }
      return json([]);
    });
    await tester.pumpWidget(
      scoped(
        app,
        RentalFormScreen(
          customer: Record({'id': 'c1', 'name': 'Asha', 'phone': '111'}),
          // Draft rows carry the quantity the reservation holds; stock is a count.
          items: [
            Record({'id': 'e1', 'name': 'Drill', 'rent_per_day': 100, 'stock_count': 5, 'quantity': 2.0}),
          ],
          reservations: false,
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.widgetWithText(TextField, '2'), findsOneWidget, reason: 'quantity 2.0 displays as 2');
    expect(find.textContaining('5 available'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextField, '2'), '3');
    await tester.pumpAndSettle();
    await scrollToEnd(tester);
    expectAboveNavBar(tester, find.text('Confirm Rental'));
    await tester.tap(find.text('Confirm Rental'));
    await tester.pumpAndSettle();
    final items = created!['items'] as List;
    expect(items.single['quantity'], 3);
    expect(items.single['quantity'], isA<int>(), reason: 'sent as 3, not 3.0');
  });

  testWidgets('Rental cards show counts without a decimal part', (tester) async {
    phone(tester);
    await tester.pumpWidget(
      scoped(
        appWith((_) async => json([])),
        Scaffold(
          body: RentalCard(
            rental: Record({
              'id': 'r1',
              'equipment_id': 'e1',
              'customer_id': 'c1',
              'quantity': 2,
              'status': 'Active',
              'amount_due': 0,
              'rented_at': '2026-09-01T10:00:00Z',
            }),
            equipment: [Record({'id': 'e1', 'name': 'Drill'})],
            customers: [Record({'id': 'c1', 'name': 'Asha'})],
          ),
        ),
      ),
    );
    expect(find.textContaining('Qty 2.0'), findsNothing);
    expect(find.text('Asha • Qty 2'), findsOneWidget);
  });

  testWidgets('Damaged equipment opens as a full page with a back button', (tester) async {
    phone(tester);
    await tester.pumpWidget(scoped(appWith((_) async => json([])), const DamagedScreen()));
    await tester.pumpAndSettle();
    expect(find.byType(AppBar), findsOneWidget);
    expect(find.byType(Scaffold), findsOneWidget);
  });

  testWidgets('Add team member fits a 320dp phone without overflowing', (tester) async {
    phone(tester, width: 320, height: 640);
    await tester.pumpWidget(
      scoped(
        appWith((_) async => json([])),
        Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => sheet(context, const AddTeamMemberForm()),
              child: const Text('Open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Equipment cards on Home fit at a large system font size', (tester) async {
    phone(tester);
    tester.platformDispatcher.textScaleFactorTestValue = 1.3;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final app = appWith((r) async {
      if (r.url.path == '/equipment') {
        return json([
          {'id': 'e1', 'name': 'Concrete mixer 350L', 'rent_per_day': 1500, 'stock_count': 12, 'damaged_count': 0},
          {'id': 'e2', 'name': 'Drill', 'rent_per_day': 100, 'stock_count': 3, 'damaged_count': 1},
        ]);
      }
      return json([]);
    });
    await tester.pumpWidget(scoped(app, const Scaffold(body: HomeScreen())));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('12 in stock'), findsOneWidget);
  });

  test('Counts read as whole numbers; decimals keep their precision', () {
    expect(Record({'quantity': 2.0}).count('quantity'), 2);
    expect(Record({'quantity': '3'}).count('quantity'), 3);
    expect(Record({}).count('quantity', 1), 1);
    expect(intValue(''), 0);
    expect(intValue('abc', 1), 1);
    expect(available(Record({'stock_count': 5.0, 'damaged_count': 1})), 4);
    expect(decimalText(18.0), '18');
    expect(decimalText(18.5), '18.5');
    expect(decimalText(12.345), '12.35');
    expect(money(1500.5), '₹1,500.5');
  });

  testWidgets('Integer fields take digits only; decimal fields take one point', (tester) async {
    final count = TextEditingController(), amount = TextEditingController();
    addTearDown(count.dispose);
    addTearDown(amount.dispose);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              Field('Quantity', count, integer: true),
              Field('Amount', amount, number: true),
            ],
          ),
        ),
      ),
    );
    final fields = tester.widgetList<TextField>(find.byType(TextField)).toList();
    expect(fields[0].keyboardType, TextInputType.number);
    expect(fields[1].keyboardType, const TextInputType.numberWithOptions(decimal: true));

    await tester.enterText(find.byType(TextField).first, '2.5');
    expect(count.text, '2.5', reason: 'invalid decimals are preserved for inline correction, never changed into 25');
    await tester.enterText(find.byType(TextField).first, '-3');
    expect(count.text, '-3');

    await tester.enterText(find.byType(TextField).last, '12,5');
    expect(amount.text, '12.5', reason: 'a comma decimal separator becomes a point');
    await tester.enterText(find.byType(TextField).last, '12.5.1');
    expect(amount.text, '12.5', reason: 'a second point is rejected');
    await tester.enterText(find.byType(TextField).last, '9.999');
    expect(amount.text, '12.5', reason: 'at most two decimal places');
    await tester.enterText(find.byType(TextField).last, '9.99');
    expect(amount.text, '9.99');
  });

  testWidgets('Tapping outside a field closes the keyboard', (tester) async {
    final c = TextEditingController();
    addTearDown(c.dispose);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              Field('Amount', c, number: true),
              const SizedBox(height: 200, width: 200, child: Text('elsewhere')),
            ],
          ),
        ),
      ),
    );
    await tester.tap(find.byType(TextField));
    await tester.pump();
    expect(tester.testTextInput.isVisible, isTrue);
    await tester.tap(find.text('elsewhere'));
    await tester.pump();
    expect(FocusManager.instance.primaryFocus?.context?.widget, isNot(isA<EditableText>()));
    expect(tester.testTextInput.isVisible, isFalse);
  });

  testWidgets('Page lists clear the navigation bar and a floating action button', (tester) async {
    phone(tester);
    EdgeInsets padding(WidgetTester tester) =>
        tester.widget<ListView>(find.byType(ListView)).padding!.resolve(TextDirection.ltr);

    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: PageList(children: [Text('last')]))));
    expect(padding(tester).bottom, 16 + navBar);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          floatingActionButton: FloatingActionButton(onPressed: () {}, child: const Icon(Icons.add)),
          body: const PageList(children: [Text('last')]),
        ),
      ),
    );
    expect(padding(tester).bottom, 16 + navBar + 80);

    // A bottom bar owns the inset, so the list above it only keeps its gap.
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          bottomNavigationBar: BottomActionBar(child: Text('action')),
          body: PageList(children: [Text('last')]),
        ),
      ),
    );
    expect(padding(tester).bottom, 16);
    expectAboveNavBar(tester, find.text('action'));
  });

  testWidgets('Editing a rental shows its quantity as fixed and does not send it', (tester) async {
    phone(tester);
    Map<String, dynamic>? saved;
    final app = appWith((r) async {
      if (r.method == 'PUT') saved = jsonDecode(r.body) as Map<String, dynamic>;
      return json({'id': 'r1'});
    });
    await tester.pumpWidget(
      scoped(
        app,
        Scaffold(
          body: SingleChildScrollView(
            child: RentalEditForm(
              rental: Record({'id': 'r1', 'quantity': 3, 'advance_amount': 100, 'rented_at': '2026-09-01T10:00:00Z'}),
            ),
          ),
        ),
      ),
    );
    expect(find.text('Quantity 3'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Quantity'), findsNothing);
    await tester.ensureVisible(find.text('Save changes'));
    await tester.tap(find.text('Save changes'));
    await tester.pumpAndSettle();
    expect(saved, isNotNull);
    expect(saved!.containsKey('quantity'), isFalse);
    expect(saved!['advance_amount'], 100);
  });
}
