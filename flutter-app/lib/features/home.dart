import '../core/validation.dart';
import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../app/controller.dart';
import '../core/api.dart';
import '../core/models.dart';
import '../core/widgets.dart';
import 'forms.dart';
import 'rentals.dart';

Future<bool> resolveConflict(
  BuildContext context,
  ApiError error,
  String customer,
) async {
  final conflict = Record(
    Map<String, dynamic>.from(error.body['conflict'] as Map? ?? {}),
  );
  if (conflict.text('reservation_id').isEmpty) {
    toast(context, error);
    return false;
  }
  if (!await confirm(
    context,
    'Reservation conflict',
    '${error.message}\n${conflict.text('customer_name')} holds ${conflict.count('quantity')} item(s). Transfer to this order?',
  )) {
    return false;
  }
  if (!context.mounted) return false;
  await AppScope.of(context).repo.save(
    '/reservations/${conflict.text('reservation_id')}/transfer',
    {'to_customer_id': customer},
  );
  return true;
}

class HomeScreen extends StatefulWidget {
  final String focusEquipment;
  final bool active;
  const HomeScreen({super.key, this.focusEquipment = '', this.active = true});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  AppController? app;
  Timer? polling, notices;
  Record? customer;
  List<Record> customers = [],
      equipment = [],
      categories = [],
      holds = [],
      active = [];
  String search = '', error = '';
  bool loading = true, busy = false;
  int revision = -1;
  final searchControl = TextEditingController();
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final current = AppScope.of(context);
    if (app == null) {
      app = current;
      polling = Timer.periodic(const Duration(seconds: 8), (_) {
        if (widget.active) poll();
      });
      notices = Timer.periodic(const Duration(seconds: 12), (_) {
        if (widget.active) readNotices();
      });
    }
    if (revision != current.revision) {
      revision = current.revision;
      load();
    }
  }

  @override
  void didUpdateWidget(HomeScreen old) {
    super.didUpdateWidget(old);
    if (widget.focusEquipment != old.focusEquipment) {
      search = widget.focusEquipment;
      searchControl.text = search;
    }
  }

  @override
  void dispose() {
    polling?.cancel();
    notices?.cancel();
    searchControl.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final repo = app!.repo;
      final data = await Future.wait([
        repo.paged('/customers'),
        repo.paged('/equipment'),
        repo.list('/categories'),
        repo.list('/reservations'),
        repo.active(),
      ]);
      if (mounted) {
        setState(() {
          customers = data[0];
          equipment = data[1];
          categories = data[2];
          holds = data[3];
          active = data[4];
          loading = false;
          error = '';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          error = e.toString();
          loading = false;
        });
      }
    }
  }

  Future<void> poll() async {
    try {
      final result = await app!.repo.list('/reservations');
      if (mounted) setState(() => holds = result);
    } catch (_) {}
  }

  Future<void> readNotices() async {
    try {
      final data = await app!.repo.list('/reservations/notices');
      for (final notice in data) {
        if (!mounted) return;
        toast(context, notice.text('message'));
        await app!.repo.post('/reservations/notices/${notice.id}/ack');
      }
    } catch (_) {}
  }

  List<Record> get draft =>
      holds.where((r) => r.text('customer_id') == customer?.id).toList();
  int maxFor(Record item) => math.max(
    available(item) -
        holds
            .where(
              (r) =>
                  r.text('equipment_id') == item.id &&
                  r.text('customer_id') != customer?.id,
            )
            .fold<int>(0, (s, r) => s + r.count('quantity')),
    0,
  );
  Future<void> chooseCustomer() async {
    final selected = await sheet<Record>(context, const CustomerPicker());
    if (selected == null || !mounted) return;
    selectCustomer(selected);
  }

  void selectCustomer(Record selected) {
    setState(() => customer = selected);
    final rentals = active
        .where((r) => r.text('customer_id') == selected.id)
        .toList();
    final due = rentals.fold<double>(0, (s, r) => s + r.number('amount_due'));
    if (rentals.isNotEmpty || due > 0) {
      toast(
        context,
        '${selected.name} has ${rentals.length} ongoing rentals and ${money(due)} pending.',
      );
    }
  }

  Future<void> toggle(Record item) async {
    if (customer == null) {
      toast(context, 'Select a customer before picking items.');
      return;
    }
    if (busy) return;
    setState(() => busy = true);
    try {
      final existing = draft
          .where((h) => h.text('equipment_id') == item.id)
          .firstOrNull;
      if (existing != null) {
        await app!.repo.delete('/reservations/${existing.id}');
      } else {
        await app!.repo.reserve(customer!.id, item.id, 1);
      }
      await poll();
    } on ApiError catch (e) {
      if (mounted) {
        try {
          if (e.status == 409) {
            await resolveConflict(context, e, customer!.id);
            await poll();
          } else {
            toast(context, e);
          }
        } catch (failure) {
          if (mounted) toast(context, failure);
        }
      }
    } catch (e) {
      if (mounted) toast(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const LoadingSkeleton(rows: 5);
    if (error.isNotEmpty) {
      return ErrorState(error: error, retry: load);
    }
    final filtered = equipment
        .where((e) => e.name.toLowerCase().contains(search.toLowerCase()))
        .toList();
    final width = MediaQuery.sizeOf(context).width;
    final textScale = MediaQuery.textScalerOf(context).scale(1);
    final showConfirm = customer != null && draft.isNotEmpty;
    return Column(
      children: [
        Expanded(
          // The confirm bar below keeps clear of the navigation bar itself.
          child: MediaQuery.removePadding(
            context: context,
            removeBottom: showConfirm,
            child: RefreshIndicator(
              onRefresh: load,
              child: PageList(
                children: [
                  _CustomerStories(
                    customers: customers,
                    selectedCustomerId: customer?.id,
                    onSelected: selectCustomer,
                    onSearch: chooseCustomer,
                  ),
                  const SizedBox(height: 12),
                  Panel(
                    children: [
                      Section(
                        customer?.name ?? 'Select a customer',
                        trailing: IconButton(
                          onPressed: chooseCustomer,
                          icon: const Icon(Icons.person_search_outlined),
                        ),
                      ),
                      Text(
                        customer?.text('phone') ??
                            'Pick a customer to start a rental',
                      ),
                      Wrap(
                        spacing: 4,
                        runSpacing: 0,
                        children: [
                          TextButton(
                            onPressed: chooseCustomer,
                            child: const Text('Search customer'),
                          ),
                          TextButton(
                            onPressed: () => sheet(
                              context,
                              CustomerForm(
                                onSaved: (r) => setState(() => customer = r),
                              ),
                            ),
                            child: const Text('+ New'),
                          ),
                          if (customer != null)
                            TextButton(
                              onPressed: () async {
                                if (draft.isNotEmpty &&
                                    !await confirm(
                                      context,
                                      'Clear order?',
                                      'Release every item reserved for this customer?',
                                    )) {
                                  return;
                                }
                                try {
                                  await app!.repo.delete(
                                    '/reservations/customer/${customer!.id}',
                                  );
                                  if (mounted) setState(() => customer = null);
                                  await poll();
                                } catch (e) {
                                  if (context.mounted) toast(context, e);
                                }
                              },
                              child: const Text('Clear'),
                            ),
                        ],
                      ),
                    ],
                  ),
                  TextField(
                    controller: searchControl,
                    decoration: const InputDecoration(
                      hintText: 'Search equipment...',
                      prefixIcon: Icon(Icons.search),
                    ),
                    onChanged: (v) => setState(() => search = v),
                  ),
                  const SizedBox(height: 16),
                  if (filtered.isEmpty) const Empty('No equipment found'),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: width >= 1100
                          ? 4
                          : width >= 800
                          ? 3
                          : 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      // Card margin, photo and padding, plus four text lines
                      // that grow with the system font size.
                      mainAxisExtent: 165 + 80 * textScale,
                    ),
                    itemCount: filtered.length,
                    itemBuilder: (c, i) {
                      final e = filtered[i];
                      final selected = draft.any(
                        (h) => h.text('equipment_id') == e.id,
                      );
                      return Card(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(
                            color: selected
                                ? Theme.of(context).colorScheme.secondary
                                : Theme.of(context).dividerColor,
                            width: selected ? 2 : 1,
                          ),
                        ),
                        child: InkWell(
                          onTap: () => toggle(e),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Stack(
                                children: [
                                  IgnorePointer(
                                    child: Picture(
                                      e.strings('images').firstOrNull ?? '',
                                      height: 125,
                                    ),
                                  ),
                                  if (selected)
                                    const Positioned(
                                      top: 8,
                                      right: 8,
                                      child: CircleAvatar(
                                        radius: 13,
                                        child: Icon(Icons.check, size: 18),
                                      ),
                                    ),
                                ],
                              ),
                              Padding(
                                padding: const EdgeInsets.all(10),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      categories
                                              .where(
                                                (c) =>
                                                    c.id ==
                                                    e.text('category_id'),
                                              )
                                              .firstOrNull
                                              ?.name
                                              .toUpperCase() ??
                                          '',
                                      maxLines: 1,
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Theme.of(
                                          context,
                                        ).colorScheme.primary,
                                      ),
                                    ),
                                    Text(
                                      e.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 16,
                                      ),
                                    ),
                                    Text(
                                      '${money(e.number('rent_per_day'))}/day',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      '${maxFor(e)} in stock',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: maxFor(e) <= 2
                                            ? Colors.orange
                                            : null,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
        if (showConfirm)
          BottomActionBar(
            child: ActionButton(
              'Confirm ${draft.length} items • ${money(draft.fold<double>(0, (s, r) => s + r.count('quantity') * (equipment.where((e) => e.id == r.text('equipment_id')).firstOrNull?.number('rent_per_day') ?? 0)))}/day',
              busy
                  ? null
                  : () async {
                      final picked = draft
                          .map((r) {
                            final e = equipment
                                .where((e) => e.id == r.text('equipment_id'))
                                .firstOrNull;
                            return e == null
                                ? null
                                : Record({
                                    ...e.json,
                                    'quantity': r.count('quantity'),
                                    'stock_count': maxFor(e),
                                  });
                          })
                          .whereType<Record>()
                          .toList();
                      final done = await Navigator.push<bool>(
                        context,
                        MaterialPageRoute(
                          builder: (_) => RentalFormScreen(
                            customer: customer!,
                            items: picked,
                          ),
                        ),
                      );
                      if (done == true && mounted) {
                        setState(() => customer = null);
                        await load();
                      }
                    },
            ),
          ),
      ],
    );
  }
}

class _CustomerStories extends StatelessWidget {
  final List<Record> customers;
  final String? selectedCustomerId;
  final ValueChanged<Record> onSelected;
  final VoidCallback onSearch;

  const _CustomerStories({
    required this.customers,
    required this.selectedCustomerId,
    required this.onSelected,
    required this.onSearch,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final scale = MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 1.35);
    final itemWidth = 76.0 * scale;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Section(
          'Customers',
          trailing: TextButton.icon(
            onPressed: onSearch,
            icon: const Icon(Icons.search, size: 18),
            label: const Text('Find'),
          ),
        ),
        SizedBox(
          key: const Key('home-customer-strip'),
          height: 98 * scale,
          child: customers.isEmpty
              ? Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'No customers yet',
                    style: TextStyle(color: Theme.of(context).hintColor),
                  ),
                )
              : ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(
                    parent: AlwaysScrollableScrollPhysics(),
                  ),
                  itemCount: customers.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final item = customers[index];
                    final selected = item.id == selectedCustomerId;
                    return SizedBox(
                      width: itemWidth,
                      child: Semantics(
                        button: true,
                        selected: selected,
                        label: 'Select customer ${item.name}',
                        child: InkWell(
                          key: Key('home-customer-${item.id}'),
                          borderRadius: BorderRadius.circular(16),
                          onTap: () => onSelected(item),
                          child: Column(
                            children: [
                              Stack(
                                clipBehavior: Clip.none,
                                children: [
                                  AnimatedContainer(
                                    duration: const Duration(milliseconds: 180),
                                    padding: const EdgeInsets.all(3),
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      gradient: selected
                                          ? LinearGradient(
                                              colors: [
                                                colorScheme.secondary,
                                                colorScheme.primary,
                                              ],
                                            )
                                          : null,
                                      border: selected
                                          ? null
                                          : Border.all(
                                              color: Theme.of(
                                                context,
                                              ).dividerColor,
                                            ),
                                    ),
                                    child: _CustomerStoryAvatar(customer: item),
                                  ),
                                  if (selected)
                                    Positioned(
                                      right: -1,
                                      bottom: -1,
                                      child: Container(
                                        width: 20,
                                        height: 20,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: colorScheme.secondary,
                                          border: Border.all(
                                            color: colorScheme.surface,
                                            width: 2,
                                          ),
                                        ),
                                        child: const Icon(
                                          Icons.check,
                                          size: 12,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                item.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: selected
                                      ? FontWeight.w800
                                      : FontWeight.w600,
                                  color: selected ? colorScheme.primary : null,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _CustomerStoryAvatar extends StatelessWidget {
  final Record customer;

  const _CustomerStoryAvatar({required this.customer});

  @override
  Widget build(BuildContext context) => PersonAvatar(
    name: customer.name,
    url: customer.text('photo_thumb_url'),
    fallbackUrl: customer.text('photo_url'),
    size: 58,
  );
}

class CustomerPicker extends StatefulWidget {
  const CustomerPicker({super.key});
  @override
  State<CustomerPicker> createState() => _CustomerPickerState();
}

class _CustomerPickerState extends State<CustomerPicker> {
  Future<List<Record>>? future;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    future ??= AppScope.of(context).repo.paged('/customers');
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      const Section('Find customer'),
      TextField(
        decoration: const InputDecoration(
          hintText: 'Search name or phone',
          prefixIcon: Icon(Icons.search),
        ),
        onChanged: (v) {
          if (v.trim().length >= 3 || v.isEmpty) {
            setState(() {
              future = AppScope.of(context).repo.paged(
                '/customers',
                query: {'search': v.trim(), 'page_size': 50},
              );
            });
          }
        },
      ),
      DataView(
        future: future!,
        builder: (items) => Column(
          children: [
            ...items.map(
              (c) => ListTile(
                leading: PersonAvatar(
                  name: c.name,
                  url: c.text('photo_thumb_url'),
                  fallbackUrl: c.text('photo_url'),
                ),
                title: Text(c.name),
                subtitle: Text(c.text('phone')),
                onTap: () => Navigator.pop(context, c),
              ),
            ),
            if (items.isEmpty) const Empty('No customers found'),
          ],
        ),
      ),
      TextButton(
        onPressed: () async {
          final c = await sheet<Record>(context, const CustomerForm());
          if (c != null && context.mounted) Navigator.pop(context, c);
        },
        child: const Text('Create new customer'),
      ),
    ],
  );
}

class RentalFormScreen extends StatefulWidget {
  final Record customer;
  final List<Record> items;
  final bool reservations;
  const RentalFormScreen({
    super.key,
    required this.customer,
    required this.items,
    this.reservations = true,
  });
  @override
  State<RentalFormScreen> createState() => _RentalFormScreenState();
}

class _RentalFormScreenState extends State<RentalFormScreen> {
  late final quantities = {
    for (final e in widget.items)
      e.id: TextEditingController(text: '${e.count('quantity', 1)}'),
  };
  late final synced = {
    for (final e in widget.items) e.id: e.count('quantity', 1),
  };
  final advance = TextEditingController(), remark = TextEditingController();
  String expected = '';
  bool accessory = false;
  int syncing = 0;
  @override
  void dispose() {
    for (final c in [...quantities.values, advance, remark]) {
      c.dispose();
    }
    super.dispose();
  }

  int qty(Record item) {
    final n = int.tryParse(quantities[item.id]!.text) ?? 0;
    return n < 1 ? 1 : n;
  }

  double get total {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime.tryParse(expected);
    final days = target == null
        ? 1
        : math.max(
            (target.difference(today).inMilliseconds / 86400000).ceil() + 1,
            1,
          );
    return widget.items.fold<double>(
          0,
          (s, e) => s + qty(e) * e.number('rent_per_day'),
        ) *
        days;
  }

  Future<void> sync(Record item) async {
    if (!widget.reservations) return;
    if (numberProblem(quantities[item.id]!.text, integer: true, required: true, min: 1, max: 100000) != null) return;
    final value = qty(item);
    setState(() => syncing++);
    try {
      await AppScope.of(
        context,
      ).repo.reserve(widget.customer.id, item.id, value);
      synced[item.id] = value;
    } catch (e) {
      if (mounted) {
        quantities[item.id]!.text = '${synced[item.id] ?? 1}';
        if (e is ApiError && e.status == 409) {
          try {
            await resolveConflict(context, e, widget.customer.id);
          } catch (f) {
            if (mounted) toast(context, f);
          }
        } else {
          toast(context, e);
        }
      }
    } finally {
      if (mounted) setState(() => syncing--);
    }
  }

  @override
  Widget build(BuildContext context) => Form(child: Scaffold(
    appBar: AppBar(title: const Text('New Rental')),
    bottomNavigationBar: BottomActionBar(child: confirmButton()),
    body: PageList(
      children: [
        Panel(
          children: [
            Section(widget.customer.name),
            Text(widget.customer.text('phone')),
          ],
        ),
        ...widget.items.map(
          (e) => Panel(
            children: [
              Section(e.name),
              Text(
                '${money(e.number('rent_per_day'))}/day • ${e.count('stock_count')} available',
              ),
              Focus(
                onFocusChange: (focused) {
                  if (!focused) sync(e);
                },
                child: Field(
                  'Quantity',
                  quantities[e.id]!,
                  integer: true,
                  required: true,
                  min: 1,
                  max: e.count('stock_count'),
                  onChanged: (_) => setState(() {}),
                ),
              ),
            ],
          ),
        ),
        DateField(
          label: 'Expected return date (optional)',
          value: expected,
          onChanged: (v) => setState(() => expected = v),
        ),
        Field(
          'Advance amount (INR)',
          advance,
          number: true,
          onChanged: (_) => setState(() {}),
        ),
        Field('Remark', remark, multiline: true, maxLength: 1000),
        SwitchListTile(
          title: const Text('Free add-on / accessory items'),
          value: accessory,
          onChanged: (v) => setState(() => accessory = v),
        ),
        metric('Estimated total rent', money(total)),
      ],
    ),
  ));

  Widget confirmButton() => ActionButton(
    'Confirm Rental',
    syncing > 0
        ? null
        : () async {
            if (widget.items.isEmpty) {
              throw Exception('Select at least one item to rent.');
            }
            for (final e in widget.items) {
              if (qty(e) <= 0 || qty(e) > e.count('stock_count')) {
                throw Exception(
                  'Insufficient stock for ${e.name}. Available: ${e.count('stock_count')}.',
                );
              }
            }
            if (total > 0 && inputNumber(advance.text) > total) {
              throw Exception(
                'Advance payment cannot exceed the total rent of ${money(total)}.',
              );
            }
            final app = AppScope.of(context);
            await app.repo.createRentals({
              'customer_id': widget.customer.id,
              'items': widget.items
                  .map((e) => {'equipment_id': e.id, 'quantity': qty(e)})
                  .toList(),
              if (expected.isNotEmpty) 'expected_return_date': expected,
              if (advance.text.isNotEmpty)
                'advance_amount': inputNumber(advance.text),
              if (remark.text.isNotEmpty || accessory)
                'remark': [
                  remark.text,
                  if (accessory) 'Customer took free add-on / accessory items.',
                ].where((s) => s.isNotEmpty).join(' | '),
            });
            if (widget.reservations) {
              try {
                await app.repo.delete(
                  '/reservations/customer/${widget.customer.id}',
                );
              } catch (e) {
                if (mounted) {
                  toast(
                    context,
                    'Rental created, but clearing the draft failed: $e',
                  );
                }
              }
            }
            app.changed();
            if (mounted) {
              Navigator.pop(context, true);
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) =>
                      CustomerDetailScreen(customer: widget.customer),
                ),
              );
            }
          },
  );
}
