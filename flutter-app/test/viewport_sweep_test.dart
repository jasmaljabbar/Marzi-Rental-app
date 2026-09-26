// Renders every main screen and form on phone, tablet and desktop sizes, at
// the default and a large system font, with the system bars Android 15+
// draws over edge-to-edge apps. A screen passes when nothing overflows and
// its last action ends above the navigation bar.
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:rental_manager/app/controller.dart';
import 'package:rental_manager/app/shell.dart';
import 'package:rental_manager/core/api.dart';
import 'package:rental_manager/core/models.dart';
import 'package:rental_manager/core/storage.dart';
import 'package:rental_manager/core/theme.dart';
import 'package:rental_manager/core/widgets.dart';
import 'package:rental_manager/features/catalog.dart';
import 'package:rental_manager/features/expenses.dart';
import 'package:rental_manager/features/forms.dart';
import 'package:rental_manager/features/home.dart';
import 'package:rental_manager/features/invoices.dart';
import 'package:rental_manager/features/rentals.dart';
import 'package:rental_manager/features/reports.dart';
import 'package:rental_manager/features/settings.dart';
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

const longName = 'Srinivasan Venkataraghavan Constructions Pvt Ltd';
final customers = [
  {'id': 'c1', 'name': longName, 'phone': '+91 98765 43210', 'address': '12 Long Street, Kochi'},
  {'id': 'c2', 'name': 'Asha', 'phone': '111'},
];
final equipment = [
  {
    'id': 'e1',
    'name': 'Heavy duty concrete mixer 350 litre with hopper',
    'category_id': 'k1',
    'rent_per_day': 1500.5,
    'stock_count': 12,
    'damaged_count': 2,
    'maintenance_logs': [
      {'action': 'Damage', 'remark': 'Cracked drum', 'cost': 250, 'created_at': '2026-09-01T10:00:00Z'},
    ],
  },
  {'id': 'e2', 'name': 'Drill', 'category_id': 'k1', 'rent_per_day': 100, 'stock_count': 3, 'damaged_count': 0},
];
final active = [
  {
    'id': 'r1',
    'customer_id': 'c1',
    'equipment_id': 'e1',
    'quantity': 2,
    'status': 'Active',
    'amount_due': 3001,
    'advance_amount': 500,
    'rented_at': '2026-09-01T10:00:00Z',
    'expected_return_date': '2026-09-03T00:00:00Z',
  },
];
final history = [
  {
    'id': 'r2',
    'customer_id': 'c1',
    'equipment_id': 'e2',
    'quantity': 1,
    'status': 'Completed',
    'amount_due': 120.5,
    'rented_at': '2026-08-01T10:00:00Z',
    'returned_at': '2026-08-04T10:00:00Z',
  },
];
final invoice = {
  'invoice_number': 'INV-2026-000123',
  'issued_at': '2026-08-04T10:00:00Z',
  'payment_status': 'Partial',
  'company': {'name': 'Marzi Rentals', 'address': 'Kochi', 'phone': '123', 'email': 'a@b.c', 'tax_id': 'GST123'},
  'customer': customers.first,
  'rental': {
    'equipment': {'name': 'Drill'},
    'rented_at': '2026-08-01T10:00:00Z',
    'returned_at': '2026-08-04T10:00:00Z',
  },
  'charges': {
    'quantity': 1,
    'days_rented': 3,
    'rent_per_day': 100,
    'gross_amount': 300,
    'tax_rate_percent': 18,
    'tax_amount': 54,
    'total_amount': 354,
    'advance_amount': 100,
    'amount_due': 254,
  },
};
Map<String, dynamic> returnPreview() => {
  'lines': [
    {'rental_id': 'r1', 'quantity': 2, 'days': 3, 'daily_rate': 1500.5, 'total_amount': 9003},
  ],
  'totals': {
    'gross_amount': 9003,
    'discount_amount': 0,
    'tax_amount': 0,
    'total_amount': 9003,
    'advance_amount': 500,
    'refund_amount': 0,
    'amount_due': 8503,
  },
};

