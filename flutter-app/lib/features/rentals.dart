import '../core/validation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../app/controller.dart';
import '../core/api.dart';
import '../core/models.dart';
import '../core/widgets.dart';
import '../core/media.dart';
import 'home.dart';
import 'invoices.dart';

enum ReturnOrigin { rentals, customer, equipment }

class RentalsScreen extends StatefulWidget {
  final bool showCreateAction;
  const RentalsScreen({super.key, this.showCreateAction = true});
  @override
  State<RentalsScreen> createState() => _RentalsScreenState();
}

class _RentalsScreenState extends State<RentalsScreen> {
  bool history = false;
  String from = '', to = '', search = '', dueFilter = 'All';
  Future<List<List<Record>>>? future;
  int revision = -1;
  void reload() {
    final repo = AppScope.of(context).repo;
    setState(() {
      future = Future.wait([
        repo.active(query: {'date_from': from, 'date_to': to}),
        repo.history(query: {'date_from': from, 'date_to': to}),
        repo.paged('/equipment'),
        repo.paged('/customers'),
      ]);
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (revision != AppScope.of(context).revision) {
      revision = AppScope.of(context).revision;
      reload();
    }
  }

  @override
  Widget build(BuildContext context) => PageList(
    children: [
      Section(
        'Rentals',
        trailing: widget.showCreateAction
            ? ElevatedButton.icon(
                onPressed: () => sheet(context, const BundleRentalForm()),
                icon: const Icon(Icons.add),
                label: const Text('New rental'),
              )
            : null,
      ),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          ChoiceChip(
            label: const Text('Ongoing'),
            selected: !history,
            onSelected: (_) => setState(() => history = false),
          ),
          ChoiceChip(
            label: const Text('History'),
            selected: history,
            onSelected: (_) => setState(() => history = true),
          ),
        ],
      ),
      const SizedBox(height: 12),
      TextField(
        decoration: const InputDecoration(
          hintText: 'Search customer or item',
          prefixIcon: Icon(Icons.search),
        ),
        onChanged: (value) => setState(() => search = value),
      ),
      const SizedBox(height: 12),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: ['All', 'Due soon', 'Overdue', 'Payment due']
              .map(
                (filter) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(filter),
                    selected: dueFilter == filter,
                    onSelected: (_) => setState(() => dueFilter = filter),
                  ),
                ),
              )
              .toList(),
        ),
      ),
      const SizedBox(height: 12),
      DateField(
        label: 'From',
        value: from,
        allowPast: true,
        onChanged: (v) {
          from = v;
          reload();
        },
      ),
      DateField(
        label: 'To',
        value: to,
        allowPast: true,
        onChanged: (v) {
          to = v;
          reload();
        },
      ),
      DataView(
        future: future!,
        retry: reload,
        builder: (data) {
          final now = DateTime.now();
          final rentals = data[history ? 1 : 0].where((r) {
            final customer = data[3]
                .where((c) => c.id == r.text('customer_id'))
                .firstOrNull;
            final item = data[2]
                .where((e) => e.id == r.text('equipment_id'))
                .firstOrNull;
            final haystack = '${customer?.name ?? ''} ${item?.name ?? ''}'
                .toLowerCase();
            if (!haystack.contains(search.toLowerCase())) return false;
            final expected = DateTime.tryParse(r.text('expected_return_date'));
            return switch (dueFilter) {
              'Overdue' => expected != null && expected.isBefore(now),
              'Due soon' =>
                expected != null &&
                    !expected.isBefore(now) &&
                    expected.difference(now).inDays <= 2,
              'Payment due' => r.number('amount_due') > 0,
              _ => true,
            };
          }).toList();
          final customerIds = rentals.map((r) => r.text('customer_id')).toSet();
          return Column(
            children: [
              if (rentals.isEmpty) const Empty('No rentals found'),
              ...customerIds.map((id) {
                final group = rentals
                    .where((r) => r.text('customer_id') == id)
                    .toList();
                return Column(
                  children: [
                    Section(
                      data[3].where((c) => c.id == id).firstOrNull?.name ??
                          'Customer #$id',
                      trailing: !history
                          ? TextButton(
                              onPressed: () => sheet(
                                context,
                                ReturnForm(
                                  rentals: group,
                                  equipment: data[2],
                                  origin: ReturnOrigin.rentals,
                                  batch: true,
                                ),
                              ),
                              child: const Text('Return All'),
                            )
                          : null,
                    ),
                    ...group.map(
                      (r) => RentalCard(
                        rental: r,
                        equipment: data[2],
                        customers: data[3],
                      ),
                    ),
                  ],
                );
              }),
            ],
          );
        },
      ),
    ],
  );
}

