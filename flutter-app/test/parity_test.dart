import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:rental_manager/core/api.dart';
import 'package:rental_manager/core/models.dart';

void main() {
  final baseline =
      jsonDecode(
            File('../migration/test-results/baseline.json').readAsStringSync(),
          )
          as Map<String, dynamic>;
  final now = DateTime.parse(baseline['clock'] as String);
  test('Billing elapsed day boundaries match React Native', () {
    expect(daysSince(now.toIso8601String(), now), 1);
    expect(
      daysSince(now.subtract(const Duration(days: 1)).toIso8601String(), now),
      1,
    );
    expect(
      daysSince(
        now
            .subtract(const Duration(days: 1, milliseconds: 1))
            .toIso8601String(),
        now,
      ),
      2,
    );
    expect(
      daysSince(now.add(const Duration(days: 1)).toIso8601String(), now),
      1,
    );
  });
  test('Available stock clamps damage and missing values', () {
    expect(available(Record({'stock_count': 2, 'damaged_count': 3})), 0);
    expect(available(Record({})), 0);
  });
  test('API preserves body, zero, false, null and bearer token', () async {
    late http.Request captured;
    final api = ApiClient(
      token: () => 'fixture',
      baseUrl: 'https://example.test/',
      client: MockClient((r) async {
        captured = r;
        return http.Response('', 200);
      }),
    );
    expect(
      await api.request(
        'PUT',
        '/rentals/r1',
        body: {'quantity': 0, 'remark': null},
        query: {'include_cancelled': false, 'page': 0, 'search': ''},
      ),
      isEmpty,
    );
    expect(captured.headers['Authorization'], 'Bearer fixture');
    expect(jsonDecode(captured.body), {'quantity': 0, 'remark': null});
    expect(captured.url.queryParameters, {
      'include_cancelled': 'false',
      'page': '0',
    });
  });
  test('Image upload sends the MIME type and the upload kind', () async {
    late http.Request captured;
    final api = ApiClient(
      token: () => 'fixture',
      baseUrl: 'https://example.test',
      client: MockClient((request) async {
        captured = request;
        return http.Response('{"url":"https://example.test/files/t/a/customer_doc/x.webp"}', 201);
      }),
    );
    final url = await api.upload(
      Uint8List.fromList([0xff, 0xd8, 0xff, 0xd9]),
      'camera.jpg',
      kind: UploadKind.customerDoc,
    );
    expect(url, 'https://example.test/files/t/a/customer_doc/x.webp');
    expect(captured.url.queryParameters['kind'], 'customer_doc');
    expect(captured.headers['authorization'], 'Bearer fixture');
    final multipartBody = latin1.decode(captured.bodyBytes);
    expect(multipartBody, contains('content-type: image/jpeg'));
    expect(multipartBody, contains('name="file"'));
  });
  test('Reservation 409 retains transfer information', () async {
    final api = ApiClient(
      token: () => '',
      client: MockClient(
        (_) async => http.Response(
          jsonEncode({
            'detail': 'Held',
            'conflict': {'reservation_id': 'h1'},
            'available_for_you': 0,
          }),
          409,
        ),
      ),
    );
    await expectLater(
      RentalRepository(api).reserve('c1', 'e1', 1),
      throwsA(
        isA<ApiError>()
            .having((e) => e.status, 'status', 409)
            .having((e) => e.body['conflict']['reservation_id'], 'hold', 'h1'),
      ),
    );
  });
  test('Pagination uses headers and facade page size', () async {
    final api = ApiClient(
      token: () => '',
      client: MockClient(
        (_) async => http.Response(
          '[{"id":"a"}]',
          200,
          headers: {'x-total-count': '21', 'x-total-pages': '99'},
        ),
      ),
    );
    final page = await api.page('/customers', query: {'page_size': 10});
    expect(page.totalCount, 21);
    expect(page.totalPages, 3);
  });
  test('Returns are previewed and completed on the server', () async {
    final calls = <String, Map<String, dynamic>>{};
    final api = ApiClient(
      token: () => '',
      client: MockClient((r) async {
        calls[r.url.path] = jsonDecode(r.body) as Map<String, dynamic>;
        return http.Response('{"rentals":[],"summary":{"totals":{"amount_due":0}}}', 200);
      }),
    );
    final repo = RentalRepository(api);
    final body = {'rental_ids': ['r1', 'r2'], 'discount_amount': 10.0, 'amount_paid': 50.0};
    await repo.previewReturn(body);
    await repo.completeReturn(body);
    expect(calls['/rentals/return/preview'], body);
    expect(calls['/rentals/return'], body);
  });
  test('Every request carries the active shop, and a 401 signs the user out', () async {
    late http.BaseRequest captured;
    var signedOut = 0;
    final api = ApiClient(
      token: () => 'fixture',
      shopId: () => 'shop-2',
      onUnauthorized: () => signedOut++,
      client: MockClient((r) async {
        captured = r;
        return http.Response('{"detail":"expired"}', r.url.path == '/auth/login' ? 401 : 401);
      }),
    );
    await expectLater(api.request('GET', '/customers'), throwsA(isA<ApiError>()));
    expect(captured.headers['X-Shop-Id'], 'shop-2');
    expect(signedOut, 1);
    await expectLater(api.request('POST', '/auth/login', body: {}), throwsA(isA<ApiError>()));
    expect(signedOut, 1, reason: 'a failed login is not a lost session');
  });
  test('Error codes are exposed for flows like BUSINESS_CODE_REQUIRED', () async {
    final api = ApiClient(
      token: () => '',
      client: MockClient((_) async => http.Response('{"detail":"used by more than one business","code":"BUSINESS_CODE_REQUIRED"}', 409)),
    );
    await expectLater(
      api.request('POST', '/auth/login', body: {}),
      throwsA(isA<ApiError>().having((e) => e.code, 'code', 'BUSINESS_CODE_REQUIRED')),
    );
  });
  test('Media URLs are never joined with a double slash', () {
    expect(resolveMediaUrl('/static/a.jpg', 'http://h:5000/'), 'http://h:5000/static/a.jpg');
    expect(resolveMediaUrl('files/a.webp', 'http://h:5000'), 'http://h:5000/files/a.webp');
    expect(resolveMediaUrl('https://cdn.test/a.webp', 'http://h:5000'), 'https://cdn.test/a.webp');
  });
  test('Money uses the business currency', () {
    setCurrency('USD');
    expect(money(1234.5), r'$1,234.5');
    setCurrency('INR');
    expect(money(10), '₹10');
  });
  test('HTTP failures without JSON retain status', () async {
    final api = ApiClient(
      token: () => '',
      client: MockClient((_) async => http.Response('Unavailable', 503)),
    );
    await expectLater(
      api.request('GET', '/health'),
      throwsA(isA<ApiError>().having((e) => e.message, 'message', 'HTTP 503')),
    );
  });
}
