import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sembast/sembast_io.dart';
import 'package:rental_manager/core/api.dart';
import 'package:rental_manager/core/offline_store.dart';
import 'package:rental_manager/core/validation.dart';

void main() {
  test(
    'Valid drafts survive restart, invalid drafts never queue, rejections preserve data for correction',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'rental-offline-test',
      );
      addTearDown(() => directory.delete(recursive: true));
      final path = '${directory.path}/test.db';
      var store = OfflineStore(
        open: () => databaseFactoryIo.openDatabase(path),
      );
      await store.init();
      var mode = 'offline', calls = 0;
      var user = 'owner';
      final client = ApiClient(
        token: () => 'token',
        shopId: () => 'shop',
        client: MockClient((request) async {
          calls++;
          if (mode == 'offline') throw http.ClientException('offline');
          if (mode == 'reject') {
            return http.Response(
              jsonEncode({
                'detail': 'Phone number is already registered.',
                'code': 'DUPLICATE_PHONE',
              }),
              409,
            );
          }
          return http.Response(
            jsonEncode({'id': 'server-id', ...jsonDecode(request.body) as Map}),
            201,
          );
        }),
      );
      var repo = RentalRepository(client, local: store, identity: () => user);
      await expectLater(
        repo.save('/customers', {'name': 'Bad', 'phone': '987654321'}),
        throwsA(isA<InputProblem>()),
      );
      expect(await repo.pending(), isEmpty);
      expect(calls, 0);
      final draft = await repo.save('/customers', {
        'name': 'Keep me',
        'phone': '9876543210',
      });
      expect(draft.text('sync_status'), 'pending');
      await repo.syncPending();
      final syncId = (await repo.pending()).single['id'];
      await store.close();
      store = OfflineStore(open: () => databaseFactoryIo.openDatabase(path));
      await store.init();
      addTearDown(store.close);
      repo = RentalRepository(client, local: store, identity: () => user);
      expect((await repo.pending()).single['id'], syncId);
      user = 'another-owner';
      expect(await repo.pending(), isEmpty);
      user = 'owner';
      mode = 'reject';
      await repo.syncPending();
      final rejected = (await repo.pending()).single;
      expect(rejected['status'], 'failed');
      expect(rejected['message'], contains('Phone number'));
      expect((rejected['body'] as Map)['name'], 'Keep me');
      final oldCalls = calls;
      await repo.syncPending();
      expect(
        calls,
        oldCalls,
        reason: 'failed validation does not retry endlessly',
      );
      mode = 'success';
      await repo.correct(rejected, {
        'name': 'Keep me',
        'phone': '+919876543211',
      });
      expect(await repo.pending(), isEmpty);
    },
  );
  test(
    'Cached reads work offline and payments never enter catalog outbox',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'rental-cache-test',
      );
      final store = OfflineStore(
        open: () =>
            databaseFactoryIo.openDatabase('${directory.path}/cache.db'),
      );
      await store.init();
      addTearDown(() async {
        await store.close();
        await directory.delete(recursive: true);
      });
      var online = true, calls = 0;
      final repo = RentalRepository(
        ApiClient(
          token: () => 't',
          shopId: () => 'shop',
          client: MockClient((r) async {
            calls++;
            if (!online) throw http.ClientException('offline');
            return http.Response(
              '[{"id":"one","name":"Cached customer"}]',
              200,
            );
          }),
        ),
        local: store,
        identity: () => 'owner',
      );
      expect((await repo.list('/customers')).single.name, 'Cached customer');
      online = false;
      expect((await repo.list('/customers')).single.name, 'Cached customer');
      expect(calls, 1);
      await expectLater(
        repo.save('/rentals/one/payment', {'amount_paid': 10}),
        throwsA(isA<http.ClientException>()),
      );
      expect(await repo.pending(), isEmpty);
    },
  );
}