class RentalCard extends StatelessWidget {
  final Record rental;
  final List<Record> equipment, customers;
  final ReturnOrigin origin;
  const RentalCard({
    super.key,
    required this.rental,
    required this.equipment,
    required this.customers,
    this.origin = ReturnOrigin.rentals,
  });
  @override
  Widget build(BuildContext context) {
    final active = rental.text('status') == 'Active';
    final e = equipment
        .where((e) => e.id == rental.text('equipment_id'))
        .firstOrNull;
    final c = customers
        .where((c) => c.id == rental.text('customer_id'))
        .firstOrNull;
    final expected = DateTime.tryParse(rental.text('expected_return_date'));
    final overdue =
        active && expected != null && expected.isBefore(DateTime.now());
    final dueSoon =
        active &&
        expected != null &&
        !overdue &&
        expected.difference(DateTime.now()).inDays <= 2;
    final status = overdue
        ? 'Overdue'
        : dueSoon
        ? 'Due soon'
        : rental.text('status');
    return Panel(
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                e?.name ?? 'Item #${rental.text('equipment_id')}',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ),
            StatusPill(status),
          ],
        ),
        Text('${c?.name ?? ''} • Qty ${rental.count('quantity', 1)}'),
        Text('Rented ${dateText(rental.text('rented_at'), time: true)}'),
        if (expected != null)
          Text(
            'Expected ${dateText(expected.toIso8601String())}',
            style: TextStyle(
              color: active && expected.isBefore(DateTime.now())
                  ? Theme.of(context).colorScheme.error
                  : null,
            ),
          ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 12,
          runSpacing: 6,
          children: [
            _RentalFact(
              icon: Icons.inventory_2_outlined,
              text: 'Qty ${rental.count('quantity', 1)}',
            ),
            _RentalFact(
              icon: Icons.payments_outlined,
              text: 'Due ${money(rental.number('amount_due'))}',
            ),
            StatusPill(
              rental.number('amount_due') <= 0
                  ? 'Paid'
                  : rental.number('advance_amount') > 0
                  ? 'Partially paid'
                  : 'Unpaid',
            ),
          ],
        ),
        Wrap(
          spacing: 6,
          children: [
            if (active) ...[
              TextButton(
                onPressed: () => sheet(
                  context,
                  ReturnForm(
                    rentals: [rental],
                    equipment: equipment,
                    origin: origin,
                  ),
                ),
                child: const Text('Return'),
              ),
              TextButton(
                onPressed: () => sheet(context, RentalEditForm(rental: rental)),
                child: const Text('Details / Edit'),
              ),
              TextButton(
                onPressed: () async {
                  final advance = rental.number('advance_amount');
                  if (await confirm(
                        context,
                        'Cancel rental?',
                        advance > 0
                            ? 'The stock goes back and the advance of ${money(advance)} is recorded as refunded to the customer.'
                            : 'Cancel this rental and release its stock?',
                      ) &&
                      context.mounted) {
                    try {
                      final app = AppScope.of(context);
                      await app.repo.post('/rentals/${rental.id}/cancel', {'refund_advance': true});
                      app.changed();
                    } catch (e) {
                      if (context.mounted) toast(context, e);
                    }
                  }
                },
                child: const Text('Cancel'),
              ),
            ],
            if (!active && rental.text('status') == 'Completed') ...[
              TextButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => InvoiceScreen(rentalId: rental.id),
                  ),
                ),
                child: const Text('Invoice'),
              ),
              if (rental.number('amount_due') > 0)
                TextButton(
                  onPressed: () => sheet(
                    context,
                    PaymentForm(
                      rental: rental,
                      withReminder: origin == ReturnOrigin.customer,
                    ),
                  ),
                  child: const Text('Add payment'),
                ),
            ],
            if (c != null && c.text('phone').isNotEmpty)
              IconButton(
                onPressed: () =>
                    launchUrl(Uri(scheme: 'tel', path: c.text('phone'))),
                icon: const Icon(Icons.phone_outlined),
              ),
          ],
        ),
      ],
    );
  }
}

