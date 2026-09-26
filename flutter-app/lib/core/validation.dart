import 'package:phone_numbers_parser/phone_numbers_parser.dart';

class InputProblem implements Exception {
  final String message;
  const InputProblem(this.message);
  @override
  String toString() => message;
}

String? textProblem(String? value, {bool required = false, int? maxLength}) {
  final text = value?.trim() ?? '';
  if (required && text.isEmpty) return 'This field is required.';
  if (maxLength != null && text.length > maxLength) {
    return 'Use at most $maxLength characters.';
  }
  return null;
}

String? emailProblem(String? value) {
  final text = value?.trim() ?? '';
  if (text.isEmpty) return null;
  if (text.length > 200 ||
      !RegExp(
        r"^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$",
      ).hasMatch(text)) {
    return 'Enter a valid email address.';
  }
  return null;
}

String? usernameProblem(String? value) =>
    textProblem(value, required: true, maxLength: 64) ??
    (RegExp(r'^[a-zA-Z0-9._@+-]+$').hasMatch(value!.trim())
        ? null
        : 'Use letters, numbers or . _ @ + - only.');

String? numberProblem(
  String? value, {
  bool integer = false,
  bool required = false,
  num min = 0,
  num max = 1e10,
  int? decimals = 2,
}) {
  final text = value?.trim() ?? '';
  if (text.isEmpty) return required ? 'Enter a number.' : null;
  if (integer && !RegExp(r'^\d+$').hasMatch(text)) {
    return 'Quantity must be a whole number.';
  }
  if (!RegExp(r'^(?:\d+(?:\.\d+)?|\.\d+)$').hasMatch(text)) {
    return 'Enter a valid non-negative number.';
  }
  final number = num.tryParse(text);
  if (number == null || !number.isFinite) return 'Enter a finite number.';
  if (number < min || number > max) {
    return 'Enter a value between $min and $max.';
  }
  if (!integer &&
      decimals != null &&
      text.contains('.') &&
      text.split('.').last.length > decimals) {
    return 'Use at most $decimals decimal places.';
  }
  return null;
}

PhoneNumber? parsedPhone(String value, {IsoCode country = IsoCode.IN}) {
  final text = value.trim();
  if (!RegExp(r'^\+?[0-9 ()-]+$').hasMatch(text)) return null;
  if (!text.startsWith('+') &&
      country == IsoCode.IN &&
      text.replaceAll(RegExp(r'\D'), '').length != 10) {
    return null;
  }
  try {
    final phone = PhoneNumber.parse(
      text,
      destinationCountry: text.startsWith('+') ? null : country,
    );
    if (country == IsoCode.IN &&
        text.startsWith('+') &&
        text.replaceAll(RegExp(r'\D'), '').length != 12) {
      return null;
    }
    if (phone.isoCode != country || !phone.isValid()) return null;
    return phone;
  } catch (_) {
    return null;
  }
}

String? phoneProblem(
  String? value, {
  IsoCode country = IsoCode.IN,
  bool required = false,
}) {
  if ((value ?? '').trim().isEmpty) {
    return required ? 'Enter a phone number.' : null;
  }
  if (parsedPhone(value!, country: country) != null) return null;
  return country == IsoCode.IN
      ? 'Enter a valid 10-digit Indian phone number, excluding +91.'
      : 'Enter a valid phone number for the selected country.';
}

/// Strict input parsing. Display helpers in models.dart intentionally tolerate
/// missing server values; they must not turn malformed form input into zero.
double inputNumber(String? value, {double fallback = 0}) {
  if (value == null || value.trim().isEmpty) return fallback;
  final issue = numberProblem(value);
  if (issue != null) throw InputProblem(issue);
  return double.parse(value.trim());
}

int inputCount(String? value, {int fallback = 0}) {
  if (value == null || value.trim().isEmpty) return fallback;
  final issue = numberProblem(value, integer: true, max: 1000000);
  if (issue != null) throw InputProblem(issue);
  return int.parse(value.trim());
}

String? dateRangeProblem(String from, String to) {
  if (from.isEmpty || to.isEmpty) return null;
  final start = DateTime.tryParse(from), end = DateTime.tryParse(to);
  if (start == null || end == null) return 'Enter a valid date.';
  return end.isBefore(start)
      ? 'End date cannot be earlier than start date.'
      : null;
}
