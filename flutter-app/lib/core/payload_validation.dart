import 'package:phone_numbers_parser/phone_numbers_parser.dart';
import 'models.dart';
import 'validation.dart';

/// Validation at the repository boundary also covers background operations and
/// queued retries. Server validation remains authoritative for stock and access.
Json validatePayload(String path, Json input, {bool update = false}) {
  final body = Map<String, dynamic>.from(input);
  final resource = path.split('/').where((s) => s.isNotEmpty).firstOrNull ?? '';
  const lengths = {
    'name': 120,
    'company_name': 120,
    'address': 500,
    'description': 2000,
    'remark': 1000,
    'note': 500,
    'footer_note': 1000,
    'tax_id': 60,
    'category': 80,
    'business_code': 40,
  };
  const counts = {
    'quantity': 100000,
    'quantity_added': 100000,
    'stock_count': 1000000,
    'damaged_count': 1000000,
    'damaged_quantity': 100000,
    'damage_quantity': 100000,
    'day_of_month': 28,
  };
  const amounts = {
    'amount',
    'rent_per_day',
    'deposit_amount',
    'purchase_price_per_unit',
    'advance_amount',
    'selling_price',
    'amount_paid',
    'amount_paid_on_return',
    'discount_amount',
    'late_fee_amount',
    'damage_amount',
    'cost',
    'unit_price',
  };
  void fail(String field, String message) =>
      throw InputProblem('${field.replaceAll('_', ' ')}: $message');
  for (final entry in body.entries.toList()) {
    final key = entry.key, value = entry.value;
    if (value is String && key != 'password' && !key.endsWith('_password')) {
      body[key] = value.trim();
    }
    if (lengths.containsKey(key) && value != null) {
      if (value is! String) fail(key, 'Enter text.');
      final issue = textProblem(
        value as String,
        maxLength: key == 'name' && resource == 'categories'
            ? 80
            : lengths[key],
      );
      if (issue != null) fail(key, issue);
    }
    if (counts.containsKey(key) ||
        amounts.contains(key) ||
        {
          'useful_life_years',
          'tax_rate_percent',
          'default_tax_rate_percent',
        }.contains(key)) {
      final count = counts.containsKey(key);
      final max = counts[key] ?? (amounts.contains(key) ? 1e10 : 100);
      final positive = {
        'quantity',
        'quantity_added',
        'day_of_month',
      }.contains(key);
      final issue = numberProblem(
        value?.toString(),
        required: true,
        integer: count,
        min: positive ? 1 : 0,
        max: max,
      );
      if (issue != null) fail(key, issue);
      body[key] = num.parse(value.toString());
    }
    if (key == 'email' && value != null) {
      if (value is! String) fail(key, 'Enter a valid email address.');
      final issue = emailProblem(value as String);
      if (issue != null) fail(key, issue);
      body[key] = value.trim().isEmpty ? null : value.trim().toLowerCase();
    }
    if (key == 'phone' &&
        resource == 'customers' &&
        (value == null || value.toString().trim().isEmpty)) {
      fail(key, 'Enter a phone number.');
    }
    if (key == 'phone' && value != null && value.toString().trim().isNotEmpty) {
      if (value is! String) fail(key, 'Enter a valid phone number.');
      IsoCode country = IsoCode.IN;
      try {
        if ((value as String).trim().startsWith('+')) {
          country = PhoneNumber.parse(value).isoCode;
        }
      } catch (_) {}
      final issue = phoneProblem(
        value as String,
        country: country,
        required: resource == 'customers',
      );
      if (issue != null) fail(key, issue);
      body[key] = parsedPhone(value, country: country)!.international;
    }
  }
  if (!update && path == '/$resource') {
    final fields = switch (resource) {
      'customers' => ['name', 'phone'],
      'categories' => ['name'],
      'equipment' => ['name', 'category_id'],
      'expenses' => ['category', 'amount'],
      'reservations' => ['customer_id', 'equipment_id'],
      'rentals' => ['customer_id', 'equipment_id'],
      _ => <String>[],
    };
    for (final field in fields) {
      if (body[field] == null || body[field].toString().trim().isEmpty) {
        fail(field, 'This field is required.');
      }
    }
  }
  for (final field in ['name', 'company_name', 'category']) {
    if (body.containsKey(field) &&
        (body[field] == null || body[field].toString().trim().isEmpty)) {
      fail(field, 'This field is required.');
    }
  }
  if (body['images'] is List && !update) {
    final images = body['images'] as List;
    if (images.length > 4) fail('images', 'Select at most 4 images.');
    if (images.toSet().length != images.length) {
      fail('images', 'Remove duplicate images.');
    }
  }
  for (final field in ['date', 'expected_return_date', 'due_date']) {
    final value = body[field];
    if (value != null) {
      final text = value.toString();
      final day = text.length >= 10 ? text.substring(0, 10) : '';
      final parsed = DateTime.tryParse(text);
      if (parsed == null ||
          DateTime.tryParse(day)?.toIso8601String().substring(0, 10) != day) {
        fail(field, 'Enter a valid calendar date.');
      }
    }
  }
  if (body['items'] is List) {
    final items = body['items'] as List;
    if (items.isEmpty || items.length > 50) {
      fail('items', 'Select between 1 and 50 items.');
    }
    for (final item in items) {
      validatePayload(
        '/rentals',
        Map<String, dynamic>.from(item as Map),
        update: true,
      );
    }
  }
  if (body['damages'] is List) {
    for (final item in body['damages'] as List) {
      validatePayload(
        '/damage',
        Map<String, dynamic>.from(item as Map),
        update: true,
      );
    }
  }
  if (body['damaged_count'] is num &&
      (body['damaged_count'] as num) > (body['stock_count'] as num? ?? 0)) {
    fail('damaged_count', 'Cannot exceed stock count.');
  }
  return body;
}