class _RentalFact extends StatelessWidget {
  final IconData icon;
  final String text;
  const _RentalFact({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(
        icon,
        size: 16,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
      ),
      const SizedBox(width: 4),
      Text(text, style: Theme.of(context).textTheme.bodySmall),
    ],
  );
}

class RentalEditForm extends StatefulWidget {
  final Record rental;
  const RentalEditForm({super.key, required this.rental});
  @override
  State<RentalEditForm> createState() => _RentalEditFormState();
}

class _RentalEditFormState extends State<RentalEditForm> {
  late final advance = TextEditingController(
        text: widget.rental.text('advance_amount', '0'),
      ),
      remark = TextEditingController(text: widget.rental.text('remark'));
  late String expected = widget.rental.text('expected_return_date');
  @override
  void dispose() {
    advance.dispose();
    remark.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Section('Rental Details'),
      Text('Rented ${dateText(widget.rental.text('rented_at'), time: true)}'),
      // Fixed once rented: the API does not change the quantity of an active
      // rental, so it is shown rather than offered as an input.
      Padding(
        padding: const EdgeInsets.only(top: 4, bottom: 14),
        child: Text('Quantity ${widget.rental.count('quantity', 1)}'),
      ),
      DateField(
        label: 'Expected return date',
        value: expected,
        allowPast: true,
        onChanged: (v) => setState(() => expected = v),
      ),
      Field('Advance Amount', advance, number: true),
      Field('Remark', remark, multiline: true, maxLength: 1000),
      ActionButton('Save changes', () async {
        final rented = widget.rental.text('rented_at');
        if (expected.isNotEmpty && rented.length >= 10 && expected.compareTo(rented.substring(0, 10)) < 0) throw const InputProblem('Expected return date cannot be earlier than the rental date.');
        final app = AppScope.of(context);
        await app.repo.save('/rentals/${widget.rental.id}', {
          'advance_amount': inputNumber(advance.text),
          'expected_return_date': expected.isEmpty ? null : expected,
          'remark': remark.text.isEmpty ? null : remark.text,
        }, update: true);
        app.changed();
        if (context.mounted) Navigator.pop(context);
      }),
    ],
  );
}

class PaymentForm extends StatefulWidget {
  final Record rental;
  final bool sale, withReminder;
  const PaymentForm({
    super.key,
    required this.rental,
    this.sale = false,
    this.withReminder = true,
  });
  @override
  State<PaymentForm> createState() => _PaymentFormState();
}

class _PaymentFormState extends State<PaymentForm> {
  late final amount = TextEditingController(text: widget.rental.number('amount_due').toStringAsFixed(2));
  String due = '', method = 'Cash';
  @override
  void dispose() {
    amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Section('Add payment'),
      Text('Pending ${money(widget.rental.number('amount_due'))}'),
      Field('Amount paid now', amount, number: true),
      PaymentMethodPicker(value: method, onChanged: (v) => setState(() => method = v)),
      if (!widget.sale && widget.withReminder)
        DateField(
          label: 'Next payment reminder date (optional)',
          value: due,
          onChanged: (v) => setState(() => due = v),
        ),
      ActionButton('Save payment', () async {
        final app = AppScope.of(context);
        await app.repo.save(
          widget.sale
              ? '/equipment/sales/${widget.rental.id}/payment'
              : '/rentals/${widget.rental.id}/payment',
          {
            'amount_paid': inputNumber(amount.text),
            'payment_method': method,
            if (!widget.sale && due.isNotEmpty) 'due_date': due,
          },
        );
        app.changed();
        if (context.mounted) Navigator.pop(context);
      }),
    ],
  );
}

