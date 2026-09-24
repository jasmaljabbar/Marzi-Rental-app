import 'package:flutter/material.dart';
import 'api.dart';
import 'models.dart';
import 'theme.dart';

void toast(BuildContext context, Object message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message.toString()),
      behavior: SnackBarBehavior.floating,
    ),
  );
}

Future<bool> confirm(
  BuildContext context,
  String title,
  String message,
) async =>
    await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    ) ??
    false;
Future<T?> sheet<T>(BuildContext context, Widget child) =>
    showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (c) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(c).bottom),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(c).height * .9,
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: child,
          ),
        ),
      ),
    );

class Section extends StatelessWidget {
  final String title;
  final Widget? trailing;
  const Section(this.title, {super.key, this.trailing});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8, bottom: 12),
    child: Row(
      children: [
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleMedium),
        ),
        ?trailing,
      ],
    ),
  );
}

class Panel extends StatelessWidget {
  final List<Widget> children;
  const Panel({super.key, required this.children});
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    ),
  );
}

class Field extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final bool number, multiline, obscure, required;
  final ValueChanged<String>? onChanged;
  final String? helperText;
  final TextInputType? keyboardType;
  const Field(
    this.label,
    this.controller, {
    super.key,
    this.number = false,
    this.multiline = false,
    this.obscure = false,
    this.required = false,
    this.onChanged,
    this.helperText,
    this.keyboardType,
  });
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: TextFormField(
      controller: controller,
      onChanged: onChanged,
      obscureText: obscure,
      keyboardType:
          keyboardType ??
          (number
              ? const TextInputType.numberWithOptions(decimal: true)
              : multiline
              ? TextInputType.multiline
              : TextInputType.text),
      maxLines: multiline ? 3 : 1,
      textInputAction: multiline
          ? TextInputAction.newline
          : TextInputAction.next,
      validator: required
          ? (value) => value == null || value.trim().isEmpty
                ? '$label is required'
                : null
          : null,
      decoration: InputDecoration(
        labelText: required ? '$label *' : label,
        helperText: helperText,
      ),
    ),
  );
}

class ActionButton extends StatefulWidget {
  final String label;
  final Future<void> Function()? action;
  const ActionButton(this.label, this.action, {super.key});
  @override
  State<ActionButton> createState() => _ActionButtonState();
}

class _ActionButtonState extends State<ActionButton> {
  bool busy = false;
  @override
  Widget build(BuildContext context) => ElevatedButton(
    onPressed: busy || widget.action == null
        ? null
        : () async {
            setState(() => busy = true);
            try {
              await widget.action!();
            } catch (e) {
              if (context.mounted) toast(context, e);
            } finally {
              if (mounted) setState(() => busy = false);
            }
          },
    child: busy
        ? const SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Colors.white,
            ),
          )
        : Text(widget.label),
  );
}

class DataView<T> extends StatelessWidget {
  final Future<T> future;
  final Widget Function(T) builder;
  final VoidCallback? retry;
  const DataView({
    super.key,
    required this.future,
    required this.builder,
    this.retry,
  });
  @override
  Widget build(BuildContext context) => FutureBuilder<T>(
    future: future,
    builder: (c, s) {
      if (s.connectionState != ConnectionState.done) {
        return const LoadingSkeleton();
      }
      if (s.hasError) {
        return ErrorState(error: s.error, retry: retry);
      }
      return builder(s.data as T);
    },
  );
}

class Empty extends StatelessWidget {
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;
  const Empty(this.message, {super.key, this.actionLabel, this.onAction});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(32),
    child: Column(
      children: [
        Icon(
          Icons.inbox_outlined,
          size: 40,
          color: Theme.of(context).hintColor,
        ),
        const SizedBox(height: 12),
        Text(message, textAlign: TextAlign.center),
        if (actionLabel != null && onAction != null) ...[
          const SizedBox(height: 12),
          FilledButton(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ],
    ),
  );
}

class StatusPill extends StatelessWidget {
  final String text;
  const StatusPill(this.text, {super.key});
  @override
  Widget build(BuildContext context) {
    final normalized = text.toLowerCase();
    final tokens = Theme.of(context).extension<AppTokens>()!;
    final (color, icon) = switch (normalized) {
      'paid' ||
      'completed' ||
      'returned' => (tokens.success, Icons.check_circle_outline),
      'active' => (tokens.info, Icons.play_circle_outline),
      'cancelled' => (
        Theme.of(context).colorScheme.error,
        Icons.cancel_outlined,
      ),
      'overdue' ||
      'unpaid' => (Theme.of(context).colorScheme.error, Icons.error_outline),
      'due soon' ||
      'partially paid' ||
      'pending' => (tokens.warning, Icons.schedule),
      _ => (Theme.of(context).colorScheme.onSurfaceVariant, Icons.info_outline),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              text,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ErrorState extends StatelessWidget {
  final Object? error;
  final VoidCallback? retry;
  const ErrorState({super.key, this.error, this.retry});

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.cloud_off_outlined,
            size: 44,
            color: Theme.of(context).colorScheme.error,
          ),
          const SizedBox(height: 12),
          Text(
            'Could not load data',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 6),
          Text(
            'Check your connection and try again.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (retry != null) ...[
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: retry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ],
      ),
    ),
  );
}

