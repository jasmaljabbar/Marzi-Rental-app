import 'dart:async';
import 'package:uuid/uuid.dart';
import 'offline_store.dart';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'models.dart';
import 'payload_validation.dart';
import 'validation.dart';

class ApiError implements Exception {
  final int status;
  final String message;
  final Json body;
  ApiError(this.status, this.message, [this.body = const {}]);
  String get code => '${body['code'] ?? ''}';
  @override
  String toString() => message;
}

class PageResult {
  final List<Record> items;
  final int totalCount, totalPages;
  const PageResult(this.items, this.totalCount, this.totalPages);
}

/// What an uploaded file is for; decides whether the server keeps it public
/// (equipment photos, logos, QR codes) or private behind signed links.
enum UploadKind { equipment, logo, qrCode, customerPhoto, customerDoc, receipt, damage }

extension on UploadKind {
  String get wire => switch (this) {
    UploadKind.equipment => 'equipment',
    UploadKind.logo => 'logo',
    UploadKind.qrCode => 'qr_code',
    UploadKind.customerPhoto => 'customer_photo',
    UploadKind.customerDoc => 'customer_doc',
    UploadKind.receipt => 'receipt',
    UploadKind.damage => 'damage',
  };
}

String _stripTrailingSlash(String url) => url.replaceFirst(RegExp(r'/+$'), '');

/// Debug and profile builds talk to the local Node API; release builds to the
/// hosted one. `--dart-define=API_URL=...` overrides both.
const apiBaseUrlDefine = String.fromEnvironment(
  'API_URL',
  defaultValue: kReleaseMode ? 'https://marzi-api.vercel.app/' : 'http://localhost:5000/',
);

