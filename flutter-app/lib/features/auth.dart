import '../core/validation.dart';
import 'package:flutter/material.dart';
import '../app/controller.dart';
import '../core/widgets.dart';
import '../core/theme.dart';
import '../core/api.dart';
import 'team.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final username = TextEditingController(),
      password = TextEditingController(),
      company = TextEditingController(),
      email = TextEditingController(),
      businessCode = TextEditingController();
  bool signup = false, visible = false, needsBusinessCode = false;
  String error = '';
  @override
  void dispose() {
    for (final c in [username, password, company, email, businessCode]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Theme(
    data: rentalTheme(Brightness.light),
    child: Form(child: Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.warehouse_outlined, size: 56, color: navy),
                  const SizedBox(height: 12),
                  const Text(
                    'RentalManager',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      color: navy,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    signup
                        ? 'Start your free trial'
                        : 'Equipment Rental & Inventory Management',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 36),
                  Panel(
                    children: [
                      Section(
                        signup
                            ? 'Create your business account'
                            : 'Welcome back',
                      ),
                      Text(
                        signup
                            ? '14 days free, full access, no card required.'
                            : 'Sign in to your account',
                      ),
                      const SizedBox(height: 24),
                      if (signup) Field('Business name', company, required: true, maxLength: 120),
                      Field('Username', username, required: true, maxLength: signup ? 64 : 200, validator: signup ? usernameProblem : null),
                      if (signup) Field('Email (recommended, for password resets)', email, validator: emailProblem, keyboardType: TextInputType.emailAddress),
                      if (!signup && needsBusinessCode)
                        Field('Business code', businessCode, helperText: 'Ask your business owner, or see More > Account.'),
                      TextFormField(
                        validator: (v) => v == null || v.isEmpty ? 'Enter your password.' : null,
                        controller: password,
                        obscureText: !visible,
                        decoration: InputDecoration(
                          labelText: signup
                              ? 'Password (min. 8 characters)'
                              : 'Password',
                          suffixIcon: IconButton(
                            icon: Icon(
                              visible ? Icons.visibility_off : Icons.visibility,
                            ),
                            onPressed: () => setState(() => visible = !visible),
                          ),
                        ),
                      ),
                      if (error.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Text(
                            error,
                            style: const TextStyle(color: Colors.red),
                          ),
                        ),
                      const SizedBox(height: 20),
                      ActionButton(
                        signup ? 'Start free trial' : 'Sign in',
                        () async {
                          setState(() => error = '');
                          if (signup) {
                            final problem = company.text.trim().isEmpty || username.text.trim().isEmpty
                                ? 'Enter your business name and a username.'
                                : passwordProblem(password.text, username.text.trim());
                            if (problem != null) {
                              setState(() => error = problem);
                              return;
                            }
                          }
                          try {
                            await AppScope.of(context).authenticate(
                              username.text,
                              password.text,
                              company: signup ? company.text : null,
                              email: signup ? email.text : null,
                              businessCode: needsBusinessCode ? businessCode.text : null,
                            );
                          } on ApiError catch (e) {
                            setState(() {
                              if (e.code == 'BUSINESS_CODE_REQUIRED') {
                                needsBusinessCode = true;
                                error = 'This username is used by more than one business. Enter your business code.';
                              } else {
                                error = e.message;
                              }
                            });
                          } catch (e) {
                            setState(() => error = '$e');
                          }
                        },
                      ),
                      if (!signup)
                        TextButton(
                          onPressed: () => sheet(
                            context,
                            ResetPassword(
                              username: username.text,
                              onDone: (v) => username.text = v,
                            ),
                          ),
                          child: const Text('Forgot password?'),
                        ),
                      TextButton(
                        onPressed: () => setState(() {
                          signup = !signup;
                          error = '';
                        }),
                        child: Text(
                          signup
                              ? 'Already have an account? Log in'
                              : 'Create a business account',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  ));
}

/// Requests a password reset link by email. The API never reveals whether
/// the account exists and never returns a code; staff without an email ask
/// their owner or admin (More > Team) to set a new password.
class ResetPassword extends StatefulWidget {
  final String username;
  final ValueChanged<String> onDone;
  const ResetPassword({super.key, required this.username, required this.onDone});
  @override
  State<ResetPassword> createState() => _ResetPasswordState();
}

class _ResetPasswordState extends State<ResetPassword> {
  late final user = TextEditingController(text: widget.username);
  final businessCode = TextEditingController();
  String message = '';
  @override
  void dispose() {
    user.dispose();
    businessCode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Section('Forgot password'),
      if (message.isEmpty) ...[
        const Text('We will email a reset link if your account has an email address.'),
        const SizedBox(height: 12),
        Field('Username', user, required: true, maxLength: 200),
        Field('Business code (optional)', businessCode, maxLength: 40),
        ActionButton('Send reset link', () async {
          if (user.text.trim().isEmpty) throw Exception('Enter your username first.');
          final r = await AppScope.of(context).repo.save('/auth/forgot-password', {
            'username': user.text.trim(),
            if (businessCode.text.trim().isNotEmpty) 'business_code': businessCode.text.trim(),
          });
          setState(() => message = r.text('message'));
          widget.onDone(user.text.trim());
        }),
      ] else ...[
        Text(message),
        const SizedBox(height: 8),
        const Text('Open the link on this phone or a computer to choose a new password. It expires in 15 minutes.'),
      ],
      TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
    ],
  );
}
