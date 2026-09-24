import 'package:flutter/material.dart';
import 'app/controller.dart';
import 'app/shell.dart';
import 'core/theme.dart';
import 'features/auth.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(RentalApp(controller: AppController()));
}

class RentalApp extends StatefulWidget {
  final AppController controller;
  final bool autoStart;
  const RentalApp({super.key, required this.controller, this.autoStart = true});
  @override
  State<RentalApp> createState() => _RentalAppState();
}

class _RentalAppState extends State<RentalApp> {
  @override
  void initState() {
    super.initState();
    if (widget.autoStart) widget.controller.start();
  }

  @override
  Widget build(BuildContext context) => AppScope(
    controller: widget.controller,
    child: ListenableBuilder(
      listenable: widget.controller,
      builder: (context, _) {
        final app = widget.controller;
        return MaterialApp(
          title: 'RentalManager',
          debugShowCheckedModeBanner: false,
          theme: rentalTheme(Brightness.light),
          darkTheme: rentalTheme(Brightness.dark),
          themeMode: app.themeMode,
          home: app.startupError.isNotEmpty
              ? Scaffold(
                  body: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Startup failed',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: Theme.of(context).colorScheme.error,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(app.startupError, textAlign: TextAlign.center),
                          const SizedBox(height: 16),
                          FilledButton.icon(
                            onPressed: app.start,
                            icon: const Icon(Icons.refresh),
                            label: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              : !app.ready
              ? Scaffold(
                  backgroundColor: Colors.white,
                  body: Center(
                    child: Image.asset(
                      'assets/NBlogo.png',
                      width: 240,
                      height: 240,
                    ),
                  ),
                )
              : app.token.isEmpty
              ? const AuthScreen()
              : Shell(key: ValueKey(app.username)),
        );
      },
    ),
  );
}
