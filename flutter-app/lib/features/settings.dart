import '../core/phone_field.dart';
import '../core/validation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../app/controller.dart';
import '../core/api.dart';
import '../core/models.dart';
import '../core/widgets.dart';
import '../core/media.dart';
import 'catalog.dart';
import 'invoices.dart';
import 'reports.dart';
import 'expenses.dart';
import 'team.dart';
import 'pending.dart';

class MoreScreen extends StatefulWidget {
  const MoreScreen({super.key});
  @override
  State<MoreScreen> createState() => _MoreScreenState();
}

class _MoreScreenState extends State<MoreScreen> {
  final cap = TextEditingController();
  bool loaded = false;
  Future<Record>? status;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!loaded) {
      loaded = true;
      final app = AppScope.of(context);
      if (app.isAdmin) {
        app.repo.get('/settings/max_discount_percent').then((v) {
          if (mounted) setState(() => cap.text = v.text('value'));
        }).catchError((_) {});
      }
      status = app.repo.get('/stats');
    }
  }

  @override
  void dispose() {
    cap.dispose();
    super.dispose();
  }

  void open(Widget child) =>
      Navigator.push(context, MaterialPageRoute<void>(builder: (_) => child));
  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    return PageList(
      children: [
        ListTile(leading: const Icon(Icons.sync), title: const Text('Pending changes'), subtitle: Text(app.repo.offline ? 'Offline · showing saved data' : 'Review saved drafts and synchronization errors'), onTap: () => open(const PendingScreen())),
        Panel(
          children: [
            const Section('More'),
            Text('Hello, ${app.username}'),
            const Text('Insights and account settings'),
          ],
        ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            OutlinedButton(
              onPressed: () => open(const DashboardScreen()),
              child: const Text('Dashboard'),
            ),
            if (app.isAdmin)
              OutlinedButton(
                onPressed: () => open(const MasterScreen()),
                child: const Text('Master'),
              ),
            OutlinedButton.icon(
              onPressed: () => open(
                Scaffold(
                  appBar: AppBar(title: const Text('Expenses')),
                  body: const ExpensesScreen(),
                ),
              ),
              icon: const Icon(Icons.payments_outlined),
              label: const Text('Expenses'),
            ),
            OutlinedButton.icon(
              onPressed: () => open(const DamagedScreen()),
              icon: const Icon(Icons.build_outlined),
              label: const Text('Damaged'),
            ),
            if (app.isAdmin && app.hasFeature('analytics'))
              OutlinedButton(
                onPressed: () => open(const ReportsScreen()),
                child: const Text('Reports'),
              ),
            if (app.isAdmin)
              OutlinedButton(
                onPressed: () => open(const AccountScreen()),
                child: const Text('Plan'),
              ),
            if (app.isAdmin)
              OutlinedButton.icon(
                onPressed: () => open(const TeamScreen()),
                icon: const Icon(Icons.group_outlined),
                label: const Text('Team'),
              ),
            OutlinedButton(
              onPressed: () => open(const InvoiceListScreen()),
              child: const Text('Invoices'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Panel(
          children: [
            const Section('Appearance'),
            Wrap(
              spacing: 8,
              children: ThemeMode.values
                  .map(
                    (m) => ChoiceChip(
                      label: Text(
                        m.name[0].toUpperCase() + m.name.substring(1),
                      ),
                      selected: app.themeMode == m,
                      onSelected: (_) => app.setTheme(m),
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
        if (app.isAdmin)
        Panel(
          children: [
            const Section('Rental Rules'),
            const Text(
              'Limit how much discount staff can apply when receiving a return. Leave at 0 for no limit.',
            ),
            const SizedBox(height: 12),
            Field('Max discount (%)', cap, number: true, max: 100),
            ActionButton('Save', () async {
              final problem = numberProblem(cap.text, max: 100);
              if (problem != null) throw InputProblem(problem);
              final value = inputNumber(cap.text);
              // Stored on the server, so it applies to every device and the web app.
              final saved = await app.repo.save('/settings/max_discount_percent', {'value': value > 0 ? decimalText(value) : null}, update: true);
              cap.text = saved.text('value');
              app.changed();
              if (context.mounted) {
                toast(
                  context,
                  value > 0
                      ? 'Return discounts are now capped at ${decimalText(value)}%.'
                      : 'Discount cap removed — any discount amount is allowed.',
                );
              }
            }),
          ],
        ),
        Panel(
          children: [
            const Section('Account'),
            Text('Signed in as ${app.username} (${app.role})'),
            if (app.businessCode.isNotEmpty) SelectableText('Business code: ${app.businessCode}'),
            if (app.shops.length > 1)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue: app.activeShopId,
                  decoration: const InputDecoration(labelText: 'Working in shop'),
                  items: app.shops.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name, overflow: TextOverflow.ellipsis))).toList(),
                  onChanged: (id) {
                    if (id != null) app.selectShop(id);
                  },
                ),
              ),
            TextButton(
              onPressed: () => sheet(context, const ChangePasswordForm()),
              child: const Text('Change my password'),
            ),
            if (app.isAdmin)
              TextButton(
                onPressed: () => open(const CompanyScreen()),
                child: const Text('Company & Invoice Settings'),
              ),
            ActionButton('Logout', () async {
              if (await confirm(
                context,
                'Logout?',
                'Are you sure you want to log out?',
              )) {
                await app.logout();
              }
            }),
          ],
        ),
        Panel(
          children: [
            const Section('Help & Support'),
            FutureBuilder<Record>(
              future: status,
              builder: (c, s) => Text(
                s.data?.text('mode') == 'cloud-connected'
                    ? 'Synced — connected to cloud storage'
                    : 'Offline — changes will sync when reconnected',
              ),
            ),
            if (const String.fromEnvironment('SUPPORT_PHONE') != '')
              TextButton(
                onPressed: () => launchUrl(
                  Uri(
                    scheme: 'tel',
                    path: const String.fromEnvironment('SUPPORT_PHONE'),
                  ),
                ),
                child: const Text('Call support'),
              ),
            if (const String.fromEnvironment('SUPPORT_EMAIL') != '')
              TextButton(
                onPressed: () => launchUrl(
                  Uri(
                    scheme: 'mailto',
                    path: const String.fromEnvironment('SUPPORT_EMAIL'),
                  ),
                ),
                child: const Text('Email support'),
              ),
            const Text('Version 1.0.0'),
          ],
        ),
      ],
    );
  }
}

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  Future<List<Record>>? future;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final r = AppScope.of(context).repo;
    future ??= Future.wait([
      r.get('/account/me'),
      r.get('/account/usage'),
      r.get('/catalog'),
    ]);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Account & Plan')),
    body: FutureBuilder<List<Record>>(
      future: future,
      builder: (c, s) {
        if (s.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (s.hasError) {
          return const Empty(
            'No subscription information is available for this account.',
          );
        }
        final account = s.data![0],
            usage = s.data![1],
            catalog = s.data![2],
            plan = account.child('plan'),
            sub = account.child('subscription');
        return PageList(
          children: [
            Panel(
              children: [
                Section(account.text('company_name')),
                Text(plan.name, style: Theme.of(context).textTheme.titleLarge),
                Text(plan.text('description')),
                Text(
                  '${plan.text('currency')} ${decimalText(plan.number('price'))} / ${plan.text('billing_cycle')}',
                ),
                StatusPill(sub.text('status')),
                Text('Trial ends ${dateText(sub.text('trial_ends_at'))}'),
                Text('Period ends ${dateText(sub.text('current_period_end'))}'),
                Text('${sub.text('remaining_days')} days remaining'),
              ],
            ),
            const Section('Usage & limits'),
            ...usage.json.entries.map((e) {
              final m = Record(Map<String, dynamic>.from(e.value as Map));
              return Panel(
                children: [
                  Text(e.key.replaceAll('_', ' ')),
                  Text(
                    '${m.count('used')} / ${m.json['limit'] == null ? 'Unlimited' : m.count('limit')}',
                  ),
                  LinearProgressIndicator(
                    value: (m.number('percent') / 100).clamp(0, 1),
                  ),
                ],
              );
            }),
            const Section('Features'),
            ...catalog
                .records('features')
                .map(
                  (f) => ListTile(
                    title: Text(f.text('label')),
                    subtitle: Text(f.text('description')),
                    trailing: Icon(
                      AppScope.of(context).hasFeature(f.text('key'))
                          ? Icons.check_circle
                          : Icons.cancel_outlined,
                    ),
                  ),
                ),
          ],
        );
      },
    ),
  );
}

