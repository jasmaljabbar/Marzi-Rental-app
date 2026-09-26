import 'package:sembast/sembast.dart';
import 'models.dart';
import 'platform/local_database.dart';

/// Each user/server/shop has a separate namespace. Outbox rows are written
/// before any network mutation. Failed rows remain until corrected or removed.
class OfflineStore {
  final Future<Database> Function() open;
  Database? _database;
  OfflineStore({Future<Database> Function()? open})
    : open = open ?? openLocalDatabase;
  Future<void> init() async {
    _database ??= await open();
  }

  bool get ready => _database != null;
  final _cache = stringMapStoreFactory.store('cache');
  final _outbox = stringMapStoreFactory.store('outbox');
  Future<Json?> cached(String key) async => ready
      ? (await _cache.record(key).get(_database!))?.map(
          (k, v) => MapEntry(k, v),
        )
      : null;
  Future<void> cache(String key, Json value) async {
    if (ready) await _cache.record(key).put(_database!, value);
  }

  Future<List<Json>> pending(String scope) async {
    if (!ready) return [];
    final rows = await _outbox.find(
      _database!,
      finder: Finder(
        filter: Filter.equals('scope', scope),
        sortOrders: [SortOrder('created')],
      ),
    );
    return rows.map((r) => Json.from(r.value)).toList();
  }

  Future<void> put(Json operation) async {
    if (!ready) {
      throw StateError(
        'Local storage is unavailable. Your changes have not been queued.',
      );
    }
    await _outbox.record(operation['id'] as String).put(_database!, operation);
  }

  Future<void> remove(String id) async {
    await _outbox.record(id).delete(_database!);
  }

  Future<void> invalidate(String scope) async {
    if (ready) {
      await _cache.update(_database!, {
        'time': 0,
      }, finder: Finder(filter: Filter.equals('scope', scope)));
    }
  }

  Future<void> close() async {
    await _database?.close();
    _database = null;
  }
}
