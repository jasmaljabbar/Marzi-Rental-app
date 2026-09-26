import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import '../app/controller.dart';
import 'api.dart';
import 'media.dart';
import 'widgets.dart';

typedef PickImagesFn = Future<List<XFile>> Function({required bool camera, required int limit});
typedef UploadBytesFn = Future<String> Function(Uint8List bytes, String name);

class _Pending {
  final int id;
  final String name;
  final Uint8List bytes;
  String? error;
  _Pending(this.id, this.name, this.bytes);
}

/// Photo picker for records with several photos (equipment). Up to [max]
/// photos can be picked from the gallery in one go, or taken one at a time
/// with the camera. Each shows straight away with a spinner, uploads in
/// parallel, and is added in the order picked. A photo that fails stays on
/// screen with Retry and Remove, and [onBusyChanged] tells the form to hold
/// off saving until every photo is uploaded or removed.
class MultiImageField extends StatefulWidget {
  final String label;
  final List<String> urls;
  final ValueChanged<List<String>> onChanged;
  final int max;
  final UploadKind kind;
  final ValueChanged<bool>? onBusyChanged;
  // Replaceable in tests; default to the device picker and POST /upload.
  final PickImagesFn? pick;
  final UploadBytesFn? upload;
  const MultiImageField({
    super.key,
    this.label = 'Images',
    required this.urls,
    required this.onChanged,
    this.max = maxEquipmentImages,
    this.kind = UploadKind.equipment,
    this.onBusyChanged,
    this.pick,
    this.upload,
  });
  @override
  State<MultiImageField> createState() => _MultiImageFieldState();
}

class _MultiImageFieldState extends State<MultiImageField> {
  final pending = <_Pending>[];
  String? problem;
  int nextId = 0;
  final uploadedBytes = <String, Uint8List>{};
  // Latest list, so uploads that finish together don't overwrite each other.
  late List<String> latest = List.of(widget.urls);

  @override
  void didUpdateWidget(MultiImageField old) {
    super.didUpdateWidget(old);
    latest = List.of(widget.urls);
  }

  int get room => widget.max - widget.urls.length - pending.length;

  void updatePending(VoidCallback change) {
    final wasBusy = pending.isNotEmpty;
    setState(change);
    if (wasBusy != pending.isNotEmpty) widget.onBusyChanged?.call(pending.isNotEmpty);
  }

  void commit(List<String> next) {
    latest = next;
    widget.onChanged(next);
  }

  Future<void> add({bool camera = false}) async {
    final space = room;
    if (space <= 0) {
      setState(() => problem = selectionProblem(1, 0, widget.max));
      return;
    }
    final List<XFile> picked;
    try {
      picked = await (widget.pick ?? ({required bool camera, required int limit}) => pickImages(camera: camera, limit: limit))(
        camera: camera,
        limit: space,
      );
    } catch (e) {
      if (mounted) toast(context, e);
      return;
    }
    if (picked.isEmpty || !mounted) return;
    final countProblem = selectionProblem(picked.length, room, widget.max);
    if (countProblem != null) {
      setState(() => problem = countProblem);
      return;
    }
    final items = <_Pending>[];
    final problems = <String>[];
    for (final file in picked) {
      final bytes = await file.readAsBytes();
      final issue = imageFileProblem(file.name, bytes.length);
      if (issue != null) {
        problems.add(issue);
      } else if ([...items.map((i) => i.bytes), ...pending.map((i) => i.bytes), ...uploadedBytes.values].any((b) => listEquals(b, bytes))) {
        problems.add('"${file.name}" is already selected.');
      } else {
        items.add(_Pending(nextId++, file.name, bytes));
      }
    }
    if (!mounted) return;
    setState(() => problem = problems.isEmpty ? null : problems.join('\n'));
    if (items.isEmpty) return;
    updatePending(() => pending.addAll(items));
    await uploadAll(items);
  }

