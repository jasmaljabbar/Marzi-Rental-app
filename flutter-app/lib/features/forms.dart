import 'package:flutter/material.dart';
import '../app/controller.dart';
import '../core/models.dart';
import '../core/widgets.dart';
import '../core/api.dart';
import '../core/media.dart';
import '../core/image_field.dart';

class CustomerForm extends StatefulWidget {
  final Record? initial;
  final ValueChanged<Record>? onSaved;
  const CustomerForm({super.key, this.initial, this.onSaved});
  @override
  State<CustomerForm> createState() => _CustomerFormState();
}

class _CustomerFormState extends State<CustomerForm> {
  final formKey = GlobalKey<FormState>();
  late final name = TextEditingController(text: widget.initial?.name),
      phone = TextEditingController(text: widget.initial?.text('phone')),
      address = TextEditingController(text: widget.initial?.text('address'));
  late String photo = widget.initial?.text('photo_url') ?? '',
      doc = widget.initial?.text('doc_url') ?? '';
  bool uploading = false;
  @override
  void dispose() {
    name.dispose();
    phone.dispose();
    address.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Form(
    key: formKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Section(
          widget.initial?.id.isNotEmpty == true
              ? 'Edit Customer'
              : 'New Customer',
        ),
        // The profile photo comes first and the ID document is labelled as
        // such, so a customer's picture isn't filed as their ID by mistake.
        const Section('Profile photo'),
        Row(
          children: [
            ListenableBuilder(
              listenable: name,
              builder: (_, _) => PersonAvatar(key: const Key('customer-form-avatar'), name: name.text, url: photo, size: 72),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Wrap(
                spacing: 4,
                children: [
                  TextButton.icon(
                    onPressed: uploading ? null : () => pick(false, true),
                    icon: const Icon(Icons.photo_library_outlined),
                    label: Text(photo.isEmpty ? 'Choose photo' : 'Change photo'),
                  ),
                  TextButton.icon(
                    onPressed: uploading ? null : () => pick(true, true),
                    icon: const Icon(Icons.photo_camera_outlined),
                    label: const Text('Take photo'),
                  ),
                  if (photo.isNotEmpty)
                    TextButton(
                      onPressed: () => setState(() => photo = ''),
                      child: const Text('Remove photo'),
                    ),
                ],
              ),
            ),
          ],
        ),
        const Text('Shown next to the customer in lists.'),
        const SizedBox(height: 12),
        Field('Name', name, required: true),
        Field(
          'Phone',
          phone,
          required: true,
          keyboardType: TextInputType.phone,
        ),
        Field('Address', address, multiline: true),
        const Section('ID document (optional)'),
        const Text('Kept private. Never used as the customer\'s picture.'),
        const SizedBox(height: 8),
        if (doc.isNotEmpty) Picture(doc, height: 180),
        Wrap(
          spacing: 8,
          children: [
            TextButton.icon(
              onPressed: uploading ? null : () => pick(true, false),
              icon: const Icon(Icons.document_scanner_outlined),
              label: const Text('Scan document'),
            ),
            TextButton.icon(
              onPressed: uploading ? null : () => pick(false, false),
              icon: const Icon(Icons.upload_file_outlined),
              label: Text(doc.isEmpty ? 'Upload document' : 'Replace document'),
            ),
            if (doc.isNotEmpty)
              TextButton(
                onPressed: () => setState(() => doc = ''),
                child: const Text('Remove document'),
              ),
          ],
        ),
        if (uploading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: LinearProgressIndicator(),
          ),
        const SizedBox(height: 8),
        ActionButton('Save', () async {
          if (!formKey.currentState!.validate()) return;
          if (uploading) {
            toast(context, 'Wait for the upload to finish.');
            return;
          }
          final app = AppScope.of(context);
          final edit = widget.initial?.id.isNotEmpty == true;
          final r = await app.repo
              .save(edit ? '/customers/${widget.initial!.id}' : '/customers', {
                'name': name.text.trim(),
                'phone': phone.text.trim(),
                'address': address.text.trim().isEmpty
                    ? null
                    : address.text.trim(),
                'doc_url': doc.isEmpty ? null : doc,
                'photo_url': photo.isEmpty ? null : photo,
              }, update: edit);
          app.changed();
          if (context.mounted) {
            widget.onSaved?.call(r);
            Navigator.pop(context, r);
          }
        }),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    ),
  );
  Future<void> pick(bool camera, bool isPhoto) async {
    setState(() => uploading = true);
    try {
      final result = await uploadImage(
        AppScope.of(context),
        camera: camera,
        quality: isPhoto ? 60 : 80,
        kind: isPhoto ? UploadKind.customerPhoto : UploadKind.customerDoc,
      );
      if (result != null && mounted) {
        setState(() {
          if (isPhoto) {
            photo = result;
          } else {
            doc = result;
          }
        });
      }
    } catch (e) {
      if (mounted) toast(context, e);
    } finally {
      if (mounted) setState(() => uploading = false);
    }
  }
}

class EquipmentForm extends StatefulWidget {
  final Record? initial;
  const EquipmentForm({super.key, this.initial});
  @override
  State<EquipmentForm> createState() => _EquipmentFormState();
}