class LoadingSkeleton extends StatelessWidget {
  final int rows;
  const LoadingSkeleton({super.key, this.rows = 4});

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Loading',
    child: ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: rows,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, index) => Container(
        height: index == 0 ? 72 : 96,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    ),
  );
}

Widget metric(String label, Object value) => Panel(
  children: [
    Text(label),
    const SizedBox(height: 6),
    Text(
      '$value',
      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
    ),
  ],
);

class Picture extends StatelessWidget {
  final String url;
  final double height;
  const Picture(this.url, {super.key, this.height = 130});
  @override
  Widget build(BuildContext context) {
    final uri = resolveMediaUrl(url);
    return GestureDetector(
      onTap: url.isEmpty
          ? null
          : () => showDialog<void>(
              context: context,
              builder: (c) => Dialog(
                child: Stack(
                  children: [
                    InteractiveViewer(
                      minScale: .5,
                      maxScale: 5,
                      child: Image.network(uri),
                    ),
                    Positioned(
                      right: 0,
                      child: IconButton(
                        onPressed: () => Navigator.pop(c),
                        icon: const Icon(Icons.close),
                      ),
                    ),
                  ],
                ),
              ),
            ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: uri.isEmpty
            ? Container(
                height: height,
                color: Theme.of(
                  context,
                ).colorScheme.primary.withValues(alpha: .06),
                child: const Center(
                  child: Icon(Icons.image_outlined, size: 32),
                ),
              )
            : Image.network(
                uri,
                height: height,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, error, stack) => SizedBox(
                  height: height,
                  child: const Icon(Icons.broken_image_outlined),
                ),
              ),
      ),
    );
  }
}

/// Profile picture for a customer or user, used by every list and header. It
/// shows the photo when there is one ([url], usually the thumbnail, then
/// [fallbackUrl]); the first letter of the name shows while it loads and
/// whenever there is no photo or it fails to load.
class PersonAvatar extends StatelessWidget {
  final String name;
  final String url;
  final String fallbackUrl;
  final double size;
  const PersonAvatar({super.key, required this.name, this.url = '', this.fallbackUrl = '', this.size = 40});

  static String initialOf(String name) {
    final trimmed = name.trim();
    return trimmed.isEmpty ? '?' : trimmed.characters.first.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    final placeholder = Container(
      key: const ValueKey('avatar-initial'),
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(shape: BoxShape.circle, color: color.withValues(alpha: .1)),
      child: Text(
        initialOf(name),
        style: TextStyle(color: color, fontSize: size * .36, fontWeight: FontWeight.w800),
      ),
    );
    final sources = [url, fallbackUrl].map(resolveMediaUrl).where((u) => u.isNotEmpty).toSet().toList();
    if (sources.isEmpty) return placeholder;
    return ClipOval(child: _photo(sources, 0, placeholder));
  }

  Widget _photo(List<String> sources, int index, Widget placeholder) => Image.network(
    sources[index],
    width: size,
    height: size,
    fit: BoxFit.cover,
    frameBuilder: (_, child, frame, loadedSynchronously) => frame == null && !loadedSynchronously ? placeholder : child,
    errorBuilder: (_, _, _) => index + 1 < sources.length ? _photo(sources, index + 1, placeholder) : placeholder,
  );
}

class DateField extends StatelessWidget {
  final String label, value;
  final ValueChanged<String> onChanged;
  final bool allowPast;
  const DateField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.allowPast = false,
  });
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: ListTile(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: const BorderSide(color: Colors.blueGrey),
      ),
      title: Text(label),
      subtitle: Text(value.isEmpty ? 'Not set' : dateText(value)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (value.isNotEmpty)
            IconButton(
              onPressed: () => onChanged(''),
              icon: const Icon(Icons.close),
            ),
          const Icon(Icons.calendar_today_outlined),
        ],
      ),
      onTap: () async {
        final now = DateTime.now();
        final first = allowPast
            ? DateTime(2000)
            : DateTime(now.year, now.month, now.day);
        final parsed = DateTime.tryParse(value) ?? now;
        final d = await showDatePicker(
          context: context,
          initialDate: parsed.isBefore(first) ? first : parsed,
          firstDate: first,
          lastDate: DateTime(2100),
        );
        if (d != null) {
          onChanged(
            '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}',
          );
        }
      },
    ),
  );
}
