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
import 'package:rental_manager/features/rentals.dart';
import 'package:rental_manager/features/settings.dart';
import 'package:rental_manager/main.dart';

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

http.Response json(Object body, [int status = 200]) => http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json'});

Widget scoped(AppController app, Widget child) => AppScope(
  controller: app,
  child: MaterialApp(theme: rentalTheme(Brightness.light), home: Scaffold(body: child)),
);

void main() {
  testWidgets('Login asks for the business code when the username is shared, then signs in', (tester) async {
    final bodies = <Map<String, dynamic>>[];
    final api = ApiClient(
      token: () => '',
      client: MockClient((r) async {
        if (r.url.path == '/auth/login') {
          final body = jsonDecode(r.body) as Map<String, dynamic>;
          bodies.add(body);
          if (body['business_code'] == null) {
            return json({'detail': 'more than one business', 'code': 'BUSINESS_CODE_REQUIRED'}, 409);
          }
          return json({'access_token': 't1', 'username': 'admin', 'role': 'owner', 'business_code': 'alpha'});
        }
        if (r.url.path == '/shops') return json([{'id': 's1', 'name': 'Main', 'is_active': true}]);
        if (r.url.path.startsWith('/account') || r.url.path == '/catalog' || r.url.path == '/stats') return json({});
        return json([]);
      }),
    );
    final app = AppController(store: MemoryStore(), api: api)..ready = true;
    await tester.pumpWidget(RentalApp(controller: app, autoStart: false));

    await tester.enterText(find.widgetWithText(TextField, 'Username *'), 'admin');
    await tester.enterText(find.widgetWithText(TextField, 'Password'), 'secret-pass-1');
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    expect(find.textContaining('more than one business'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextField, 'Business code'), 'alpha');
    await tester.ensureVisible(find.text('Sign in'));
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(bodies.last['business_code'], 'alpha');
    expect(app.token, 't1');
    expect(app.businessCode, 'alpha');
    expect(app.activeShopId, 's1', reason: 'the shop is selected after login and sent as X-Shop-Id');
    expect(await app.store.tokens.read(), 't1', reason: 'the token is kept in the secure token store');
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('Staff do not see owner/admin tools in the More menu', (tester) async {
    final api = ApiClient(token: () => 't', client: MockClient((r) async => json(r.url.path == '/stats' ? {'mode': 'cloud-connected'} : {})));
    final staff = AppController(store: MemoryStore(), api: api)
      ..ready = true
      ..token = 't'
      ..username = 'desk'
      ..role = 'staff';
    await tester.pumpWidget(scoped(staff, const MoreScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Team'), findsNothing);
    expect(find.text('Master'), findsNothing);
    expect(find.text('Rental Rules'), findsNothing);
    expect(find.text('Change my password'), findsOneWidget);

    final owner = AppController(store: MemoryStore(), api: api)
      ..ready = true
      ..token = 't'
      ..username = 'boss'
      ..role = 'owner';
    await tester.pumpWidget(scoped(owner, const MoreScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Team'), findsOneWidget);
    expect(find.text('Rental Rules'), findsOneWidget);
  });

  testWidgets('Return form shows the server-computed bill and submits damage with the return', (tester) async {
    Map<String, dynamic>? submitted;
    Map<String, dynamic> preview(Map<String, dynamic> body) {
      final damage = (body['damages'] as List?)?.isNotEmpty == true ? ((body['damages'] as List).first['amount'] as num).toDouble() : 0.0;
      final total = 300 + damage;
      return {
        'lines': [
          {'rental_id': 'r1', 'days': 3, 'daily_rate': 100, 'quantity': 1, 'total_amount': total},
        ],
        'totals': {'gross_amount': 300, 'discount_amount': 0, 'late_fee_amount': 0, 'damage_amount': damage, 'tax_amount': 0, 'total_amount': total, 'advance_amount': 100, 'refund_amount': 0, 'amount_due': total - 100},
      };
    }

    final api = ApiClient(
      token: () => 't',
      client: MockClient((r) async {
        final body = r.body.isEmpty ? <String, dynamic>{} : jsonDecode(r.body) as Map<String, dynamic>;
        if (r.url.path == '/rentals/return/preview') return json(preview(body));
        if (r.url.path == '/rentals/return') {
          submitted = body;
          return json({'rentals': [], 'summary': preview(body)});
        }
        return json({});
      }),
    );
    final app = AppController(store: MemoryStore(), api: api)
      ..ready = true
      ..token = 't';
    final rental = Record({
      'id': 'r1',
      'equipment_id': 'e1',
      'customer_id': 'c1',
      'quantity': 1,
      'advance_amount': 100,
      'equipment': {'id': 'e1', 'name': 'Mixer'},
    });
    await tester.pumpWidget(
      scoped(app, SingleChildScrollView(child: ReturnForm(rentals: [rental], equipment: const [], origin: ReturnOrigin.equipment))),
    );
    await tester.pumpAndSettle();
    expect(find.text('Qty 1 • 3 day(s) × ₹100'), findsOneWidget);
    expect(find.text('Still due: ₹200'), findsOneWidget);

    await tester.tap(find.text('Report damage'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, 'Damage charge'), '50');
    await tester.pumpAndSettle();
    expect(find.text('Still due: ₹250'), findsOneWidget);

    await tester.ensureVisible(find.text('Confirm Return & Pay'));
    await tester.tap(find.text('Confirm Return & Pay'));
    await tester.pumpAndSettle();
    expect(submitted?['rental_ids'], ['r1']);
    expect((submitted?['damages'] as List).first['amount'], 50);
  });
}
