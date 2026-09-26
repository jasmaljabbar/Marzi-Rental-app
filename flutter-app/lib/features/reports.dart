import 'package:flutter/material.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../app/controller.dart';
import '../core/models.dart';
import '../core/widgets.dart';
import 'rentals.dart';
import 'catalog.dart';

class DashboardScreen extends StatefulWidget {
  final bool scrollToAlerts;
  final bool embedded;
  final void Function(int)? openTab;
  const DashboardScreen({
    super.key,
    this.scrollToAlerts = false,
    this.embedded = false,
    this.openTab,
  });
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Future<List<List<Record>>>? future;
  final alertsKey = GlobalKey();
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final r = AppScope.of(context).repo;
    future ??= Future.wait([
      r.paged('/equipment'),
      r.paged('/customers'),
      r.active(),
      r.history(),
      r.paged('/equipment/sales'),
      r.list('/categories'),
      // Shop-wide totals computed on the server (index 6).
      r.get('/reports/dashboard', query: {'tz': DateTime.now().timeZoneOffset.inMinutes}).then((v) => [v]),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final body = DataView(
      future: future!,
      builder: (d) {
        final now = DateTime.now();
        final alerts =
            d[2].where((r) {
              final expected = DateTime.tryParse(
                r.text('expected_return_date'),
              );
              return expected != null &&
                  (expected.isBefore(now) ||
                      (expected.difference(now).inMilliseconds / 86400000)
                              .ceil() <=
                          2);
            }).toList()..sort(
              (a, b) => a
                  .text('expected_return_date')
                  .compareTo(b.text('expected_return_date')),
            );
        bool isToday(String value) {
          final date = DateTime.tryParse(value)?.toLocal();
          return date != null &&
              date.year == now.year &&
              date.month == now.month &&
              date.day == now.day;
        }

        final overview = <_DashboardMetricData>[
          _DashboardMetricData(
            'Active rentals',
            '${d[2].length}',
            Icons.handshake_outlined,
          ),
          _DashboardMetricData(
            "Today's rentals",
            '${d[2].where((r) => isToday(r.text('rented_at'))).length}',
            Icons.today_outlined,
          ),
          _DashboardMetricData(
            "Today's returns",
            '${d[3].where((r) => isToday(r.text('returned_at'))).length}',
            Icons.assignment_return_outlined,
          ),
          _DashboardMetricData(
            'Overdue',
            '${alerts.where((r) => DateTime.parse(r.text('expected_return_date')).isBefore(now)).length}',
            Icons.error_outline,
            urgent: true,
          ),
          _DashboardMetricData(
            'Available units',
            '${(d[6][0].child('inventory').number('on_hand_units') - d[6][0].child('inventory').number('damaged_units')).round()}',
            Icons.inventory_2_outlined,
          ),
          _DashboardMetricData(
            'Outstanding',
            money(d[6][0].child('outstanding_due').number('amount')),
            Icons.account_balance_wallet_outlined,
          ),
        ];
        if (widget.scrollToAlerts) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            final c = alertsKey.currentContext;
            if (c != null) Scrollable.ensureVisible(c);
          });
        }
        return PageList(
          children: [
            const Section('Business overview'),
            Wrap(
              spacing: 8,
              children: [
                OutlinedButton(
                  onPressed: () {
                    if (!widget.embedded) Navigator.pop(context);
                    widget.openTab?.call(2);
                  },
                  child: const Text('Inventory'),
                ),
                OutlinedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const DamagedScreen(),
                      ),
                    );
                  },
                  child: const Text('Damaged'),
                ),
                if (AppScope.of(context).hasFeature('analytics'))
                  OutlinedButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => const ReportsScreen(),
                      ),
                    ),
                    child: const Text('Reports'),
                  ),
                OutlinedButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => const MasterScreen(),
                    ),
                  ),
                  child: const Text('Categories'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                final textScale = MediaQuery.textScalerOf(context).scale(1);
                final columns = constraints.maxWidth >= 900
                    ? 3
                    : constraints.maxWidth >= 520
                    ? 2
                    : 2;
                return GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: overview.length,
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: columns,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    // Padding and icon, plus value and label lines that grow
                    // with the system font size.
                    mainAxisExtent: 82 + 44 * textScale,
                  ),
                  itemBuilder: (_, index) => _DashboardMetric(overview[index]),
                );
              },
            ),
            Section('Rental alerts', key: alertsKey),
            if (alerts.isEmpty) const Empty('No rental alerts'),
            ...alerts.map((r) {
              final customer = d[1]
                  .where((c) => c.id == r.text('customer_id'))
                  .firstOrNull;
              return Card(
                child: ListTile(
                  title: Text(customer?.name ?? 'Customer'),
                  subtitle: Text(
                    '${d[0].where((e) => e.id == r.text('equipment_id')).firstOrNull?.name ?? 'Item'} • ${dateText(r.text('expected_return_date'))}',
                  ),
                  trailing: StatusPill(
                    DateTime.parse(r.text('expected_return_date')).isBefore(now)
                        ? 'Overdue'
                        : 'Due soon',
                  ),
                  onTap: customer == null
                      ? null
                      : () => Navigator.push(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                CustomerDetailScreen(customer: customer),
                          ),
                        ),
                ),
              );
            }),
          ],
        );
      },
    );
    return widget.embedded
        ? body
        : Scaffold(
            appBar: AppBar(title: const Text('Dashboard')),
            body: body,
          );
  }
}

