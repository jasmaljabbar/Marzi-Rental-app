import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import '../app/controller.dart';
import '../core/models.dart';
import '../core/widgets.dart';
import '../core/platform/pdf_files.dart';

class InvoiceListScreen extends StatefulWidget {
  const InvoiceListScreen({super.key});
  @override
  State<InvoiceListScreen> createState() => _InvoiceListScreenState();
}

class _InvoiceListScreenState extends State<InvoiceListScreen> {
  String search = '', status = '';
  Future<List<Record>>? future;
  void load() {
    future = AppScope.of(context).repo.paged(
      '/invoices',
      query: {'search': search, 'payment_status': status},
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    future ??= AppScope.of(context).repo.paged('/invoices');
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Invoices')),
    body: PageList(
      children: [
        TextField(
          decoration: const InputDecoration(
            hintText: 'Search invoice # or customer',
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: (v) => setState(() {
            search = v;
            load();
          }),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          children: ['All', 'Pending', 'Partial', 'Paid']
              .map(
                (s) => ChoiceChip(
                  label: Text(s),
                  selected: status == (s == 'All' ? '' : s),
                  onSelected: (_) => setState(() {
                    status = s == 'All' ? '' : s;
                    load();
                  }),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 12),
        DataView(
          future: future!,
          retry: () => setState(load),
          builder: (items) => Column(
            children: [
              if (items.isEmpty) const Empty('No invoices found'),
              ...items.map(
                (i) => Card(
                  child: ListTile(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            InvoiceScreen(rentalId: i.text('rental_id')),
                      ),
                    ),
                    title: Text(i.text('invoice_number')),
                    subtitle: Text(
                      '${i.child('customer').name}\n${dateText(i.text('issued_at'))} • ${money(i.number('total_amount'))}',
                    ),
                    isThreeLine: true,
                    trailing: StatusPill(i.text('payment_status')),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class InvoiceScreen extends StatefulWidget {
  final String rentalId;
  const InvoiceScreen({super.key, required this.rentalId});
  @override
  State<InvoiceScreen> createState() => _InvoiceScreenState();
}

class _InvoiceScreenState extends State<InvoiceScreen> {
  Future<Record>? future;
  Uint8List? cached;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    future ??= AppScope.of(context).repo.get('/invoices/${widget.rentalId}');
  }

  Future<Uint8List> bytes() async {
    final invoice = await future!;
    final name =
        '${invoice.text('invoice_number').replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_')}.pdf';
    if (!mounted) throw StateError('Invoice screen closed');
    final api = AppScope.of(context).repo.api;
    return cachedInvoice(
      name,
      () => api.bytes('/invoices/${widget.rentalId}/pdf'),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Invoice')),
    body: DataView(
      future: future!,
      retry: () => setState(() {
        future = AppScope.of(context).repo.get('/invoices/${widget.rentalId}');
      }),
      builder: (invoice) {
        final company = invoice.child('company'),
            customer = invoice.child('customer'),
            charges = invoice.child('charges'),
            rental = invoice.child('rental');
        return PageList(
          children: [
            Panel(
              children: [
                if (company.text('logo_url').isNotEmpty)
                  Picture(company.text('logo_url'), height: 70),
                Section(company.name),
                Text(company.text('address')),
                Text(
                  [
                    company.text('phone'),
                    company.text('email'),
                  ].where((v) => v.isNotEmpty).join(' • '),
                ),
                if (company.text('tax_id').isNotEmpty)
                  Text('Tax ID: ${company.text('tax_id')}'),
                const Divider(),
                Section(invoice.text('invoice_number')),
                Text('Issued ${dateText(invoice.text('issued_at'))}'),
                if (invoice.text('due_date').isNotEmpty)
                  Text('Due ${dateText(invoice.text('due_date'))}'),
                StatusPill(invoice.text('payment_status')),
              ],
            ),
            Panel(
              children: [
                const Section('Bill to'),
                Text(
                  customer.name,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                Text(customer.text('phone')),
                Text(customer.text('address')),
              ],
            ),
            Panel(
              children: [
                const Section('Items'),
                Text(rental.child('equipment').name),
                Text(
                  '${charges.count('quantity')} × ${charges.count('days_rented')} days × ${money(charges.number('rent_per_day'))}',
                ),
                Text(
                  '${dateText(rental.text('rented_at'))} — ${dateText(rental.text('returned_at'))}',
                ),
              ],
            ),
            Panel(
              children: [
                charge('Gross amount', charges.number('gross_amount')),
                if (charges.number('discount_amount') > 0)
                  charge('Discount', -charges.number('discount_amount')),
                if (charges.number('late_fee_amount') > 0)
                  charge('Late fee', charges.number('late_fee_amount')),
                if (charges.number('tax_amount') > 0)
                  charge(
                    'Tax (${decimalText(charges.number('tax_rate_percent'))}%)',
                    charges.number('tax_amount'),
                  ),
                const Divider(),
                charge('Total', charges.number('total_amount')),
                if (charges.number('advance_amount') > 0)
                  charge(
                    'Advance paid (deposit)',
                    -charges.number('advance_amount'),
                  ),
                if (charges.number('amount_paid_on_return') > 0)
                  charge(
                    'Paid at return',
                    -charges.number('amount_paid_on_return'),
                  ),
                const Divider(),
                charge(
                  charges.number('amount_due') > 0
                      ? 'Balance due'
                      : 'Paid in full',
                  charges.number('amount_due'),
                ),
              ],
            ),
            if (company.text('footer_note').isNotEmpty)
              Text(company.text('footer_note'), textAlign: TextAlign.center),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionButton('Share', () async {
                  await Printing.sharePdf(
                    bytes: await bytes(),
                    filename:
                        '${invoice.text('invoice_number').replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_')}.pdf',
                  );
                }),
                ActionButton('Print', () async {
                  final data = await bytes();
                  await Printing.layoutPdf(onLayout: (_) => data);
                }),
                ActionButton('Download', () async {
                  final data = await bytes();
                  await savePdf(
                    data,
                    '${invoice.text('invoice_number').replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_')}.pdf',
                  );
                }),
              ],
            ),
          ],
        );
      },
    ),
  );
  Widget charge(String label, double amount) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      children: [
        Expanded(child: Text(label)),
        Text(
          money(amount),
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ],
    ),
  );
}