class CompanyScreen extends StatefulWidget {
  const CompanyScreen({super.key});
  @override
  State<CompanyScreen> createState() => _CompanyScreenState();
}

class _CompanyScreenState extends State<CompanyScreen> {
  Future<Record>? future;
  final controls = {
    for (final key in [
      'address',
      'phone',
      'email',
      'tax_id',
      'default_tax_rate_percent',
      'footer_note',
    ])
      key: TextEditingController(),
  };
  String logo = '';
  bool initialized = false;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    future ??= AppScope.of(context).repo.get('/account/company');
  }

  @override
  void dispose() {
    for (final c in controls.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Form(child: Scaffold(
    appBar: AppBar(title: const Text('Company & Invoice Settings')),
    body: FutureBuilder<Record>(
      future: future,
      builder: (c, s) {
        if (s.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (s.hasError) {
          final e = s.error;
          return Empty(
            e is ApiError && e.status == 404
                ? 'Company settings are available for business accounts.'
                : e.toString(),
          );
        }
        final company = s.data!;
        if (!initialized) {
          initialized = true;
          for (final e in controls.entries) {
            e.value.text = company.text(e.key);
          }
          logo = company.text('logo_url');
        }
        return PageList(
          children: [
            Section(company.text('company_name')),
            if (logo.isNotEmpty) Picture(logo, height: 120),
            if (AppScope.of(context).hasFeature('customBranding'))
              ActionButton('Upload logo', () async {
                final url = await uploadImage(AppScope.of(context), kind: UploadKind.logo);
                if (url != null && mounted) setState(() => logo = url);
              }, validateForm: false),
            const SizedBox(height: 16),
            Field('Business address', controls['address']!, multiline: true, maxLength: 500),
            PhoneField(controls['phone']!, preserveLegacy: true),
            Field('Email', controls['email']!, validator: emailProblem, keyboardType: TextInputType.emailAddress),
            Field('Tax ID (GSTIN / VAT / etc.)', controls['tax_id']!, maxLength: 60),
            Field(
              'Default tax rate (%)',
              controls['default_tax_rate_percent']!,
              number: true,
              max: 100,
            ),
            Field(
              'Invoice footer note',
              controls['footer_note']!,
              multiline: true,
              maxLength: 1000,
            ),
            ActionButton('Save changes', () async {
              final app = AppScope.of(context);
              await app.repo.save('/account/company', {
                'logo_url': logo.isEmpty ? null : logo,
                for (final e in controls.entries)
                  if (e.key != 'phone' || e.value.text != company.text('phone')) e.key: e.key == 'default_tax_rate_percent'
                      ? inputNumber(e.value.text)
                      : e.value.text.trim().isEmpty
                      ? null
                      : e.value.text.trim(),
              }, update: true);
              app.changed();
              if (context.mounted) {
                toast(context, 'Company information updated.');
              }
            }),
          ],
        );
      },
    ),
  ));
}
