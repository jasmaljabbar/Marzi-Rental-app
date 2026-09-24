import 'dart:math' as math;
import 'package:intl/intl.dart';

typedef Json = Map<String, dynamic>;

/// Immutable wire record. Optional values remain absent/null in [json].
class Record {
  final Json json;
  Record(Json value) : json = Map.unmodifiable(value);
  String text(String key, [String fallback = '']) =>
      json[key]?.toString() ?? fallback;
  double number(String key, [double fallback = 0]) =>
      numValue(json[key], fallback);
  String get id => text('id');
  String get name => text('name');
  List<Record> records(String key) => recordsOf(json[key]);
  List<String> strings(String key) =>
      (json[key] as List? ?? []).map((v) => v.toString()).toList();
  Record child(String key) =>
      Record(Map<String, dynamic>.from(json[key] as Map? ?? {}));
}

List<Record> recordsOf(dynamic value) => (value as List? ?? [])
    .map((v) => Record(Map<String, dynamic>.from(v as Map)))
    .toList();
double numValue(dynamic value, [double fallback = 0]) =>
    value is num ? value.toDouble() : double.tryParse('$value') ?? fallback;
const _currencySymbols = {
  'INR': '₹', 'USD': r'$', 'EUR': '€', 'GBP': '£', 'AED': 'AED ', 'SAR': 'SAR ',
  'AUD': r'A$', 'CAD': r'C$', 'SGD': r'S$', 'MYR': 'RM', 'ZAR': 'R', 'NGN': '₦',
};
String _currency = 'INR';

/// Set from the business's currency once the account loads.
void setCurrency(String code) => _currency = code.isEmpty ? 'INR' : code;
String get currencyCode => _currency;
String money(num? n) => '${_currencySymbols[_currency] ?? '$_currency '}${NumberFormat('#,##0.##').format(n ?? 0)}';
String dateText(dynamic value, {bool time = false}) {
  final d = DateTime.tryParse('$value');
  return d == null
      ? '-'
      : (time ? DateFormat.yMd().add_jm() : DateFormat.yMd()).format(
          d.toLocal(),
        );
}

int daysSince(String value, DateTime now) => math.max(
  ((now.millisecondsSinceEpoch - DateTime.parse(value).millisecondsSinceEpoch) /
          86400000)
      .ceil(),
  1,
);
double available(Record item) =>
    math.max(item.number('stock_count') - item.number('damaged_count'), 0);
double roundMoney(double value) =>
    ((value + 2.220446049250313e-16) * 100).round() / 100;
