import 'dart:async';
import 'dart:convert';
import '../core/offline_store.dart';
import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/models.dart';
import '../core/storage.dart';

class AppController extends ChangeNotifier {
  final LocalStore store;
  final OfflineStore offlineStore;
  Timer? _syncTimer;
  late final RentalRepository repo;
  bool ready = false;
  String startupError = '', token = '', username = '', role = 'staff', businessCode = '';
  String? activeShopId;
  List<Record> shops = [];
  ThemeMode themeMode = ThemeMode.system;
  Record? account, catalog;
  int revision = 0;

  AppController({LocalStore? store, ApiClient? api, OfflineStore? offlineStore}) : store = store ?? LocalStore(), offlineStore = offlineStore ?? OfflineStore() {
    final client = api ?? ApiClient(token: () => token);
    repo = RentalRepository(
      ApiClient(
        token: () => token,
        shopId: () => activeShopId,
        client: client.client,
        baseUrl: client.baseUrl,
        onUnauthorized: _sessionExpired,
      ),
      local: this.offlineStore,
      identity: () => userIdentity,
      onChanged: changed,
    );
  }

  String get userIdentity {
    try {
      final payload = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(token.split('.')[1])))) as Map;
      return '${payload['sub'] ?? payload['id'] ?? ''}';
    } catch (_) { return ''; }
  }

  @override
  void dispose() { _syncTimer?.cancel(); super.dispose(); }

  bool get isAdmin => role == 'owner' || role == 'admin';

  Future<void> start() async {
    ready = false;
    startupError = '';
    notifyListeners();
    try {
      await store.init();
      token = await store.tokens.read();
      await offlineStore.init();
      username = store.get('username');
      role = store.get('role').isEmpty ? 'staff' : store.get('role');
      businessCode = store.get('business_code');
      activeShopId = store.get('shop_id').isEmpty ? null : store.get('shop_id');
      themeMode = switch (store.get('theme_mode')) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      };
      ready = true;
      if (token.isNotEmpty) unawaited(loadSession());
      _syncTimer?.cancel();
      _syncTimer = Timer.periodic(const Duration(seconds: 30), (_) { if (token.isNotEmpty) unawaited(repo.syncPending()); });
      unawaited(repo.syncPending());
    } catch (e) {
      startupError = e.toString();
    }
    notifyListeners();
  }

  /// Signs in (or registers when [company] is given). Throws [ApiError];
  /// code BUSINESS_CODE_REQUIRED means the username exists in several
  /// businesses and [businessCode] is needed.
  Future<void> authenticate(String username, String password, {String? company, String? businessCode, String? email}) async {
    final result = await repo.save(company == null ? '/auth/login' : '/auth/register', {
      'username': username.trim(),
      'password': password,
      if (company != null) 'company_name': company.trim(),
      if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
      if (businessCode != null && businessCode.trim().isNotEmpty) 'business_code': businessCode.trim(),
    });
    await applySession(result);
    await loadSession();
    unawaited(repo.syncPending());
  }

  Future<void> applySession(Record result) async {
    token = result.text('access_token');
    username = result.text('username');
    role = result.text('role', 'staff');
    businessCode = result.text('business_code');
    await store.tokens.write(token);
    await store.put('username', username);
    await store.put('role', role);
    await store.put('business_code', businessCode);
    notifyListeners();
  }

  Future<void> changePassword(String current, String next) async {
    final result = await repo.save('/auth/me/password', {'current_password': current, 'new_password': next}, update: true);
    await applySession(result);
  }

  void _sessionExpired() {
    if (token.isEmpty) return;
    logout();
  }

  Future<void> logout() async {
    await store.tokens.clear();
    for (final key in ['username', 'role', 'business_code', 'shop_id']) {
      await store.remove(key);
    }
    token = '';
    username = '';
    role = 'staff';
    businessCode = '';
    activeShopId = null;
    shops = [];
    account = null;
    catalog = null;
    changed();
  }

  Future<void> setTheme(ThemeMode mode) async {
    await store.put('theme_mode', mode.name);
    themeMode = mode;
    notifyListeners();
  }

  /// Loads the shops this user may work in and picks the active one, then
  /// plan/feature data. The X-Shop-Id header follows [activeShopId].
  Future<void> loadSession() async {
    try {
      final list = await repo.list('/shops');
      shops = list.where((s) => s.json['is_active'] != false).toList();
      if (shops.isNotEmpty && !shops.any((s) => s.id == activeShopId)) {
        await selectShop(shops.first.id, notify: false);
      }
    } catch (_) {
      shops = [];
    }
    await loadPlan();
  }

  Future<void> selectShop(String id, {bool notify = true}) async {
    activeShopId = id;
    await store.put('shop_id', id);
    if (notify) changed();
  }

  Future<void> loadPlan() async {
    try {
      account = await repo.get('/account/me');
      setCurrency(account?.text('currency') ?? 'INR');
    } catch (_) {
      account = null;
    }
    try {
      catalog = await repo.get('/catalog');
    } catch (_) {
      catalog = null;
    }
    notifyListeners();
  }

  bool hasFeature(String key) {
    final plan = account?.child('plan');
    if (plan == null || plan.json.isEmpty) return true;
    final flags = plan.child('features').json;
    if (flags[key] is bool) return flags[key] as bool;
    return catalog?.records('features').where((f) => f.text('key') == key).firstOrNull?.json['default'] as bool? ?? true;
  }

  void changed() {
    revision++;
    notifyListeners();
  }
}

class AppScope extends InheritedNotifier<AppController> {
  const AppScope({super.key, required AppController controller, required super.child}) : super(notifier: controller);
  static AppController of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<AppScope>()!.notifier!;
}
