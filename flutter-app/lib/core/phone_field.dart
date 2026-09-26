import 'package:flutter/material.dart';
import 'package:phone_numbers_parser/phone_numbers_parser.dart';
import 'validation.dart';

/// The editor holds a local number; the caller's controller holds E.164 after
/// Form.save. Existing unmodified values can be omitted from update payloads.
class PhoneField extends StatefulWidget {
  final TextEditingController controller;
  final bool required, preserveLegacy;
  const PhoneField(
    this.controller, {
    super.key,
    this.required = false,
    this.preserveLegacy = false,
  });
  @override
  State<PhoneField> createState() => _PhoneFieldState();
}

class _PhoneFieldState extends State<PhoneField> {
  late final local = TextEditingController(text: widget.controller.text);
  late final original = widget.controller.text;
  IsoCode country = IsoCode.IN;
  bool changed = false;
  @override
  void initState() {
    super.initState();
    try {
      final number = PhoneNumber.parse(original, callerCountry: IsoCode.IN);
      country = number.isoCode;
      if (number.isValid()) local.text = number.nsn;
    } catch (_) {}
  }

  @override
  void dispose() {
    local.dispose();
    super.dispose();
  }

  String code(IsoCode value) =>
      PhoneNumber(isoCode: value, nsn: '').countryCode;
  String flag(IsoCode value) =>
      String.fromCharCodes(value.name.codeUnits.map((c) => c + 127397));
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Column(
      children: [
        DropdownButtonFormField<IsoCode>(
          initialValue: country,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: 'Phone country / calling code',
          ),
          items: IsoCode.values
              .map(
                (c) => DropdownMenuItem(
                  value: c,
                  child: Text('${flag(c)} ${c.name} +${code(c)}'),
                ),
              )
              .toList(),
          onChanged: (value) => setState(() {
            country = value!;
            changed = true;
          }),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: local,
          keyboardType: TextInputType.phone,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          decoration: InputDecoration(
            labelText: widget.required ? 'Phone *' : 'Phone',
            prefixText: '+${code(country)} ',
          ),
          onChanged: (_) => changed = true,
          validator: (v) => widget.preserveLegacy && !changed
              ? null
              : phoneProblem(v, country: country, required: widget.required),
          onSaved: (v) {
            if (widget.preserveLegacy && !changed) return;
            widget.controller.text =
                parsedPhone(v ?? '', country: country)?.international ?? '';
          },
        ),
      ],
    ),
  );
}