/// The one place the app turns a file reference into a loadable URL. The API
/// returns absolute URLs for stored files (signed when private), which pass
/// through; a relative path is joined to the API base without a double slash.
/// Any other scheme counts as no image and returns ''.
String resolveMediaUrl(String value, [String base = apiBaseUrlDefine]) {
  final url = value.trim();
  if (url.isEmpty || url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//') || RegExp(r'^[a-zA-Z][a-zA-Z\d+.-]*:').hasMatch(url)) return '';
  return '${_stripTrailingSlash(base)}/${url.replaceFirst(RegExp(r'^/+'), '')}';
}

class ApiClient {
  final http.Client client;
  final String Function() token;
  final String? Function() shopId;
  final String baseUrl;
  /// Called when the server rejects the session (expired or revoked token).
  void Function()? onUnauthorized;
  ApiClient({required this.token, String? Function()? shopId, http.Client? client, String? baseUrl, this.onUnauthorized})
    : client = client ?? http.Client(),
      shopId = shopId ?? (() => null),
      baseUrl = _stripTrailingSlash(baseUrl ?? apiBaseUrlDefine);

  Uri uri(String path, [Json query = const {}]) {
    final base = Uri.parse('$baseUrl$path');
    return query.isEmpty
        ? base
        : base.replace(
            queryParameters: {
              ...base.queryParameters,
              for (final e in query.entries)
                if (e.value != null && e.value != '') e.key: e.value.toString(),
            },
          );
  }

  Map<String, String> headers({bool json = true}) {
    final shop = shopId();
    return {
      if (token().isNotEmpty) 'Authorization': 'Bearer ${token()}',
      if (shop != null && shop.isNotEmpty) 'X-Shop-Id': shop,
      if (json) 'Content-Type': 'application/json',
    };
  }

  dynamic decode(http.Response r, [String? path]) {
    if (r.statusCode >= 200 && r.statusCode < 300) {
      return r.body.isEmpty ? <String, dynamic>{} : jsonDecode(r.body);
    }
    Json body = {};
    try {
      body = Map<String, dynamic>.from(jsonDecode(r.body) as Map);
    } catch (_) {}
    final isLogin = (path ?? r.request?.url.path ?? '').endsWith('/login');
    if (r.statusCode == 401 && !isLogin) onUnauthorized?.call();
    throw ApiError(r.statusCode, '${body['detail'] ?? body['message'] ?? 'HTTP ${r.statusCode}'}', body);
  }

  Future<dynamic> request(String method, String path, {Json? body, Json query = const {}}) async {
    for (final pair in [['date_from', 'date_to'], ['start_date', 'end_date']]) {
      final issue = dateRangeProblem('${query[pair[0]] ?? ''}', '${query[pair[1]] ?? ''}');
      if (issue != null) throw InputProblem(issue);
    }
    if (body != null) body = validatePayload(path, body, update: method != 'POST');
    final req = http.Request(method, uri(path, query));
    req.headers.addAll(headers());
    if (body != null) req.body = jsonEncode(body);
    return decode(await http.Response.fromStream(await client.send(req).timeout(const Duration(seconds: 12))), path);
  }

  Future<PageResult> page(String path, {Json query = const {}}) async {
    final issue = dateRangeProblem('${query['date_from'] ?? ''}', '${query['date_to'] ?? ''}');
    if (issue != null) throw InputProblem(issue);
    final r = await client.get(uri(path, query), headers: headers());
    final items = recordsOf(decode(r));
    final count = int.tryParse(r.headers['x-total-count'] ?? '') ?? items.length;
    final size = numValue(query['page_size']).toInt();
    return PageResult(items, count == 0 ? items.length : count, size > 0 ? ((count / size).ceil().clamp(1, 1000000)) : 1);
  }

  Future<String> upload(Uint8List bytes, String name, {UploadKind kind = UploadKind.equipment}) async {
    final req = http.MultipartRequest('POST', uri('/upload', {'kind': kind.wire}));
    req.headers.addAll(headers(json: false));
    req.files.add(http.MultipartFile.fromBytes('file', bytes, filename: name, contentType: _imageContentType(name, bytes)));
    final result = decode(await http.Response.fromStream(await client.send(req).timeout(const Duration(seconds: 12))));
    return result['url'] as String;
  }

  Future<Uint8List> bytes(String path) async {
    final r = await client.get(uri(path), headers: headers(json: false));
    if (r.statusCode != 200) decode(r);
    return r.bodyBytes;
  }
}

MediaType _imageContentType(String name, Uint8List bytes) {
  final extension = name.toLowerCase().split('.').last;
  final subtype = switch (extension) {
    'png' => 'png',
    'webp' => 'webp',
    'gif' => 'gif',
    _ => bytes.length >= 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4e && bytes[3] == 0x47 ? 'png' : 'jpeg',
  };
  return MediaType('image', subtype);
}

/// Cloud data boundary; widgets never construct HTTP requests themselves.
class RentalRepository {
  final ApiClient api;
  final OfflineStore? local;
  final String Function()? identity;
  void Function()? onChanged;
  bool offline = false;
  String syncError = '';
  final Map<String, Future<dynamic>> _reads = {};
  Future<void>? _syncing;
  RentalRepository(this.api, {this.local, this.identity, this.onChanged});
  String get scope => '${api.baseUrl}|${identity?.call() ?? ''}|${api.shopId() ?? ''}';
  bool get canQueue => local?.ready == true && (identity?.call().isNotEmpty ?? false) && api.shopId() != null;
  static const draftResources = {'/customers', '/categories', '/equipment', '/expenses'};
  bool _cacheable(String path) => api.token().isNotEmpty && !path.startsWith('/auth') && path != '/health';

  Future<dynamic> _read(String path, Json query) async {
    final currentScope = scope;
    final key = '$currentScope|${api.uri(path, query)}';
    Future<dynamic> fetch() => _reads.putIfAbsent(key, () async {
      try {
        final value = await api.request('GET', path, query: query);
        if (scope != currentScope) throw const InputProblem('Account or shop changed. Reload this screen.');
        final wasOffline = offline;
        offline = false;
        if (_cacheable(path)) await local?.cache(key, {'scope': currentScope, 'data': value, 'time': DateTime.now().millisecondsSinceEpoch});
        if (wasOffline) onChanged?.call();
        return value;
      } finally { _reads.remove(key); }
    });
    final cached = _cacheable(path) ? await local?.cached(key) : null;
    if (cached != null) {
      // A short TTL avoids refetching the same data on every widget rebuild.
      if (DateTime.now().millisecondsSinceEpoch - (cached['time'] as int) > 30000) {
        unawaited(fetch().then((next) {
          if (jsonEncode(next) != jsonEncode(cached['data'])) onChanged?.call();
        }).catchError((Object error) {
          if (error is http.ClientException || error is TimeoutException) {
            if (!offline) { offline = true; onChanged?.call(); }
          }
        }));
      }
      return cached['data'];
    }
    return fetch();
  }
  Future<List<Record>> list(String resource, {Json query = const {}}) async => recordsOf(await _read(resource, query));
  Future<List<Record>> paged(String resource, {Json query = const {}}) => list(resource, query: {'page': 1, 'page_size': 200, ...query});
  Future<Record> get(String path, {Json query = const {}}) async => Record(Json.from(await _read(path, query)));
  Future<Record> save(String path, Json body, {bool update = false}) async {
    body = validatePayload(path, body, update: update);
    if (!update && draftResources.contains(path) && canQueue) {
      for (final key in ['category_id', 'equipment_id']) {
        if (body[key] != null && !RegExp(r'^[a-fA-F0-9]{24}$').hasMatch('${body[key]}')) throw InputProblem('Choose a synchronized ${key.split('_').first}.');
      }
      final id = const Uuid().v4();
      final operation = <String, dynamic>{'id': id, 'scope': scope, 'path': path, 'body': {...body, 'sync_id': id}, 'status': 'pending', 'message': '', 'created': DateTime.now().millisecondsSinceEpoch};
      await local!.put(operation);
      // Return a clearly pending draft immediately. Pending IDs cannot be used
      // for rentals; the server record appears after synchronization.
      unawaited(syncPending());
      onChanged?.call();
      return Record({...body, 'id': 'pending:$id', 'sync_status': 'pending'});
    }
    final result = Record(Json.from(await api.request(update ? 'PUT' : 'POST', path, body: body)));
    if (path != '/rentals/return/preview') await local?.invalidate(scope);
    return result;
  }
  Future<List<Json>> pending() async => local?.pending(scope) ?? [];
  Future<void> correct(Json operation, Json body) async {
    if (operation['scope'] != scope) throw const InputProblem('Switch to the original shop to correct this draft.');
    if (operation['status'] != 'failed') throw const InputProblem('Retry this operation first to determine whether the server saved it.');
    final valid = validatePayload(operation['path'] as String, body);
    await local!.put({...operation, 'body': {...valid, 'sync_id': operation['id']}, 'status': 'pending', 'message': ''});
    onChanged?.call();
    await syncPending();
  }
  Future<void> syncPending() {
    if (_syncing != null) return _syncing!;
    final future = _sync();
    _syncing = future;
    return future.whenComplete(() => _syncing = null);
  }
  Future<void> _sync() async {
    if (!canQueue) return;
    final currentScope = scope;
    var hadWork = false;
    try {
      final operations = await pending();
      if (operations.isEmpty) return;
      syncError = '';
      hadWork = operations.any((o) => o['status'] != 'failed');
      for (final operation in operations) {
        if (scope != currentScope || api.token().isEmpty) break;
        if (operation['status'] == 'failed') continue;
        try {
          await api.request('POST', operation['path'] as String, body: Json.from(operation['body'] as Map));
          // Remove only after authoritative success, even if the UI changed shop.
          await local!.remove(operation['id'] as String);
          await local!.invalidate(currentScope);
          offline = false;
        } on ApiError catch (e) {
          final rejected = e.code != 'SYNC_CONFLICT' && e.status >= 400 && e.status < 500 && ![401, 408, 429].contains(e.status);
          await local!.put({...operation, 'status': rejected ? 'failed' : 'pending', 'message': e.message});
          if (!rejected) break;
        } on InputProblem catch (e) {
          await local!.put({...operation, 'status': 'failed', 'message': e.message});
        } catch (e) {
          offline = true;
          await local!.put({...operation, 'status': 'pending', 'message': 'Waiting for connection. Retry when online.'});
          break;
        }
      }
    } catch (_) {
      syncError = 'Local storage could not be updated. Keep this device data and retry synchronization.';
      // A database failure must not become an unhandled background exception.
      // Existing outbox rows remain intact; surface the problem on retry.
      offline = true;
    } finally { if (hadWork || syncError.isNotEmpty) onChanged?.call(); }
  }
  Future<void> delete(String path) async {
    await api.request('DELETE', path);
    await local?.invalidate(scope);
  }

  Future<void> post(String path, [Json? body]) async {
    await api.request('POST', path, body: body);
    await local?.invalidate(scope);
  }

  Future<List<Record>> active({Json query = const {}}) => paged('/rentals', query: {'status': 'Active', ...query});
  Future<List<Record>> history({Json query = const {}}) => paged('/rentals/history', query: {'include_cancelled': true, ...query});
  Future<List<Record>> createRentals(Json body) async {
    final result = recordsOf(await api.request('POST', '/rentals/bulk', body: body));
    await local?.invalidate(scope);
    return result;
  }
  Future<Record> reserve(String customer, String equipment, int quantity) =>
      save('/reservations', {'customer_id': customer, 'equipment_id': equipment, 'quantity': quantity});

  /// Server-computed bill for returning [rentalIds] (one customer).
  Future<Record> previewReturn(Json body) => save('/rentals/return/preview', body);

  /// Completes the return in one transaction; returns { rentals, summary }.
  Future<Record> completeReturn(Json body) => save('/rentals/return', body);
}