class _EquipmentFormState extends State<EquipmentForm> {
  final formKey = GlobalKey<FormState>();
  late final name = TextEditingController(text: widget.initial?.name),
      stock = TextEditingController(
        text: widget.initial?.text('stock_count') ?? '1',
      ),
      rate = TextEditingController(
        text: widget.initial?.text('rent_per_day') ?? '0',
      ),
      price = TextEditingController(
        text: widget.initial?.text('purchase_price_per_unit') ?? '0',
      ),
      life = TextEditingController(
        text: widget.initial?.text('useful_life_years') ?? '5',
      ),
      description = TextEditingController(
        text: widget.initial?.text('description'),
      );
  late String category = widget.initial?.text('category_id') ?? '';
  late List<String> images = widget.initial?.strings('images') ?? [];
  bool uploadingImages = false;
  List<Record> categories = [];
  bool loaded = false;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!loaded) {
      loaded = true;
      load();
    }
  }

  Future<void> load() async {
    try {
      final v = await AppScope.of(context).repo.list('/categories');
      if (mounted) setState(() => categories = v);
    } catch (e) {
      if (mounted) toast(context, e);
    }
  }

  @override
  void dispose() {
    for (final c in [name, stock, rate, price, life, description]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Form(
    key: formKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Section(widget.initial == null ? 'Add Equipment' : 'Edit Equipment'),
        Field('Equipment Name', name, required: true),
        DropdownButtonFormField<String>(
          initialValue: categories.any((c) => c.id == category)
              ? category
              : null,
          decoration: const InputDecoration(labelText: 'Category'),
          validator: (value) =>
              value == null || value.isEmpty ? 'Category is required' : null,
          items: categories
              .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
              .toList(),
          onChanged: (v) => setState(() => category = v ?? ''),
        ),
        TextButton(
          onPressed: () async {
            final result = await sheet<Record>(context, const CategoryForm());
            if (result != null) {
              category = result.id;
              await load();
            }
          },
          child: const Text('+ Add category'),
        ),
        if (widget.initial == null) Field('Stock Count', stock, number: true),
        Field('Rent / Day (INR)', rate, number: true),
        Field('Purchase Price / Unit (INR)', price, number: true),
        Field('Useful Life (years)', life, number: true),
        Field('Description', description),
        MultiImageField(
          urls: images,
          onChanged: (next) => setState(() => images = next),
          onBusyChanged: (busy) => setState(() => uploadingImages = busy),
        ),
        const SizedBox(height: 16),
        ActionButton('Save', () async {
          if (!formKey.currentState!.validate()) return;
          if (uploadingImages) {
            toast(context, 'Wait for the photos to finish uploading, or remove the ones that failed.');
            return;
          }
          final app = AppScope.of(context);
          await app.repo.save(
            widget.initial == null
                ? '/equipment'
                : '/equipment/${widget.initial!.id}',
            {
              'name': name.text.trim(),
              'category_id': category,
              'description': description.text.trim().isEmpty
                  ? null
                  : description.text.trim(),
              'rent_per_day': numValue(rate.text),
              'purchase_price_per_unit': numValue(price.text),
              'useful_life_years': numValue(life.text) == 0
                  ? 5
                  : numValue(life.text),
              'images': images,
              if (widget.initial == null) 'stock_count': numValue(stock.text),
              if (widget.initial == null) 'damaged_count': 0,
            },
            update: widget.initial != null,
          );
          app.changed();
          if (context.mounted) Navigator.pop(context, true);
        }),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    ),
  );
}

class CategoryForm extends StatefulWidget {
  const CategoryForm({super.key});
  @override
  State<CategoryForm> createState() => _CategoryFormState();
}

class _CategoryFormState extends State<CategoryForm> {
  final name = TextEditingController();
  @override
  void dispose() {
    name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Section('Add category'),
      Field('Category name', name),
      ActionButton('Add category', () async {
        if (name.text.trim().isEmpty) {
          throw Exception('Please enter a category name.');
        }
        final app = AppScope.of(context);
        final result = await app.repo.save('/categories', {
          'name': name.text.trim(),
        });
        app.changed();
        if (context.mounted) Navigator.pop(context, result);
      }),
    ],
  );
}

/// Small action-specific inputs used for stock, maintenance, payments and scrap.
class OperationForm extends StatefulWidget {
  final String title;
  final Map<String, String> fields;
  final Set<String> numbers;
  final Future<void> Function(Map<String, String>) submit;
  const OperationForm({
    super.key,
    required this.title,
    required this.fields,
    required this.submit,
    this.numbers = const {},
  });
  @override
  State<OperationForm> createState() => _OperationFormState();
}

class _OperationFormState extends State<OperationForm> {
  late final controls = widget.fields.map(
    (k, v) => MapEntry(k, TextEditingController(text: v)),
  );
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
      Section(widget.title),
      ...controls.entries.map(
        (e) => Field(e.key, e.value, number: widget.numbers.contains(e.key)),
      ),
      ActionButton('Save', () async {
        await widget.submit(controls.map((k, v) => MapEntry(k, v.text)));
        if (context.mounted) Navigator.pop(context, true);
      }),
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
    ],
  );
}
