import 'package:flutter/material.dart';
import '../app/controller.dart';
import '../core/models.dart';
import '../core/phone_field.dart';
import '../core/widgets.dart';

class PendingScreen extends StatefulWidget {
  const PendingScreen({super.key});
  @override
  State<PendingScreen> createState() => _PendingScreenState();
}

class _PendingScreenState extends State<PendingScreen> {
  Future<List<Json>>? future;
  int revision = -1;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final app = AppScope.of(context);
    if (revision != app.revision) {
      revision = app.revision;
      future = app.repo.pending();
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Pending changes')),
    body: DataView<List<Json>>(
      future: future!,
      builder: (rows) => PageList(
        children: [
          const Text(
            'Saved on this device. These drafts become available for rentals after the server accepts them.',
          ),
          const SizedBox(height: 12),
          if (AppScope.of(context).repo.syncError.isNotEmpty)
            Text(AppScope.of(context).repo.syncError),
          ActionButton(
            'Retry synchronization',
            () => AppScope.of(context).repo.syncPending(),
          ),
          if (rows.isEmpty) const Empty('All changes synchronized'),
          for (final row in rows)
            Panel(
              children: [
                Section(
                  '${(row['body'] as Map)['name'] ?? (row['body'] as Map)['category'] ?? 'Draft'}',
                ),
                Text(
                  '${(row['path'] as String).substring(1)} · ${row['status'] == 'failed' ? 'Needs attention' : 'Pending'}',
                ),
                if ('${row['message']}'.isNotEmpty) Text('${row['message']}'),
                if (row['status'] == 'failed')
                  TextButton(
                    onPressed: () =>
                        sheet(context, PendingEditor(operation: row)),
                    child: const Text('Correct and retry'),
                  ),
              ],
            ),
        ],
      ),
    ),
  );
}

/// One correction form for all queued catalog drafts. Field validation and
/// final payload validation use the same utilities as regular create forms.
class PendingEditor extends StatefulWidget {
  final Json operation;
  const PendingEditor({super.key, required this.operation});
  @override
  State<PendingEditor> createState() => _PendingEditorState();
}

class _PendingEditorState extends State<PendingEditor> {
  late final body = Json.from(widget.operation['body'] as Map);
  late final controls = {
    for (final entry in body.entries)
      if (entry.key != 'sync_id' &&
          !entry.key.endsWith('_url') &&
          entry.value is! List &&
          entry.value is! Map)
        entry.key: TextEditingController(text: '${entry.value ?? ''}'),
  };
  List<Record> categories = [];
  bool loaded = false;
  static const counts = {'stock_count', 'damaged_count'};
  static const amounts = {
    'rent_per_day',
    'deposit_amount',
    'purchase_price_per_unit',
    'useful_life_years',
    'amount',
  };
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!loaded && controls.containsKey('category_id')) {
      loaded = true;
      AppScope.of(context).repo
          .list('/categories')
          .then((v) {
            if (mounted) setState(() => categories = v);
          })
          .catchError((Object _) {});
    }
  }

  @override
  void dispose() {
    for (final c in controls.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Section('Correct pending change'),
      Text('${widget.operation['message']}'),
      for (final entry in controls.entries)
        if (entry.key == 'phone')
          PhoneField(entry.value, required: true)
        else if (entry.key == 'category_id')
          DropdownButtonFormField<String>(
            initialValue: categories.any((c) => c.id == entry.value.text)
                ? entry.value.text
                : null,
            decoration: const InputDecoration(labelText: 'Category'),
            items: categories
                .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
                .toList(),
            validator: (v) => v == null ? 'Choose a category.' : null,
            onChanged: (v) => entry.value.text = v ?? '',
          )
        else
          Field(
            entry.key.replaceAll('_', ' '),
            entry.value,
            integer: counts.contains(entry.key),
            number: amounts.contains(entry.key),
            required: {'name', 'category', 'amount'}.contains(entry.key),
          ),
      ActionButton('Save correction and retry', () async {
        final next = {
          ...body,
          for (final e in controls.entries)
            e.key: e.value.text.isEmpty && body[e.key] == null
                ? null
                : e.value.text,
        };
        await AppScope.of(context).repo.correct(widget.operation, next);
        if (context.mounted) Navigator.pop(context);
      }),
    ],
  );
}
