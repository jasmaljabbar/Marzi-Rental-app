import '../core/validation.dart';
import 'package:flutter/material.dart';
import '../app/controller.dart';
import '../core/models.dart';
import '../core/widgets.dart';
import 'forms.dart';
import 'rentals.dart';

class CatalogScreen extends StatefulWidget {
  final bool customers;
  final void Function(String)? rent;
  const CatalogScreen({super.key, this.customers = false, this.rent});
  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  String search = '', category = '';
  int revision = -1;
  Future<List<List<Record>>>? future;
  void reload() {
    final app = AppScope.of(context);
    setState(() {
      future = Future.wait([
        app.repo.paged(
          widget.customers ? '/customers' : '/equipment',
          query: {
            'search': search,
            if (!widget.customers) 'category_id': category,
          },
        ),
        widget.customers ? app.repo.active() : app.repo.list('/categories'),
        widget.customers ? app.repo.history() : Future.value(<Record>[]),
      ]);
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final r = AppScope.of(context).revision;
    if (r != revision) {
      revision = r;
      reload();
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: () async {
      reload();
      await future;
    },
    child: PageList(
      children: [
        Section(
          widget.customers ? 'Customers' : 'Inventory',
          // Staff can add customers; only owners/admins manage the catalog.
          trailing: widget.customers || AppScope.of(context).isAdmin
              ? ElevatedButton.icon(
                  onPressed: () => sheet(
                    context,
                    widget.customers ? const CustomerForm() : const EquipmentForm(),
                  ),
                  icon: const Icon(Icons.add),
                  label: Text(widget.customers ? 'New' : 'Add'),
                )
              : null,
        ),
        TextField(
          decoration: InputDecoration(
            hintText: widget.customers
                ? 'Search name or phone'
                : 'Search equipment...',
            prefixIcon: const Icon(Icons.search),
          ),
          onChanged: (v) {
            search = v;
            reload();
          },
        ),
        const SizedBox(height: 16),
        DataView(
          future: future!,
          retry: reload,
          builder: (data) {
            final items = data[0];
            return Column(
              children: [
                if (!widget.customers)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        ChoiceChip(
                          label: const Text('All categories'),
                          selected: category.isEmpty,
                          onSelected: (_) {
                            category = '';
                            reload();
                          },
                        ),
                        ...data[1].map(
                          (c) => Padding(
                            padding: const EdgeInsets.only(left: 8),
                            child: ChoiceChip(
                              label: Text(c.name),
                              selected: category == c.id,
                              onSelected: (_) {
                                category = c.id;
                                reload();
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 12),
                if (items.isEmpty)
                  Empty(
                    widget.customers
                        ? 'No customers found'
                        : 'No equipment found',
                  ),
                ...items.map(
                  (item) => widget.customers
                      ? customerCard(item, data[1], data[2])
                      : equipmentCard(item),
                ),
              ],
            );
          },
        ),
      ],
    ),
  );
  Widget customerCard(Record item, List<Record> active, List<Record> history) {
    final ongoing = active
        .where((r) => r.text('customer_id') == item.id)
        .length;
    final due = history
        .where((r) => r.text('customer_id') == item.id)
        .fold<double>(0, (s, r) => s + r.number('amount_due'));
    return Card(
      child: Column(
        children: [
          ListTile(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute<void>(
                builder: (_) => CustomerDetailScreen(customer: item),
              ),
            ),
            leading: PersonAvatar(
              name: item.name,
              url: item.text('photo_thumb_url'),
              fallbackUrl: item.text('photo_url'),
            ),
            title: Text(
              item.name,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            subtitle: Text(
              '${item.text('phone')}\n$ongoing active • ${money(due)} pending',
            ),
            isThreeLine: true,
            trailing: const Icon(Icons.chevron_right),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: () => sheet(context, CustomerForm(initial: item)),
                child: const Text('Edit'),
              ),
              if (AppScope.of(context).isAdmin)
              TextButton(
                onPressed: () async {
                  if (await confirm(
                        context,
                        'Delete customer?',
                        'Delete ${item.name}?',
                      ) &&
                      mounted) {
                    try {
                      await AppScope.of(
                        context,
                      ).repo.delete('/customers/${item.id}');
                      if (mounted) AppScope.of(context).changed();
                    } catch (e) {
                      if (mounted) toast(context, e);
                    }
                  }
                },
                child: const Text('Delete'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget equipmentCard(Record item) => Card(
    child: InkWell(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute<void>(
          builder: (_) =>
              EquipmentDetailScreen(equipment: item, rent: widget.rent),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            SizedBox(
              width: 90,
              child: Picture(
                item.strings('images').firstOrNull ?? '',
                height: 100,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text('${money(item.number('rent_per_day'))}/day'),
                  Text(
                    '${available(item)} available • ${item.count('damaged_count')} damaged',
                  ),
                  Wrap(
                    children: [
                      TextButton(
                        onPressed: () => stockForm(context, item),
                        child: const Text('Add stock'),
                      ),
                      TextButton(
                        onPressed: () => widget.rent?.call(item.name),
                        child: const Text('Rent'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

Future<void> stockForm(BuildContext context, Record item) async {
  final app = AppScope.of(context);
  await sheet(
    context,
    OperationForm(
      title: 'Add Stock — ${item.name}',
      fields: const {'Quantity': '1', 'Unit Price (INR)': '0', 'Note': ''},
      integers: const {'Quantity'},
      numbers: const {'Unit Price (INR)'},
      submit: (v) async {
        await app.repo.save('/equipment/${item.id}/stock', {
          'quantity_added': inputCount(v['Quantity']),
          'unit_price': inputNumber(v['Unit Price (INR)']),
          'note': v['Note'],
        });
        app.changed();
      },
    ),
  );
}

Future<void> maintenanceForm(
  BuildContext context,
  Record item,
  String action,
) async {
  final app = AppScope.of(context);
  await sheet(
    context,
    OperationForm(
      title: '$action — ${item.name}',
      fields: {'Remark': '', if (action == 'Repair') 'Cost (INR)': '0'},
      numbers: const {'Cost (INR)'},
      submit: (v) async {
        await app.repo.save('/equipment/maintenance', {
          'equipment_id': item.id,
          'action': action,
          'remark': v['Remark'],
          'cost': inputNumber(v['Cost (INR)']),
          'photos': <String>[],
        });
        app.changed();
      },
    ),
  );
}

class EquipmentDetailScreen extends StatefulWidget {
  final Record equipment;
  final void Function(String)? rent;
  const EquipmentDetailScreen({super.key, required this.equipment, this.rent});
  @override
  State<EquipmentDetailScreen> createState() => _EquipmentDetailScreenState();
}

class _EquipmentDetailScreenState extends State<EquipmentDetailScreen> {
  int revision = -1;
  Future<List<List<Record>>>? future;
  void reload() {
    final repo = AppScope.of(context).repo;
    setState(() {
      future = Future.wait([
        repo.paged('/equipment'),
        repo.active(),
        repo.history(),
        repo.paged('/customers'),
      ]);
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final r = AppScope.of(context).revision;
    if (r != revision) {
      revision = r;
      reload();
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Equipment Detail')),
    body: DataView(
      future: future!,
      retry: reload,
      builder: (data) {
        final item = data[0]
            .where((e) => e.id == widget.equipment.id)
            .firstOrNull;
        if (item == null) return const Empty('Equipment not found');
        final app = AppScope.of(context);
        return PageList(
          children: [
            Picture(item.strings('images').firstOrNull ?? '', height: 220),
            Section(item.name),
            Text(item.text('description')),
            const SizedBox(height: 12),
            metric('Rent per day', money(item.number('rent_per_day'))),
            metric('Available stock', available(item)),
            Wrap(
              spacing: 8,
              children: [
                if (app.isAdmin)
                  OutlinedButton(
                    onPressed: () => sheet(context, EquipmentForm(initial: item)),
                    child: const Text('Edit'),
                  ),
                OutlinedButton(
                  onPressed: () => stockForm(context, item),
                  child: const Text('Add Stock'),
                ),
                if (app.hasFeature('maintenance'))
                  ...['Damage', 'Repair'].map(
                    (a) => OutlinedButton(
                      onPressed: () => maintenanceForm(context, item, a),
                      child: Text(a),
                    ),
                  ),
                if (app.isAdmin)
                OutlinedButton(
                  onPressed: () =>
                      sheet(context, SaleForm(item: item, customers: data[3])),
                  child: const Text('Sell'),
                ),
                if (app.isAdmin)
                OutlinedButton(
                  onPressed: () => sheet(
                    context,
                    OperationForm(
                      title: 'Mark as scrap',
                      fields: const {'Quantity': '1', 'Remark': ''},
                      integers: const {'Quantity'},
                      submit: (v) async {
                        if (inputCount(v['Quantity']) <= 0) {
                          throw Exception('Enter a valid scrap quantity');
                        }
                        await app.repo.save('/equipment/${item.id}/scrap', {
                          'quantity': inputCount(v['Quantity']),
                          'remark': v['Remark']!.trim().isEmpty
                              ? 'Marked as scrap'
                              : v['Remark'],
                        });
                        app.changed();
                      },
                    ),
                  ),
                  child: const Text('Scrap'),
                ),
                if (app.isAdmin)
                OutlinedButton(
                  onPressed: () async {
                    if (await confirm(
                      context,
                      'Delete equipment?',
                      'Delete ${item.name}?',
                    )) {
                      try {
                        await app.repo.delete('/equipment/${item.id}');
                        app.changed();
                        if (context.mounted) Navigator.pop(context);
                      } catch (e) {
                        if (context.mounted) toast(context, e);
                      }
                    }
                  },
                  child: const Text('Delete'),
                ),
                if (widget.rent != null)
                  ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      widget.rent!(item.name);
                    },
                    child: const Text('Rent this item'),
                  ),
              ],
            ),
            const Section('Ongoing rentals'),
            ...data[1]
                .where((r) => r.text('equipment_id') == item.id)
                .map(
                  (r) => RentalCard(
                    rental: r,
                    equipment: data[0],
                    customers: data[3],
                    origin: ReturnOrigin.equipment,
                  ),
                ),
            const Section('Rental history'),
            ...data[2]
                .where((r) => r.text('equipment_id') == item.id)
                .map(
                  (r) => RentalCard(
                    rental: r,
                    equipment: data[0],
                    customers: data[3],
                    origin: ReturnOrigin.equipment,
                  ),
                ),
            const Section('Maintenance history'),
            ...item
                .records('maintenance_logs')
                .map(
                  (l) => Panel(
                    children: [
                      Text(
                        '${l.text('action')} • ${dateText(l.text('created_at'))}',
                      ),
                      Text(l.text('remark')),
                      Text(money(l.number('cost'))),
                      ...l.strings('photos').map((p) => Picture(p)),
                    ],
                  ),
                ),
          ],
        );
      },
    ),
  );
}

class SaleForm extends StatefulWidget {
  final Record item;
  final List<Record> customers;
  const SaleForm({super.key, required this.item, required this.customers});
  @override
  State<SaleForm> createState() => _SaleFormState();
}

class _SaleFormState extends State<SaleForm> {
  String customer = '';
  final quantity = TextEditingController(text: '1'),
      price = TextEditingController(text: '0'),
      paid = TextEditingController(text: '0'),
      remark = TextEditingController();
  @override
  void dispose() {
    for (final c in [quantity, price, paid, remark]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Section('Sell ${widget.item.name}'),
      DropdownButtonFormField<String>(
        isExpanded: true,
        decoration: const InputDecoration(labelText: 'Customer'),
        items: widget.customers
            .map(
              (c) => DropdownMenuItem(
                value: c.id,
                child: Text(
                  '${c.name} • ${c.text('phone')}',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            )
            .toList(),
        onChanged: (v) => customer = v ?? '',
      ),
      const SizedBox(height: 16),
      Field('Quantity', quantity, integer: true, required: true, min: 1, max: available(widget.item)),
      Field('Selling price / unit', price, number: true),
      Field('Amount paid', paid, number: true),
      Field('Remark', remark, maxLength: 1000),
      ActionButton('Record sale', () async {
        if (customer.isEmpty) {
          throw Exception('Select a customer for this sale');
        }
        if (inputCount(quantity.text) <= 0) {
          throw Exception('Enter a valid sale quantity');
        }
        final app = AppScope.of(context);
        await app.repo.save('/equipment/${widget.item.id}/sell', {
          'customer_id': customer,
          'quantity': inputCount(quantity.text),
          'selling_price': inputNumber(price.text),
          'amount_paid': inputNumber(paid.text),
          'remark': remark.text,
        });
        app.changed();
        if (context.mounted) Navigator.pop(context);
      }),
    ],
  );
}

class MasterScreen extends StatefulWidget {
  const MasterScreen({super.key});
  @override
  State<MasterScreen> createState() => _MasterScreenState();
}

class _MasterScreenState extends State<MasterScreen> {
  Future<List<List<Record>>>? future;
  String search = '';
  int revision = -1;
  void load() {
    final repo = AppScope.of(context).repo;
    future = Future.wait([
      repo.list('/categories'),
      repo.paged('/equipment', query: {'page_size': 500}),
    ]);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (revision != AppScope.of(context).revision) {
      revision = AppScope.of(context).revision;
      load();
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Category Master')),
    body: PageList(
      children: [
        Section(
          'Categories',
          trailing: IconButton(
            onPressed: () => sheet(context, const CategoryForm()),
            icon: const Icon(Icons.add),
          ),
        ),
        TextField(
          decoration: const InputDecoration(hintText: 'Search categories'),
          onChanged: (v) => setState(() => search = v),
        ),
        DataView(
          future: future!,
          builder: (data) => Column(
            children: data[0]
                .where(
                  (c) => c.name.toLowerCase().contains(search.toLowerCase()),
                )
                .map((c) {
                  final count = data[1]
                      .where((e) => e.text('category_id') == c.id)
                      .length;
                  return Card(
                    child: ListTile(
                      title: Text(c.name),
                      subtitle: Text('$count equipment items'),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () async {
                          if (count > 0) {
                            toast(
                              context,
                              'This category has equipment. Remove or move its equipment first.',
                            );
                            return;
                          }
                          if (await confirm(
                                context,
                                'Delete category?',
                                c.name,
                              ) &&
                              context.mounted) {
                            try {
                              final app = AppScope.of(context);
                              await app.repo.delete('/categories/${c.id}');
                              app.changed();
                            } catch (e) {
                              if (context.mounted) toast(context, e);
                            }
                          }
                        },
                      ),
                    ),
                  );
                })
                .toList(),
          ),
        ),
      ],
    ),
  );
}

class DamagedScreen extends StatefulWidget {
  const DamagedScreen({super.key});
  @override
  State<DamagedScreen> createState() => _DamagedScreenState();
}

class _DamagedScreenState extends State<DamagedScreen> {
  int revision = -1;
  Future<List<Record>>? future;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final app = AppScope.of(context);
    if (revision != app.revision) {
      revision = app.revision;
      future = app.repo.paged('/equipment');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Damaged')),
    body: DataView(
      future: future!,
      builder: (items) {
        final damaged = items
            .where((e) => e.count('damaged_count') > 0)
            .toList();
        return PageList(
          children: [
            const Section('Damaged Equipment'),
            if (damaged.isEmpty) const Empty('No damaged equipment'),
            ...damaged.map(
              (e) => Panel(
                children: [
                  Section(e.name),
                  Text('${e.count('damaged_count')} damaged units'),
                  ...e
                      .records('maintenance_logs')
                      .where((l) => l.text('action') == 'Damage')
                      .map(
                        (l) => Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${dateText(l.text('created_at'))} • ${l.text('remark')}',
                            ),
                            ...l.strings('photos').map((p) => Picture(p)),
                          ],
                        ),
                      ),
                  ActionButton('Mark Repaired', () async {
                    await maintenanceForm(context, e, 'Repair');
                  }),
                ],
              ),
            ),
          ],
        );
      },
    ),
  );
}