Object? route(http.Request r) => switch (r.url.path) {
  '/customers' => customers,
  '/equipment' => equipment,
  '/categories' => [
    {'id': 'k1', 'name': 'Construction and earth-moving machinery'},
  ],
  '/reservations' => [
    {'id': 'h1', 'customer_id': 'c1', 'equipment_id': 'e1', 'quantity': 2},
  ],
  '/rentals' => active,
  '/rentals/history' => history,
  '/rentals/return/preview' => returnPreview(),
  '/equipment/sales' => [
    {'id': 's1', 'equipment_id': 'e2', 'quantity': 1, 'total_price': 900, 'amount_due': 100, 'payment_status': 'Partial'},
  ],
  '/reports/dashboard' => {
    'inventory': {'on_hand_units': 15, 'damaged_units': 2},
    'outstanding_due': {'amount': 3121.5},
  },
  '/reports/summary' => {'money_received': 12000, 'expenses': 3000, 'net_cash': 9000, 'completed_count': 4, 'cancelled_count': 1, 'collection_rate': 80},
  '/reports/payments' => [
    {'customer_name': longName, 'kind': 'advance', 'date': '2026-09-01T10:00:00Z', 'amount': 500, 'method': 'UPI'},
  ],
  '/equipment/sales/summary' => {'total_revenue': 900, 'total_book_value': 700, 'total_gain_loss': 200},
  '/reports/net-profit' => {'revenue': 12900, 'operating_expenses': 3000, 'depreciation_expense': 400, 'net_profit': 9500},
  '/reports/daily' => {'rentals': [], 'money_received': 0},
  '/expenses' => [
    {'id': 'x1', 'category': 'Transport', 'amount': 450.75, 'remark': 'Lorry hire', 'date': '2026-09-02T10:00:00Z', 'payment_mode': 'Cash'},
  ],
  '/auth/users' => [
    {'id': 'u1', 'username': 'boss', 'role': 'owner'},
    {'id': 'u2', 'username': 'desk', 'role': 'staff', 'email': 'desk@example.com'},
  ],
  '/invoices' => [
    {'rental_id': 'r2', 'invoice_number': 'INV-2026-000123', 'customer': customers.first, 'issued_at': '2026-08-04T10:00:00Z', 'total_amount': 354, 'payment_status': 'Partial'},
  ],
  '/invoices/r2' => invoice,
  '/stats' => {'mode': 'cloud-connected'},
  '/settings/max_discount_percent' => {'value': '10'},
  '/account/me' => {
    'company_name': 'Marzi Rentals',
    'plan': {'name': 'Pro', 'price': 999, 'currency': 'INR', 'billing_cycle': 'monthly'},
    'subscription': {'status': 'active', 'remaining_days': 20},
  },
  '/account/usage' => {
    'equipment': {'used': 2, 'limit': 50, 'percent': 4},
  },
  '/account/company' => {'company_name': 'Marzi Rentals', 'default_tax_rate_percent': 18},
  '/catalog' => {'features': []},
  _ => [],
};

AppController fixtureApp() => AppController(
  store: MemoryStore(),
  api: ApiClient(
    token: () => 't',
    client: MockClient((r) async => http.Response(jsonEncode(route(r)), 200, headers: {'content-type': 'application/json'})),
  ),
)
  ..ready = true
  ..token = 't'
  ..username = 'boss'
  ..role = 'owner';

class Viewport {
  final String name;
  final Size size;
  final double navBar, textScale;
  const Viewport(this.name, this.size, {this.navBar = 48, this.textScale = 1});
  @override
  String toString() => '$name ${size.width.toInt()}x${size.height.toInt()} nav $navBar font ${textScale}x';
}

const viewports = [
  Viewport('small phone', Size(320, 568)),
  Viewport('phone, gesture nav', Size(360, 740), navBar: 24),
  Viewport('phone, large font', Size(360, 740), textScale: 1.3),
  Viewport('Pixel 7', Size(412, 915)),
  Viewport('tablet', Size(800, 1280), navBar: 24),
  Viewport('desktop', Size(1280, 800), navBar: 0),
];

void apply(WidgetTester tester, Viewport v) {
  tester.view.devicePixelRatio = 2;
  tester.view.physicalSize = v.size * 2;
  final insets = FakeViewPadding(top: 48, bottom: v.navBar * 2);
  tester.view.padding = insets;
  tester.view.viewPadding = insets;
  tester.platformDispatcher.textScaleFactorTestValue = v.textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
}

Widget app(AppController controller, Widget home) => AppScope(
  controller: controller,
  child: MaterialApp(theme: rentalTheme(Brightness.light), home: home),
);

/// Opens [form] in the app's bottom sheet from a plain page.
Widget sheetHost(Widget form) => Scaffold(
  body: Builder(
    builder: (context) => Center(
      child: TextButton(onPressed: () => sheet(context, form), child: const Text('open sheet')),
    ),
  ),
);

Future<void> settle(WidgetTester tester) async {
  // Let every fixture request resolve, then any animation finish.
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
  await tester.pumpAndSettle();
  final error = tester.takeException();
  if (error != null) fail(error is FlutterError ? error.toStringDeep() : '$error');
}

/// Scrolls to the end, as a user would, and checks [action] is fully above
/// the navigation bar.
Future<void> expectReachable(WidgetTester tester, Viewport v, String action) async {
  // Page by page, settling each time: lists lay out lazily, so their end is
  // only known once reached. The top-most user-scrollable list is the one
  // on screen (the sheet when one is open).
  for (var step = 0; step < 100; step++) {
    final lists = tester
        .stateList<ScrollableState>(find.byType(Scrollable))
        .where((s) => s.position.axis == Axis.vertical && s.position.physics.shouldAcceptUserOffset(s.position));
    if (lists.isEmpty) break;
    final p = lists.last.position;
    if (p.pixels >= p.maxScrollExtent) break;
    p.jumpTo(math.min(p.pixels + p.viewportDimension * .8, p.maxScrollExtent));
    await tester.pumpAndSettle();
  }
  await settle(tester);
  if (find.text(action).evaluate().isEmpty) {
    final texts = tester.widgetList<Text>(find.byType(Text)).map((t) => t.data).whereType<String>().toList();
    fail('"$action" is not on screen at the end of the page; visible: $texts');
  }
  final bottom = tester.getRect(find.text(action).last).bottom;
  expect(bottom, lessThanOrEqualTo(v.size.height - v.navBar), reason: '"$action" must end above the navigation bar');
}

