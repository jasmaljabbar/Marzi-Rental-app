import '../core/validation.dart';
import 'package:flutter/material.dart';
import '../app/controller.dart';
import '../core/api.dart';
import '../core/models.dart';
import '../core/widgets.dart';

/// Mirrors the API password policy so problems show before submitting.
String? passwordProblem(String password, [String username = '']) {
  const common = {'password', 'password1', 'password123', '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop', '11111111', 'iloveyou', 'admin123', 'letmein1', 'welcome1'};
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password must be at most 128 characters.';
  if (common.contains(password.toLowerCase()) || RegExp(r'^(.)\1+$').hasMatch(password)) {
    return 'That password is too easy to guess. Choose a less common one.';
  }
  if (username.isNotEmpty && password.toLowerCase() == username.toLowerCase()) {
    return 'Password must not be the same as the username.';
  }
  return null;
}

class ChangePasswordForm extends StatefulWidget {
  const ChangePasswordForm({super.key});
  @override
  State<ChangePasswordForm> createState() => _ChangePasswordFormState();
}

class _ChangePasswordFormState extends State<ChangePasswordForm> {
  final current = TextEditingController(), next = TextEditingController(), confirm = TextEditingController();
  String error = '';
  @override
  void dispose() {
    current.dispose();
    next.dispose();
    confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Section('Change my password'),
      Field('Current password', current, obscure: true, required: true, maxLength: 128),
      Field('New password (min. 8 characters)', next, obscure: true),
      Field('Confirm new password', confirm, obscure: true),
      if (error.isNotEmpty) Text(error, style: TextStyle(color: Theme.of(context).colorScheme.error)),
      ActionButton('Update password', () async {
        final app = AppScope.of(context);
        final problem = passwordProblem(next.text, app.username) ?? (next.text != confirm.text ? "New passwords don't match." : null);
        if (problem != null) return setState(() => error = problem);
        try {
          await app.changePassword(current.text, next.text);
          if (context.mounted) {
            Navigator.pop(context);
            toast(context, 'Password changed. Other devices have been signed out.');
          }
        } on ApiError catch (e) {
          setState(() => error = e.message);
        }
      }),
    ],
  );
}

/// Owners and admins manage their team: add staff, reset a forgotten
/// password, change role, remove. Usernames only need to be unique inside
/// this business.
class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});
  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  Future<List<Record>>? future;
  void reload() => setState(() => future = AppScope.of(context).repo.list('/auth/users'));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    future ??= AppScope.of(context).repo.list('/auth/users');
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Team')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await sheet(context, const AddTeamMemberForm());
          if (mounted) reload();
        },
        icon: const Icon(Icons.person_add_alt),
        label: const Text('Add member'),
      ),
      body: DataView<List<Record>>(
        future: future!,
        retry: reload,
        builder: (members) => PageList(
          children: [
            if (app.businessCode.isNotEmpty)
              Panel(children: [const Section('Business code'), SelectableText(app.businessCode), const Text('Staff may need this code to sign in.')]),
            ...members.map((m) {
              final editable = m.text('role') != 'owner' && m.text('username') != app.username;
              return Card(
                child: ListTile(
                  title: Text(m.text('username')),
                  subtitle: Text('${m.text('role')} • ${m.text('email', 'no email')}'),
                  trailing: editable
                      ? PopupMenuButton<String>(
                          tooltip: 'Actions for ${m.text('username')}',
                          onSelected: (action) async {
                            try {
                              if (action == 'password') {
                                await sheet(context, SetPasswordForm(member: m));
                              } else if (action == 'role') {
                                await app.repo.save('/auth/users/${m.id}/role', {'role': m.text('role') == 'admin' ? 'staff' : 'admin'}, update: true);
                              } else if (action == 'remove' && await confirm(context, 'Remove ${m.text('username')}?', 'They will lose access immediately.')) {
                                await app.repo.delete('/auth/users/${m.id}');
                              }
                              reload();
                            } catch (e) {
                              if (context.mounted) toast(context, e);
                            }
                          },
                          itemBuilder: (_) => [
                            const PopupMenuItem(value: 'password', child: Text('Reset password')),
                            PopupMenuItem(value: 'role', child: Text(m.text('role') == 'admin' ? 'Make staff' : 'Make admin')),
                            const PopupMenuItem(value: 'remove', child: Text('Remove')),
                          ],
                        )
                      : null,
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class AddTeamMemberForm extends StatefulWidget {
  const AddTeamMemberForm({super.key});
  @override
  State<AddTeamMemberForm> createState() => _AddTeamMemberFormState();
}

class _AddTeamMemberFormState extends State<AddTeamMemberForm> {
  final username = TextEditingController(), password = TextEditingController(), email = TextEditingController();
  String role = 'staff', error = '';
  @override
  void dispose() {
    username.dispose();
    password.dispose();
    email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Section('Add team member'),
      Field('Username', username, required: true, validator: usernameProblem),
      Field('Temporary password (min. 8 characters)', password, obscure: true),
      Field('Email (optional, for password resets)', email, validator: emailProblem, keyboardType: TextInputType.emailAddress),
      DropdownButtonFormField<String>(
        isExpanded: true,
        initialValue: role,
        decoration: const InputDecoration(labelText: 'Role'),
        items: const [
          DropdownMenuItem(value: 'staff', child: Text('Staff — rentals, returns, customers', overflow: TextOverflow.ellipsis)),
          DropdownMenuItem(value: 'admin', child: Text('Admin — everything except billing ownership', overflow: TextOverflow.ellipsis)),
        ],
        onChanged: (v) => setState(() => role = v ?? 'staff'),
      ),
      if (error.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text(error, style: TextStyle(color: Theme.of(context).colorScheme.error))),
      const SizedBox(height: 12),
      ActionButton('Add', () async {
        final problem = username.text.trim().isEmpty ? 'Enter a username.' : passwordProblem(password.text, username.text.trim());
        if (problem != null) return setState(() => error = problem);
        try {
          await AppScope.of(context).repo.save('/auth/users', {
            'username': username.text.trim(),
            'password': password.text,
            'role': role,
            if (email.text.trim().isNotEmpty) 'email': email.text.trim(),
          });
          if (context.mounted) {
            Navigator.pop(context);
            toast(context, '${username.text.trim()} added. Share the username and password with them.');
          }
        } on ApiError catch (e) {
          setState(() => error = e.message);
        }
      }),
    ],
  );
}

class SetPasswordForm extends StatefulWidget {
  final Record member;
  const SetPasswordForm({super.key, required this.member});
  @override
  State<SetPasswordForm> createState() => _SetPasswordFormState();
}

class _SetPasswordFormState extends State<SetPasswordForm> {
  final password = TextEditingController();
  String error = '';
  @override
  void dispose() {
    password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Section('New password for ${widget.member.text('username')}'),
      Field('New password (min. 8 characters)', password, obscure: true),
      if (error.isNotEmpty) Text(error, style: TextStyle(color: Theme.of(context).colorScheme.error)),
      ActionButton('Reset password', () async {
        final problem = passwordProblem(password.text, widget.member.text('username'));
        if (problem != null) return setState(() => error = problem);
        try {
          await AppScope.of(context).repo.save('/auth/users/${widget.member.id}/password', {'new_password': password.text}, update: true);
          if (context.mounted) {
            Navigator.pop(context);
            toast(context, 'Password reset. They have been signed out everywhere.');
          }
        } on ApiError catch (e) {
          setState(() => error = e.message);
        }
      }),
    ],
  );
}