const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'];

class PaymentMethodPicker extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;
  final String label;
  const PaymentMethodPicker({super.key, required this.value, required this.onChanged, this.label = 'Paid by'});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: DropdownButtonFormField<String>(
      isExpanded: true,
      initialValue: value,
      decoration: InputDecoration(labelText: label),
      items: paymentMethods.map((m) => DropdownMenuItem(value: m, child: Text(m, overflow: TextOverflow.ellipsis))).toList(),
      onChanged: (v) => onChanged(v ?? 'Cash'),
    ),
  );
}

/// Receive a return for one or more rentals of one customer. The bill is
/// computed by the server (POST /rentals/return/preview) and the return is
/// saved in one transaction (POST /rentals/return), so the numbers shown
/// here are exactly what's invoiced, including damage charges and refunds.
class ReturnForm extends StatefulWidget {
  final List<Record> rentals, equipment;
  final ReturnOrigin origin;
  final bool batch;
  const ReturnForm({super.key, required this.rentals, required this.equipment, required this.origin, this.batch = false});
  @override
  State<ReturnForm> createState() => _ReturnFormState();
}

class _ReturnFormState extends State<ReturnForm> {
  late List<Record> selected = List.of(widget.rentals);
  final discount = TextEditingController(),
      paid = TextEditingController(),
      lateFee = TextEditingController(),
      damageCost = TextEditingController(),
      damageUnits = TextEditingController(text: '1'),
      damageRemark = TextEditingController();
  String due = '', method = 'Cash';
  bool damage = false;
  List<String> photos = [];
  Record? preview;
  String previewError = '';
  int _previewSeq = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => refresh());
  }

  @override
  void dispose() {
    for (final c in [discount, paid, lateFee, damageCost, damageUnits, damageRemark]) {
      c.dispose();
    }
    super.dispose();
  }

  Map<String, dynamic> body() => {
    'rental_ids': selected.map((r) => r.id).toList(),
    'discount_amount': inputNumber(discount.text),
    'late_fee_amount': inputNumber(lateFee.text),
    'amount_paid': inputNumber(paid.text),
    'payment_method': method,
    if (due.isNotEmpty) 'due_date': due,
    if (damage && selected.length == 1)
      'damages': [
        {
          'rental_id': selected.first.id,
          'amount': inputNumber(damageCost.text),
          'damaged_quantity': inputCount(damageUnits.text),
          'photos': photos,
          if (damageRemark.text.trim().isNotEmpty) 'remark': damageRemark.text.trim(),
        },
      ],
  };

  Future<void> refresh() async {
    if (selected.isEmpty) return;
    final seq = ++_previewSeq;
    try {
      final result = await AppScope.of(context).repo.previewReturn(body());
      if (mounted && seq == _previewSeq) {
        setState(() {
          preview = result;
          previewError = '';
        });
      }
    } catch (e) {
      if (mounted && seq == _previewSeq) setState(() => previewError = '$e');
    }
  }

  String _name(Record rental) =>
      rental.child('equipment').text('name', widget.equipment.where((e) => e.id == rental.text('equipment_id')).firstOrNull?.name ?? 'Item');

  @override
  Widget build(BuildContext context) {
    final totals = preview?.child('totals');
    final lines = {for (final l in preview?.records('lines') ?? <Record>[]) l.text('rental_id'): l};
    final refund = totals?.number('refund_amount') ?? 0;
    final dueAmount = totals?.number('amount_due') ?? 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Section(widget.batch ? 'Return All' : 'Receive Return'),
        ...selected.map((r) {
          final line = lines[r.id];
          return ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(_name(r)),
            subtitle: Text(
              line == null
                  ? 'Qty ${r.count('quantity', 1)}'
                  : 'Qty ${line.count('quantity')} • ${line.count('days')} day(s) × ${money(line.number('daily_rate'))}',
            ),
            trailing: widget.batch && selected.length > 1
                ? IconButton(
                    tooltip: 'Leave this item out',
                    onPressed: () {
                      setState(() => selected.remove(r));
                      refresh();
                    },
                    icon: const Icon(Icons.close),
                  )
                : line == null
                ? null
                : Text(money(line.number('total_amount')), style: const TextStyle(fontWeight: FontWeight.w700)),
          );
        }),
        const SizedBox(height: 8),
        Field('Discount', discount, number: true, onChanged: (_) => refresh()),
        Field('Late fee', lateFee, number: true, onChanged: (_) => refresh()),
        if (selected.length == 1) ...[
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Report damage'),
            subtitle: const Text('Charged on the invoice; damaged units go to repair'),
            value: damage,
            onChanged: (v) {
              setState(() => damage = v);
              refresh();
            },
          ),
          if (damage) ...[
            Field('Damage charge', damageCost, number: true, onChanged: (_) => refresh()),
            Field('Units damaged', damageUnits, integer: true, required: true, max: selected.first.count('quantity')),
            Field('Describe the damage', damageRemark, maxLength: 1000),
            ...photos.map((p) => Picture(p, height: 100)),
            if (photos.length < 4)
              ActionButton('Add damage photo', () async {
                final url = await uploadImage(AppScope.of(context), kind: UploadKind.damage);
                if (url != null && mounted) setState(() => photos.add(url));
              }, validateForm: false),
          ],
        ],
        const SizedBox(height: 8),
        if (previewError.isNotEmpty)
          Text(previewError, style: TextStyle(color: Theme.of(context).colorScheme.error))
        else if (totals == null)
          const LinearProgressIndicator()
        else
          Panel(
            children: [
              _TotalRow('Rent', money(totals.number('gross_amount'))),
              if (totals.number('discount_amount') > 0)
                _TotalRow(
                  totals.json['discount_capped'] == true ? 'Discount (capped at ${decimalText(totals.number('discount_cap_percent'))}%)' : 'Discount',
                  '− ${money(totals.number('discount_amount'))}',
                ),
              if (totals.number('late_fee_amount') > 0) _TotalRow('Late fee', '+ ${money(totals.number('late_fee_amount'))}'),
              if (totals.number('damage_amount') > 0) _TotalRow('Damage', '+ ${money(totals.number('damage_amount'))}'),
              if (totals.number('tax_amount') > 0) _TotalRow('Tax', '+ ${money(totals.number('tax_amount'))}'),
              _TotalRow('Total', money(totals.number('total_amount')), strong: true),
              if (totals.number('advance_amount') > 0) _TotalRow('Advance already paid', '− ${money(totals.number('advance_amount'))}'),
              if (refund > 0) _TotalRow('Refund to customer', money(refund), strong: true),
            ],
          ),
        if (refund == 0) ...[
          Field('Amount received now', paid, number: true, onChanged: (_) => refresh()),
          PaymentMethodPicker(value: method, onChanged: (v) => setState(() => method = v)),
        ],
        if (totals != null)
          Text(
            dueAmount > 0 ? 'Still due: ${money(dueAmount)}' : 'Settled',
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
        if (dueAmount > 0)
          DateField(label: 'Promise to pay by (optional)', value: due, onChanged: (v) => setState(() => due = v)),
        const SizedBox(height: 16),
        ActionButton('Confirm Return & Pay', selected.isEmpty || totals == null ? null : submit),
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
      ],
    );
  }

  Future<void> submit() async {
    final app = AppScope.of(context);
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final result = await app.repo.completeReturn(body());
    final completed = result.records('rentals');
    final refund = result.child('summary').child('totals').number('refund_amount');
    app.changed();
    if (refund > 0) messenger.showSnackBar(SnackBar(content: Text('Returned. Give back ${money(refund)} of the advance.')));
    if (!mounted) return;
    if (app.hasFeature('paymentQrCode') && refund == 0 && result.child('summary').child('totals').number('amount_due') > 0) {
      String qr = '';
      try {
        qr = (await app.repo.get('/settings/qr_code')).text('value');
      } catch (_) {}
      if (!mounted) return;
      if (qr.isNotEmpty) {
        await showDialog<void>(
          context: context,
          builder: (c) => AlertDialog(
            title: const Text('Scan to pay'),
            content: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 260),
              child: Picture(qr, height: 260, fit: BoxFit.contain),
            ),
            actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('Done'))],
          ),
        );
      }
    }
    if (!mounted) return;
    navigator.pop();
    if (widget.origin != ReturnOrigin.equipment && completed.isNotEmpty) {
      navigator.push(
        MaterialPageRoute<void>(
          builder: (_) => completed.length > 1 ? const InvoiceListScreen() : InvoiceScreen(rentalId: completed.first.id),
        ),
      );
    }
  }
}

