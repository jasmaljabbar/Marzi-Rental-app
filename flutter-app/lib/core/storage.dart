import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Where the session token lives. On phones this is the OS keystore
/// (Keychain / Android Keystore via flutter_secure_storage), not plain
/// SharedPreferences, so it can't be read from a backup or another app.
abstract class TokenStore {
  Future<String> read();
  Future<void> write(String token);
  Future<void> clear();
}

class SecureTokenStore implements TokenStore {
  static const _key = 'session_token';
  final FlutterSecureStorage _storage;
  SecureTokenStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();
  @override
  Future<String> read() async => await _storage.read(key: _key) ?? '';
  @override
  Future<void> write(String token) => _storage.write(key: _key, value: token);
  @override
  Future<void> clear() => _storage.delete(key: _key);
}

/// In-memory token store for tests.
class MemoryTokenStore implements TokenStore {
  String value;
  MemoryTokenStore([this.value = '']);
  @override
  Future<String> read() async => value;
  @override
  Future<void> write(String token) async => value = token;
  @override
  Future<void> clear() async => value = '';
}

/// Non-secret preferences (username, role, theme, active shop).
class LocalStore {
  SharedPreferences? _prefs;
  final TokenStore tokens;
  LocalStore({TokenStore? tokens}) : tokens = tokens ?? SecureTokenStore();

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    // Older builds kept the token in SharedPreferences; move it once.
    final legacy = _prefs!.getString('token');
    if (legacy != null && legacy.isNotEmpty) {
      await tokens.write(legacy);
      await _prefs!.remove('token');
    }
  }

  String get(String key) => _prefs?.getString(key) ?? '';
  Future<void> put(String key, String value) async {
    await _prefs!.setString(key, value);
  }

  Future<void> remove(String key) async {
    await _prefs!.remove(key);
  }
}
