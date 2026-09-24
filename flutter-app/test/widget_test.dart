import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:rental_manager/app/controller.dart';
import 'package:rental_manager/core/api.dart';
import 'package:rental_manager/core/storage.dart';
import 'package:rental_manager/core/theme.dart';
import 'package:rental_manager/features/home.dart';
import 'package:rental_manager/main.dart';

class MemoryStore extends LocalStore {
  MemoryStore() : super(tokens: MemoryTokenStore());
  final values = <String, String>{};
  @override
  Future<void> init() async {}
  @override
  String get(String key) => values[key] ?? '';
  @override
  Future<void> put(String key, String value) async {
    values[key] = value;
  }

  @override
  Future<void> remove(String key) async {
    values.remove(key);
  }
}

void main() {
  testWidgets(
    'Signup validates required fields and the password policy',
    (tester) async {
      final app = AppController(store: MemoryStore());
      app.ready = true;
      await tester.pumpWidget(RentalApp(controller: app, autoStart: false));
      expect(find.text('Welcome back'), findsOneWidget);
      await tester.tap(find.text('Create a business account'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Start free trial'));
      await tester.tap(find.text('Start free trial'));
      await tester.pumpAndSettle();
      expect(find.text('Enter your business name and a username.'), findsOneWidget);
    },
  );
  testWidgets('Authenticated shell renders five primary destinations', (
    tester,
  ) async {
    final api = ApiClient(
      token: () => 'fixture',
      client: MockClient(
        (r) async => http.Response(
          jsonEncode(
            r.url.path == '/stats'
                ? {'mode': 'cloud-connected'}
                : r.url.path.startsWith('/account') || r.url.path == '/catalog'
                ? {}
                : [],
          ),
          200,
        ),
      ),
    );
    final app = AppController(store: MemoryStore(), api: api)
      ..ready = true
      ..token = 'fixture'
      ..username = 'Fixture';
    await tester.pumpWidget(RentalApp(controller: app, autoStart: false));
    await tester.pumpAndSettle();
    for (final name in [
      'Dashboard',
      'Rentals',
      'Inventory',
      'Customers',
      'More',
    ]) {
      expect(find.text(name), findsWidgets);
    }
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('More').last);
    await tester.pumpAndSettle();
    expect(find.text('Appearance'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('Home customer stories scroll and reuse customer selection', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(320, 700));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final api = ApiClient(
      token: () => 'fixture',
      client: MockClient((request) async {
        if (request.url.path == '/customers') {
          return http.Response(
            jsonEncode([
              {'id': 'c1', 'name': 'Asha', 'phone': '111'},
              {'id': 'c2', 'name': 'Bilal', 'phone': '222'},
              {'id': 'c3', 'name': 'Chen', 'phone': '333'},
              {'id': 'c4', 'name': 'Deepa', 'phone': '444'},
              {'id': 'c5', 'name': 'Elena', 'phone': '555'},
            ]),
            200,
          );
        }
        return http.Response('[]', 200);
      }),
    );
    final app = AppController(store: MemoryStore(), api: api)
      ..ready = true
      ..token = 'fixture';

    await tester.pumpWidget(
      AppScope(
        controller: app,
        child: MaterialApp(
          theme: rentalTheme(Brightness.light),
          home: const Scaffold(body: HomeScreen()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('home-customer-strip')), findsOneWidget);
    expect(find.text('Asha'), findsOneWidget);
    await tester.tap(find.byKey(const Key('home-customer-c1')));
    await tester.pumpAndSettle();
    expect(find.text('111'), findsOneWidget);

    await tester.drag(
      find.byKey(const Key('home-customer-strip')),
      const Offset(-220, 0),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
}