class _TotalRow extends StatelessWidget {
  final String label, value;
  final bool strong;
  const _TotalRow(this.label, this.value, {this.strong = false});
  @override
  Widget build(BuildContext context) {
    final style = TextStyle(fontWeight: strong ? FontWeight.w800 : FontWeight.w500);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [Flexible(child: Text(label, style: style)), Text(value, style: style)],
      ),
    );
  }
}

class CustomerDetailScreen extends StatefulWidget {
  final Record customer;
  const CustomerDetailScreen({super.key, required this.customer});
  @override
  State<CustomerDetailScreen> createState() => _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends State<CustomerDetailScreen> {
  Future<List<List<Record>>>? future;
  int revision = -1;
  void load() {
    final repo = AppScope.of(context).repo;
    future = Future.wait([
      repo.paged('/customers'),
      repo.active(),
      repo.history(),
      repo.paged('/equipment'),
      repo.paged(
        '/equipment/sales',
        query: {'customer_id': widget.customer.id},
      ),
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
    appBar: AppBar(title: const Text('Customer Detail')),
    body: DataView(
      future: future!,
      retry: () => setState(load),
      builder: (data) {
        final customer = data[0]
            .where((c) => c.id == widget.customer.id)
            .firstOrNull;
        if (customer == null) return const Empty('Customer not found');
        final active = data[1]
                .where((r) => r.text('customer_id') == customer.id)
                .toList(),
            history = data[2]
                .where((r) => r.text('customer_id') == customer.id)
                .toList();
        return PageList(
          children: [
            Panel(
              children: [
                if (customer.text('photo_url').isNotEmpty)
                  Picture(customer.text('photo_url'), height: 120),
                Section(customer.name),
                Text(customer.text('phone')),
                Text(customer.text('address')),
                if (customer.text('doc_url').isNotEmpty) ...[
                  const Section('Document'),
                  Picture(customer.text('doc_url'), height: 160),
                ],
              ],
            ),
            metric(
              'Total pending',
              money(
                [
                  ...history,
                  ...data[4],
                ].fold<double>(0, (s, r) => s + r.number('amount_due')),
              ),
            ),
            Section(
              'Ongoing rentals',
              trailing: active.isEmpty
                  ? null
                  : TextButton(
                      onPressed: () => sheet(
                        context,
                        ReturnForm(
                          rentals: active,
                          equipment: data[3],
                          origin: ReturnOrigin.customer,
                          batch: true,
                        ),
                      ),
                      child: const Text('Return All'),
                    ),
            ),
            if (active.isEmpty) const Empty('No ongoing rentals'),
            ...active.map(
              (r) => RentalCard(
                rental: r,
                equipment: data[3],
                customers: [customer],
                origin: ReturnOrigin.customer,
              ),
            ),
            const Section('History'),
            ...history.map(
              (r) => RentalCard(
                rental: r,
                equipment: data[3],
                customers: [customer],
                origin: ReturnOrigin.customer,
              ),
            ),
            const Section('Equipment purchases'),
            ...data[4].map(
              (s) => Panel(
                children: [
                  Text(
                    data[3]
                            .where((e) => e.id == s.text('equipment_id'))
                            .firstOrNull
                            ?.name ??
                        'Equipment',
                  ),
                  Text(
                    'Quantity ${s.count('quantity')} • ${money(s.number('total_price'))}',
                  ),
                  Text('Due ${money(s.number('amount_due'))}'),
                  StatusPill(s.text('payment_status')),
                  if (s.number('amount_due') > 0)
                    TextButton(
                      onPressed: () =>
                          sheet(context, PaymentForm(rental: s, sale: true)),
                      child: const Text('Add payment'),
                    ),
                ],
              ),
            ),
          ],
        );
      },
    ),
  );
}

class BundleRentalForm extends StatefulWidget {
  const BundleRentalForm({super.key});
  @override
  State<BundleRentalForm> createState() => _BundleRentalFormState();
}

class _BundleRentalFormState extends State<BundleRentalForm> {
  List<Record> equipment = [];
  final List<Map<String, dynamic>> bundles = [
    {'label': 'Bundle 1', 'customer': null, 'items': <String>{}},
  ];
  int index = 0;
  bool loaded = false;
  String search = '';
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!loaded) {
      loaded = true;
      AppScope.of(context).repo
          .paged('/equipment')
          .then((v) {
            if (mounted) setState(() => equipment = v);
          })
          .catchError((Object e) {
            if (mounted) toast(context, e);
          });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bundle = bundles[index];
    final selected = bundle['items'] as Set<String>;
    final customer = bundle['customer'] as Record?;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Section('New rental'),
        Wrap(
          spacing: 8,
          children: [
            ...List.generate(
              bundles.length,
              (i) => ChoiceChip(
                label: Text(bundles[i]['label'] as String),
                selected: i == index,
                onSelected: (_) => setState(() => index = i),
              ),
            ),
            ActionChip(
              label: const Text('+ Bundle'),
              onPressed: () => setState(() {
                bundles.add({
                  'label': 'Bundle ${bundles.length + 1}',
                  'customer': null,
                  'items': <String>{},
                });
                index = bundles.length - 1;
              }),
            ),
          ],
        ),
        TextButton(
          onPressed: () async {
            final c = await sheet<Record>(context, const CustomerPicker());
            if (c != null && mounted) setState(() => bundle['customer'] = c);
          },
          child: Text(customer?.name ?? 'Select customer'),
        ),
        TextField(
          decoration: const InputDecoration(hintText: 'Search equipment'),
          onChanged: (v) => setState(() => search = v),
        ),
        ...equipment
            .where((e) => e.name.toLowerCase().contains(search.toLowerCase()))
            .map(
              (e) => CheckboxListTile(
                value: selected.contains(e.id),
                onChanged: (v) => setState(() {
                  if (v == true) {
                    selected.add(e.id);
                  } else {
                    selected.remove(e.id);
                  }
                }),
                title: Text(e.name),
                subtitle: Text(
                  '${available(e)} available • ${money(e.number('rent_per_day'))}/day',
                ),
              ),
            ),
        ActionButton(
          'Continue',
          customer == null || selected.isEmpty
              ? null
              : () async {
                  await Navigator.push<bool>(
                    context,
                    MaterialPageRoute(
                      builder: (_) => RentalFormScreen(
                        customer: customer,
                        items: equipment
                            .where((e) => selected.contains(e.id))
                            .map(
                              (e) => Record({
                                ...e.json,
                                'stock_count': available(e),
                              }),
                            )
                            .toList(),
                        reservations: false,
                      ),
                    ),
                  );
                },
        ),
      ],
    );
  }
}