  Future<String?> uploadOne(_Pending item) async {
    final send = widget.upload ?? (bytes, name) => AppScope.of(context).repo.api.upload(bytes, name, kind: widget.kind);
    try {
      return await send(item.bytes, uploadName(item.name));
    } catch (e) {
      if (mounted) setState(() => item.error = e.toString());
      return null;
    }
  }

  Future<void> uploadAll(List<_Pending> items) async {
    if (mounted) {
      setState(() {
        for (final item in items) {
          item.error = null;
        }
      });
    }
    final results = await Future.wait(items.map(uploadOne));
    if (!mounted) return;
    final done = <_Pending>[];
    for (var i = 0; i < items.length; i++) {
      if (results[i] != null && pending.contains(items[i])) { done.add(items[i]); uploadedBytes[results[i]!] = items[i].bytes; }
    }
    if (done.isEmpty) return;
    commit([...latest, for (var i = 0; i < items.length; i++) if (done.contains(items[i])) results[i]!]);
    updatePending(() => pending.removeWhere(done.contains));
  }

  void removePending(_Pending item) => updatePending(() => pending.remove(item));

  void removeUrl(int index) {
    setState(() => problem = null);
    uploadedBytes.remove(latest[index]);
    commit([...latest]..removeAt(index));
  }

  Widget tile({required Widget child, required String removeLabel, required VoidCallback onRemove, Key? key}) => SizedBox(
    key: key,
    width: 96,
    height: 96,
    child: Stack(
      fit: StackFit.expand,
      children: [
        ClipRRect(borderRadius: BorderRadius.circular(12), child: child),
        Positioned(
          top: 2,
          right: 2,
          child: IconButton.filledTonal(
            visualDensity: VisualDensity.compact,
            iconSize: 16,
            tooltip: removeLabel,
            onPressed: onRemove,
            icon: const Icon(Icons.close),
          ),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final uploading = pending.where((p) => p.error == null).length;
    final failed = pending.where((p) => p.error != null).toList();
    final total = widget.urls.length + pending.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Section('${widget.label} ($total/${widget.max})'),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (var i = 0; i < widget.urls.length; i++)
              tile(
                key: ValueKey('image-$i-${widget.urls[i]}'),
                removeLabel: 'Remove image ${i + 1}',
                onRemove: () => removeUrl(i),
                child: Picture(widget.urls[i], height: 96),
              ),
            for (final p in pending)
              tile(
                key: ValueKey('pending-${p.id}'),
                removeLabel: p.error == null ? 'Cancel ${p.name}' : 'Remove ${p.name}',
                onRemove: () => removePending(p),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.memory(
                      p.bytes,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => ColoredBox(color: scheme.surfaceContainerHighest),
                    ),
                    ColoredBox(
                      color: Colors.black45,
                      child: Center(
                        child: p.error == null
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5))
                            : TextButton.icon(
                                style: TextButton.styleFrom(foregroundColor: Colors.white),
                                onPressed: () => uploadAll([p]),
                                icon: const Icon(Icons.refresh, size: 18),
                                label: const Text('Retry'),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        if (room > 0)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: () => add(),
                icon: const Icon(Icons.photo_library_outlined),
                label: Text(room > 1 ? 'Add images (up to $room)' : 'Add image'),
              ),
              OutlinedButton.icon(
                onPressed: () => add(camera: true),
                icon: const Icon(Icons.photo_camera_outlined),
                label: const Text('Take photo'),
              ),
            ],
          ),
        if (uploading > 0)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text('Uploading $uploading photo${uploading == 1 ? '' : 's'}…'),
          ),
        if (failed.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              [...failed.map((p) => '${p.name}: ${p.error}'), 'Retry or remove ${failed.length == 1 ? 'it' : 'them'} before saving.'].join('\n'),
              style: TextStyle(color: scheme.error),
            ),
          ),
        if (problem != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(problem!, style: TextStyle(color: scheme.error)),
          ),
      ],
    );
  }
}