void main() {
  for (final v in viewports) {
    group('$v', () {
      testWidgets('main tabs render and the last item clears the FAB', (tester) async {
        apply(tester, v);
        final controller = fixtureApp();
        await tester.pumpWidget(app(controller, const Shell()));
        await settle(tester);
        Finder destination(String tab) => find.descendant(
          of: find.byWidgetPredicate((w) => w is NavigationBar || w is NavigationRail),
          matching: find.text(tab),
        );
        for (final tab in ['Rentals', 'Inventory', 'Customers', 'More', 'Dashboard', 'More']) {
          await tester.tap(destination(tab));
          await settle(tester);
        }
        await expectReachable(tester, v, 'Version 1.0.0');
        if (v.size.width < 720) {
          final fab = tester.getRect(find.byType(FloatingActionButton));
          final last = tester.getRect(find.text('Version 1.0.0'));
          expect(last.bottom, lessThanOrEqualTo(fab.top), reason: 'the New Rental button does not cover the last item');
        }
        await tester.pumpWidget(const SizedBox());
      });

      testWidgets('new rental flow keeps its confirm actions reachable', (tester) async {
        apply(tester, v);
        final controller = fixtureApp();
        await tester.pumpWidget(app(controller, const Scaffold(body: HomeScreen())));
        await settle(tester);
        await tester.tap(find.byKey(const Key('home-customer-c1')));
        await settle(tester);
        await expectReachable(tester, v, 'Confirm 1 items • ₹3,001/day');

        await tester.pumpWidget(
          app(
            controller,
            RentalFormScreen(
              customer: Record(customers.first),
              items: [Record({...equipment.first, 'quantity': 2})],
              reservations: false,
            ),
          ),
        );
        await settle(tester);
        expect(find.widgetWithText(TextField, '2'), findsOneWidget);
        await expectReachable(tester, v, 'Confirm Rental');
        await tester.pumpWidget(const SizedBox());
      });

      testWidgets('detail pages render and scroll to their end', (tester) async {
        apply(tester, v);
        final controller = fixtureApp();
        final pages = <Widget, String>{
          CustomerDetailScreen(customer: Record(customers.first)): 'Add payment',
          EquipmentDetailScreen(equipment: Record(equipment.first)): 'Maintenance history',
          const InvoiceScreen(rentalId: 'r2'): 'Download',
          const InvoiceListScreen(): 'INV-2026-000123',
          const DamagedScreen(): 'Mark Repaired',
          const ReportsScreen(): 'Generate / Share PDF',
          const CompanyScreen(): 'Save changes',
          const AccountScreen(): 'Features',
          const TeamScreen(): 'desk',
          const MasterScreen(): 'Construction and earth-moving machinery',
          const DashboardScreen(): 'Overdue',
          const Scaffold(body: ExpensesScreen()): 'Delete',
        };
        for (final entry in pages.entries) {
          await tester.pumpWidget(const SizedBox());
          await tester.pumpWidget(app(controller, entry.key));
          await settle(tester);
          await expectReachable(tester, v, entry.value);
        }
        await tester.pumpWidget(const SizedBox());
      });

      testWidgets('forms in bottom sheets fit and end above the navigation bar', (tester) async {
        apply(tester, v);
        final controller = fixtureApp();
        final rental = Record(active.first);
        final forms = <Widget, String>{
          const CustomerForm(): 'Close',
          const EquipmentForm(): 'Close',
          SaleForm(item: Record(equipment.first), customers: customers.map(Record.new).toList()): 'Record sale',
          ReturnForm(rentals: [rental], equipment: equipment.map(Record.new).toList(), origin: ReturnOrigin.rentals): 'Cancel',
          RentalEditForm(rental: rental): 'Save changes',
          PaymentForm(rental: rental): 'Save payment',
          const AddTeamMemberForm(): 'Add',
          const ExpenseForm(): 'Save',
          const BundleRentalForm(): 'Continue',
          const CustomerPicker(): 'Create new customer',
          OperationForm(
            title: 'Add Stock — $longName',
            fields: const {'Quantity': '1', 'Unit Price (INR)': '0', 'Note': ''},
            integers: const {'Quantity'},
            numbers: const {'Unit Price (INR)'},
            submit: (_) async {},
          ): 'Cancel',
        };
        for (final entry in forms.entries) {
          // A fresh app each time, so no earlier sheet is left open.
          await tester.pumpWidget(const SizedBox());
          await tester.pumpWidget(app(controller, sheetHost(entry.key)));
          await tester.tap(find.text('open sheet'));
          await settle(tester);
          await expectReachable(tester, v, entry.value);
        }
        await tester.pumpWidget(const SizedBox());
      });
    });
  }
}