class _DashboardMetricData {
  final String label;
  final String value;
  final IconData icon;
  final bool urgent;
  const _DashboardMetricData(
    this.label,
    this.value,
    this.icon, {
    this.urgent = false,
  });
}

class _DashboardMetric extends StatelessWidget {
  final _DashboardMetricData data;
  const _DashboardMetric(this.data);

  @override
  Widget build(BuildContext context) {
    final color = data.urgent
        ? Theme.of(context).colorScheme.error
        : Theme.of(context).colorScheme.primary;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(data.icon, color: color),
            const Spacer(),
            Text(
              data.value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            Text(
              data.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});
  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

/// Figures come from server-side reports over the whole shop (cash basis from
/// the payment ledger, refunds included), not from capped lists on the phone.
class _ReportsScreenState extends State<ReportsScreen> {
  Future<List<dynamic>>? future;
  Future<Record>? profit;
  Future<Record>? daily;
  String period = 'day';
  late String reportDate = DateTime.now().toIso8601String().substring(0, 10);

  int get tz => DateTime.now().timeZoneOffset.inMinutes;

  DateTime get start {
    final now = DateTime.now();
    return DateTime(now.year, period == 'year' ? 1 : now.month, period == 'day' ? now.day : 1);
  }

  DateTime get end {
    final s = start;
    return period == 'year'
        ? DateTime(s.year + 1)
        : period == 'month'
        ? DateTime(s.year, s.month + 1)
        : DateTime(s.year, s.month, s.day + 1);
  }

  Map<String, dynamic> range(DateTime from, DateTime to) => {
    'start_date': from.toUtc().toIso8601String(),
    'end_date': to.toUtc().toIso8601String(),
    'tz': tz,
  };

  void load() {
    final r = AppScope.of(context).repo;
    final q = range(start, end);
    future = Future.wait<dynamic>([
      r.get('/reports/summary', query: q),
      r.list('/reports/payments', query: q),
      r.get('/equipment/sales/summary', query: {'start_date': q['start_date'], 'end_date': q['end_date']}),
    ]);
    profit = r.get('/reports/net-profit', query: q);
    loadDaily();
  }

  void loadDaily() {
    final day = DateTime.parse(reportDate);
    daily = AppScope.of(context).repo.get('/reports/daily', query: range(day, day.add(const Duration(days: 1))));
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (future == null) load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Reports')),
    body: RefreshIndicator(
      onRefresh: () async {
        setState(load);
        await future;
      },
      child: PageList(
        children: [
          Wrap(
            spacing: 8,
            children: ['day', 'month', 'year']
                .map(
                  (p) => ChoiceChip(
                    label: Text('This $p'),
                    selected: period == p,
                    onSelected: (_) => setState(() {
                      period = p;
                      load();
                    }),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 12),
          DataView<List<dynamic>>(
            future: future!,
            retry: () => setState(load),
            builder: (d) {
              final summary = d[0] as Record;
              final entries = d[1] as List<Record>;
              final sales = d[2] as Record;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Section('Financial overview'),
                  metric('Money received', money(summary.number('money_received'))),
                  metric('Expenses', money(summary.number('expenses'))),
                  metric('Net after expenses', money(summary.number('net_cash'))),
                  metric('Completed rentals (all time)', summary.number('completed_count').toInt()),
                  metric('Cancelled rentals (all time)', summary.number('cancelled_count').toInt()),
                  metric('Collection rate', '${summary.number('collection_rate').toStringAsFixed(0)}%'),
                  const Section('Payment entries'),
                  if (entries.isEmpty) const Text('No payments in this period.'),
                  ...entries.take(20).map(
                    (e) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(e.text('customer_name', 'Customer')),
                      subtitle: Text('${_kindLabel(e.text('kind'))} • ${dateText(e.text('date'))}${e.text('method').isEmpty ? '' : ' • ${e.text('method')}'}'),
                      trailing: Text(money(e.number('amount'))),
                    ),
                  ),
                  const Section('Expense breakdown'),
                  if (summary.records('expense_breakdown').isEmpty) const Text('No expenses in this period.'),
                  ...summary.records('expense_breakdown').map(
                    (e) => ListTile(contentPadding: EdgeInsets.zero, title: Text(e.text('category')), trailing: Text(money(e.number('amount')))),
                  ),
                  const Section('Equipment sales'),
                  metric('Sales revenue', money(sales.number('total_revenue'))),
                  metric('Book value sold', money(sales.number('total_book_value'))),
                  metric('Gain / Loss', money(sales.number('total_gain_loss'))),
                ],
              );
            },
          ),
          const Section('Net profit'),
          DataView<Record>(
            future: profit!,
            builder: (p) => Column(
              children: [
                metric('Rental + sale revenue', money(p.number('revenue'))),
                metric('Operating expenses', money(p.number('operating_expenses'))),
                metric('Depreciation', money(p.number('depreciation_expense'))),
                metric('Net profit', money(p.number('net_profit'))),
              ],
            ),
          ),
          const Section('Daily rental report'),
          DateField(
            label: 'Report date',
            value: reportDate,
            allowPast: true,
            onChanged: (v) => setState(() {
              reportDate = v;
              loadDaily();
            }),
          ),
          DataView<Record>(
            future: daily!,
            builder: (report) {
              final rows = report.records('rentals');
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('${rows.length} rental records • ${money(report.number('money_received'))} received'),
                  ...rows.take(4).map(
                    (r) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(r.child('equipment').text('name', 'Item')),
                      subtitle: Text(r.child('customer').text('name', 'Customer')),
                      trailing: StatusPill(r.text('status')),
                    ),
                  ),
                  ActionButton('Generate / Share PDF', () async {
                    final doc = pw.Document();
                    doc.addPage(
                      pw.MultiPage(
                        build: (_) => [
                          pw.Header(level: 0, child: pw.Text('Daily Rental Report — $reportDate')),
                          pw.TableHelper.fromTextArray(
                            headers: ['Item rented', 'Customer', 'Phone', 'Payment', 'Return'],
                            data: rows
                                .map(
                                  (r) => [
                                    r.child('equipment').text('name', 'Item'),
                                    r.child('customer').text('name', 'Customer'),
                                    r.child('customer').text('phone', '-'),
                                    r.text('status') == 'Active' ? '-' : r.text('payment_status'),
                                    r.text('status') == 'Completed' ? 'Returned' : r.text('status'),
                                  ],
                                )
                                .toList(),
                          ),
                        ],
                      ),
                    );
                    await Printing.sharePdf(bytes: await doc.save(), filename: 'daily-rental-report-$reportDate.pdf');
                  }),
                ],
              );
            },
          ),
        ],
      ),
    ),
  );

  String _kindLabel(String kind) => switch (kind) {
    'advance' => 'Advance received',
    'refund' => 'Refund given',
    'due' => 'Due collected',
    _ => 'Payment received',
  };
}
