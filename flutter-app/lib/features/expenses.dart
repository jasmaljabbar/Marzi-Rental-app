import 'package:flutter/material.dart';
import '../app/controller.dart';
import '../core/models.dart';
import '../core/widgets.dart';
import '../core/api.dart';
import '../core/media.dart';

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});
  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  String search = '', category = 'All';
  int revision = -1;
  Future<List<Record>>? future;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final app = AppScope.of(context);
    if (revision != app.revision) {
      revision = app.revision;
      future = app.repo.list('/expenses');
    }
  }

  @override
  Widget build(BuildContext context) => DataView(
    future: future!,
    retry: () => setState(() {
      future = AppScope.of(context).repo.list('/expenses');
    }),
    builder: (items) {
      final now = DateTime.now();
      final current = items.where((i) {
        final d = DateTime.tryParse(i.text('date'))?.toLocal();
        return d?.year == now.year && d?.month == now.month;
      });
      final filtered = items.where(
        (e) =>
            (category == 'All' || e.text('category') == category) &&
            '${e.text('category')} ${e.text('remark')}'.toLowerCase().contains(
              search.toLowerCase(),
            ),
      );
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Section(
            'Expenses',
            trailing: ElevatedButton.icon(
              onPressed: () => sheet(context, const ExpenseForm()),
              icon: const Icon(Icons.add),
              label: const Text('Add Expense'),
            ),
          ),
          metric(
            'Total Expenses',
            money(items.fold<double>(0, (s, i) => s + i.number('amount'))),
          ),
          metric(
            'This month',
            money(current.fold<double>(0, (s, i) => s + i.number('amount'))),
          ),
          TextField(
            decoration: const InputDecoration(
              hintText: 'Search by category or remark',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: (v) => setState(() => search = v),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: {'All', ...items.map((e) => e.text('category'))}
                  .map(
                    (c) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(c),
                        selected: category == c,
                        onSelected: (_) => setState(() => category = c),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 12),
          if (filtered.isEmpty) const Empty('No expenses found'),
          ...filtered.map(
            (e) => Panel(
              children: [
                Section(
                  e.text('category'),
                  trailing: Text(
                    money(e.number('amount')),
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                Text(e.text('remark')),
                Text('${dateText(e.text('date'))} • ${e.text('payment_mode')}'),
                if (e.text('receipt_url').isNotEmpty)
                  Picture(e.text('receipt_url'), height: 130),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => sheet(context, ExpenseForm(initial: e)),
                      child: const Text('Edit'),
                    ),
                    TextButton(
                      onPressed: () async {
                        if (await confirm(
                              context,
                              'Delete expense?',
                              'Delete this expense?',
                            ) &&
                            context.mounted) {
                          try {
                            final app = AppScope.of(context);
                            await app.repo.delete('/expenses/${e.id}');
                            app.changed();
                          } catch (e) {
                            if (context.mounted) toast(context, e);
                          }
                        }
                      },
                      child: const Text('Delete'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      );
    },
  );
}

class ExpenseForm extends StatefulWidget {
  final Record? initial;
  const ExpenseForm({super.key, this.initial});
  @override
  State<ExpenseForm> createState() => _ExpenseFormState();
}

class _ExpenseFormState extends State<ExpenseForm> {
  late final category = TextEditingController(
        text: widget.initial?.text('category'),
      ),
      amount = TextEditingController(text: widget.initial?.text('amount')),
      remark = TextEditingController(text: widget.initial?.text('remark'));
  late String mode = widget.initial?.text('payment_mode', 'Cash') ?? 'Cash',
      receipt = widget.initial?.text('receipt_url') ?? '';
  @override
  void dispose() {
    category.dispose();
    amount.dispose();
    remark.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Section(widget.initial == null ? 'Add Expense' : 'Edit Expense'),
      Field('Expense category', category),
      Wrap(
        spacing: 8,
        children:
            ['Salary', 'Repair', 'Transport', 'Office', 'Maintenance', 'Other']
                .map(
                  (c) => ActionChip(
                    label: Text(c),
                    onPressed: () => setState(() => category.text = c),
                  ),
                )
                .toList(),
      ),
      const SizedBox(height: 16),
      Field('Amount (INR)', amount, number: true),
      Field('Remark', remark, multiline: true),
      DropdownButtonFormField<String>(
        initialValue:
            ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'].contains(mode)
            ? mode
            : 'Other',
        decoration: const InputDecoration(labelText: 'Payment mode'),
        items: [
          'Cash',
          'UPI',
          'Card',
          'Bank Transfer',
          'Other',
        ].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
        onChanged: (v) => mode = v ?? 'Cash',
      ),
      const SizedBox(height: 16),
      if (receipt.isNotEmpty) Picture(receipt),
      ActionButton('Attach receipt', () async {
        final result = await uploadImage(AppScope.of(context), kind: UploadKind.receipt);
        if (result != null && mounted) setState(() => receipt = result);
      }),
      if (receipt.isNotEmpty)
        TextButton(
          onPressed: () => setState(() => receipt = ''),
          child: const Text('Remove receipt'),
        ),
      const SizedBox(height: 16),
      ActionButton('Save', () async {
        if (category.text.trim().isEmpty) {
          throw Exception('Please enter an expense category.');
        }
        if (numValue(amount.text) <= 0) {
          throw Exception('Please enter an amount greater than zero.');
        }
        final app = AppScope.of(context);
        await app.repo.save(
          widget.initial == null
              ? '/expenses'
              : '/expenses/${widget.initial!.id}',
          {
            'category': category.text.trim(),
            'amount': numValue(amount.text),
            'remark': remark.text,
            'payment_mode': mode,
            'receipt_url': receipt,
          },
          update: widget.initial != null,
        );
        app.changed();
        if (context.mounted) Navigator.pop(context);
      }),
    ],
  );
}
