import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'models.dart';

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

const apiBaseUrlDefine = String.fromEnvironment('API_URL', defaultValue: 'https://marzi-api.vercel.app/');

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
    final req = http.Request(method, uri(path, query));
    req.headers.addAll(headers());
    if (body != null) req.body = jsonEncode(body);
    return decode(await http.Response.fromStream(await client.send(req)), path);
  }

  Future<PageResult> page(String path, {Json query = const {}}) async {
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
    final result = decode(await http.Response.fromStream(await client.send(req)));
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
  RentalRepository(this.api);
  Future<List<Record>> list(String resource, {Json query = const {}}) async =>
      recordsOf(await api.request('GET', resource, query: query));
  Future<List<Record>> paged(String resource, {Json query = const {}}) async =>
      (await api.page(resource, query: {'page': 1, 'page_size': 200, ...query})).items;
  Future<Record> get(String path, {Json query = const {}}) async =>
      Record(Map<String, dynamic>.from(await api.request('GET', path, query: query)));
  Future<Record> save(String path, Json body, {bool update = false}) async =>
      Record(Map<String, dynamic>.from(await api.request(update ? 'PUT' : 'POST', path, body: body)));
  Future<void> delete(String path) async {
    await api.request('DELETE', path);
  }

  Future<void> post(String path, [Json? body]) async {
    await api.request('POST', path, body: body);
  }

  Future<List<Record>> active({Json query = const {}}) => paged('/rentals', query: {'status': 'Active', ...query});
  Future<List<Record>> history({Json query = const {}}) => paged('/rentals/history', query: {'include_cancelled': true, ...query});
  Future<List<Record>> createRentals(Json body) async => recordsOf(await api.request('POST', '/rentals/bulk', body: body));
  Future<Record> reserve(String customer, String equipment, double quantity) =>
      save('/reservations', {'customer_id': customer, 'equipment_id': equipment, 'quantity': quantity});

  /// Server-computed bill for returning [rentalIds] (one customer).
  Future<Record> previewReturn(Json body) => save('/rentals/return/preview', body);

  /// Completes the return in one transaction; returns { rentals, summary }.
  Future<Record> completeReturn(Json body) => save('/rentals/return', body);
}
