import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:image_picker/image_picker.dart';
import 'package:rental_manager/app/controller.dart';
import 'package:rental_manager/core/api.dart';
import 'package:rental_manager/core/image_field.dart';
import 'package:rental_manager/core/media.dart';
import 'package:rental_manager/core/theme.dart';
import 'package:rental_manager/core/models.dart';
import 'package:rental_manager/core/widgets.dart';
import 'package:rental_manager/features/catalog.dart';
import 'package:rental_manager/features/forms.dart';
import 'widget_test.dart' show MemoryStore;

const thumb = 'https://api.example.com/files/t/a/customer_photo/p1.thumb.webp?exp=1&sig=s';
const full = 'https://api.example.com/files/t/a/customer_photo/p1.webp?exp=1&sig=s';

Widget host(Widget child) => MaterialApp(
  theme: rentalTheme(Brightness.light),
  home: Scaffold(body: SingleChildScrollView(child: child)),
);

List<String> networkUrls(WidgetTester tester) => tester
    .widgetList<Image>(find.byType(Image))
    .map((i) => i.image)
    .whereType<NetworkImage>()
    .map((i) => i.url)
    .toList();

XFile picked(String name, [int size = 16]) => XFile.fromData(Uint8List.fromList(List.generate(size, (i) => name.codeUnitAt(i % name.length))), name: name, path: name);

/// Hosts a MultiImageField with a fake picker and uploader.
class Harness extends StatefulWidget {
  final List<String> initial;
  final List<XFile> Function() pick;
  final Future<String> Function(String name) upload;
  final List<bool> busy;
  const Harness({super.key, this.initial = const [], required this.pick, required this.upload, required this.busy});
  @override
  State<Harness> createState() => HarnessState();
}

class HarnessState extends State<Harness> {
  late List<String> urls = List.of(widget.initial);
  @override
  Widget build(BuildContext context) => MultiImageField(
    urls: urls,
    onChanged: (next) => setState(() => urls = next),
    onBusyChanged: widget.busy.add,
    pick: ({required bool camera, required int limit}) async => widget.pick(),
    upload: (bytes, name) => widget.upload(name),
  );
}

String uploadedUrl(String name) => 'https://api.example.com/files/t/a/equipment/${name.split('.').first}.webp';
const existing = ['https://api.example.com/files/t/a/equipment/old1.webp', 'https://api.example.com/files/t/a/equipment/old2.webp'];

void main() {
  group('PersonAvatar', () {
    testWidgets('shows the customer photo when there is one', (tester) async {
      await tester.pumpWidget(host(const PersonAvatar(name: 'Jasmal', url: thumb, fallbackUrl: full)));
      expect(networkUrls(tester), [thumb]);
    });

    testWidgets('shows the first letter when there is no photo', (tester) async {
      await tester.pumpWidget(host(const PersonAvatar(name: 'jasmal')));
      expect(find.text('J'), findsOneWidget);
      expect(find.byType(Image), findsNothing);
      await tester.pumpWidget(host(const PersonAvatar(name: '  ')));
      expect(find.text('?'), findsOneWidget);
    });

    testWidgets('falls back to the full photo, then to the first letter, when images fail', (tester) async {
      // Every HTTP request in widget tests answers 400, like a missing file.
      await tester.pumpWidget(host(const PersonAvatar(name: 'Jasmal', url: thumb, fallbackUrl: full)));
      for (var i = 0; i < 5 && find.text('J').evaluate().isEmpty; i++) {
        await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
        await tester.pump();
      }
      expect(find.text('J'), findsOneWidget);
    });

    testWidgets('resolves relative paths against the API and ignores unsafe URLs', (tester) async {
      await tester.pumpWidget(host(const PersonAvatar(name: 'owner', url: '/files/t/a/logo/2.webp')));
      expect(networkUrls(tester).single, endsWith('/files/t/a/logo/2.webp'));
      await tester.pumpWidget(host(const PersonAvatar(name: 'owner', url: 'javascript:alert(1)')));
      expect(find.byType(Image), findsNothing);
      expect(find.text('O'), findsOneWidget);
    });
  });

  testWidgets('Customer list shows each customer\'s photo, or their first letter', (tester) async {
    final api = ApiClient(
      token: () => 'fixture',
      client: MockClient((request) async {
        if (request.url.path == '/customers') {
          return http.Response(
            jsonEncode([
              {'id': 'c1', 'name': 'Jasmal', 'phone': '111', 'photo_url': full, 'photo_thumb_url': thumb},
              {'id': 'c2', 'name': 'Noor', 'phone': '222', 'photo_url': null, 'photo_thumb_url': null},
            ]),
            200,
          );
        }
        return http.Response('[]', 200);
      }),
    );
    final app = AppController(store: MemoryStore(), api: api)
      ..ready = true
      ..token = 'fixture';
    await tester.pumpWidget(
      AppScope(
        controller: app,
        child: MaterialApp(theme: rentalTheme(Brightness.light), home: const Scaffold(body: CatalogScreen(customers: true))),
      ),
    );
    await tester.pumpAndSettle();

    final jasmal = find.ancestor(of: find.text('Jasmal'), matching: find.byType(ListTile));
    final avatar = tester.widget<PersonAvatar>(find.descendant(of: jasmal, matching: find.byType(PersonAvatar)));
    expect(avatar.url, thumb);
    expect(avatar.fallbackUrl, full);
    final noor = find.ancestor(of: find.text('Noor'), matching: find.byType(ListTile));
    expect(find.descendant(of: noor, matching: find.text('N')), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('Editing equipment keeps its existing photos', (tester) async {
    await tester.binding.setSurfaceSize(const Size(420, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    Map<String, dynamic>? saved;
    final api = ApiClient(
      token: () => 'fixture',
      client: MockClient((request) async {
        if (request.url.path == '/categories') {
          return http.Response(jsonEncode([{'id': 'cat1', 'name': 'Tents'}]), 200);
        }
        if (request.method == 'PUT' && request.url.path == '/equipment/e1') {
          saved = Map<String, dynamic>.from(jsonDecode(request.body) as Map);
          return http.Response(jsonEncode({'id': 'e1', ...saved!}), 200);
        }
        return http.Response('[]', 200);
      }),
    );
    final app = AppController(store: MemoryStore(), api: api)
      ..ready = true
      ..token = 'fixture';
    final item = Record({'id': 'e1', 'name': 'Tent', 'category_id': 'cat1', 'rent_per_day': 100, 'images': existing});
    await tester.pumpWidget(
      AppScope(
        controller: app,
        child: MaterialApp(theme: rentalTheme(Brightness.light), home: Scaffold(body: SingleChildScrollView(child: EquipmentForm(initial: item)))),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Images (2/4)'), findsOneWidget);
    expect(find.text('Add images (up to 2)'), findsOneWidget);

    await tester.enterText(find.byType(TextFormField).first, 'Big tent');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(saved?['name'], 'Big tent');
    expect(saved?['images'], existing);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('Customer form shows the profile photo first and keeps it apart from the ID document', (tester) async {
    await tester.binding.setSurfaceSize(const Size(420, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    Map<String, dynamic>? saved;
    final api = ApiClient(
      token: () => 'fixture',
      client: MockClient((request) async {
        saved = Map<String, dynamic>.from(jsonDecode(request.body) as Map);
        return http.Response(jsonEncode({'id': 'c1', ...saved!}), 200);
      }),
    );
    final app = AppController(store: MemoryStore(), api: api)
      ..ready = true
      ..token = 'fixture';
    const doc = 'https://api.example.com/files/t/a/customer_doc/d1.webp?exp=1&sig=s';
    final customer = Record({'id': 'c1', 'name': 'Jasmal', 'phone': '111', 'photo_url': full, 'doc_url': doc});
    await tester.pumpWidget(
      AppScope(
        controller: app,
        child: MaterialApp(theme: rentalTheme(Brightness.light), home: Scaffold(body: SingleChildScrollView(child: CustomerForm(initial: customer)))),
      ),
    );

    expect(tester.widget<PersonAvatar>(find.byKey(const Key('customer-form-avatar'))).url, full);
    expect(tester.getTopLeft(find.text('Profile photo')).dy, lessThan(tester.getTopLeft(find.text('ID document (optional)')).dy));
    expect(find.text('Kept private. Never used as the customer\'s picture.'), findsOneWidget);
    expect(find.text('Change photo'), findsOneWidget);
    expect(find.text('Replace document'), findsOneWidget);

    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(saved?['photo_url'], full);
    expect(saved?['doc_url'], doc);
    await tester.pumpWidget(const SizedBox());
  });

  group('upload rules', () {
    test('selection size', () {
      expect(selectionProblem(1, 4, 4), isNull);
      expect(selectionProblem(4, 4, 4), isNull);
      expect(selectionProblem(2, 2, 4), isNull);
      expect(selectionProblem(3, 2, 4), 'You can add up to 4 photos. You selected 3, but only 2 more can be added.');
      expect(selectionProblem(5, 4, 4), contains('only 4 more'));
      expect(selectionProblem(1, 0, 4), 'You can add up to 4 photos. Remove one before adding another.');
    });
    test('file type and size', () {
      expect(imageFileProblem('a.jpg', 100), isNull);
      expect(imageFileProblem('IMG_1.HEIC', 100), isNull, reason: 'the picker converts HEIC to JPEG');
      expect(imageFileProblem('scan.pdf', 100), contains("isn't a JPEG"));
      expect(imageFileProblem('big.jpg', maxUploadBytes + 1), contains('too large (max 10 MB)'));
      expect(uploadName('IMG_1.HEIC'), 'IMG_1.jpg');
    });
  });

  group('MultiImageField', () {
    Future<List<String>> urlsAfter(WidgetTester tester) async {
      await tester.pumpAndSettle();
      return tester.state<HarnessState>(find.byType(Harness)).urls;
    }

    testWidgets('uploads one selected image', (tester) async {
      final sent = <String>[];
      await tester.pumpWidget(host(Harness(pick: () => [picked('drill.jpg')], upload: (n) async => uploadedUrl((sent..add(n)).last), busy: [])));
      await tester.tap(find.text('Add images (up to 4)'));
      expect(await urlsAfter(tester), [uploadedUrl('drill.jpg')]);
      expect(sent, ['drill.jpg']);
      expect(find.text('Images (1/4)'), findsOneWidget);
    });

    testWidgets('uploads four images picked together in the order picked', (tester) async {
      final names = ['a.jpg', 'b.png', 'c.webp', 'd.jpg'];
      await tester.pumpWidget(host(Harness(pick: () => names.map(picked).toList(), upload: (n) async => uploadedUrl(n), busy: [])));
      await tester.tap(find.text('Add images (up to 4)'));
      expect(await urlsAfter(tester), names.map(uploadedUrl).toList());
      expect(find.text('Images (4/4)'), findsOneWidget);
      expect(find.textContaining('Add image'), findsNothing, reason: 'no room left');
    });

    testWidgets('rejects the same image selected twice', (tester) async {
      final sent = <String>[];
      await tester.pumpWidget(host(Harness(pick: () => [picked('same.jpg'), picked('same.jpg')], upload: (n) async => uploadedUrl((sent..add(n)).last), busy: [])));
      await tester.tap(find.text('Add images (up to 4)'));
      expect(await urlsAfter(tester), [uploadedUrl('same.jpg')]);
      expect(sent.length, 1);
      expect(find.textContaining('already selected'), findsOneWidget);
    });

    testWidgets('adds 2 new images to 2 existing ones', (tester) async {
      await tester.pumpWidget(host(Harness(initial: existing, pick: () => [picked('n1.jpg'), picked('n2.jpg')], upload: (n) async => uploadedUrl(n), busy: [])));
      await tester.tap(find.text('Add images (up to 2)'));
      expect(await urlsAfter(tester), [...existing, uploadedUrl('n1.jpg'), uploadedUrl('n2.jpg')]);
    });

    testWidgets('rejects 3 new images when only 2 fit, uploading none', (tester) async {
      var uploads = 0;
      await tester.pumpWidget(
        host(Harness(initial: existing, pick: () => ['x', 'y', 'z'].map((n) => picked('$n.jpg')).toList(), upload: (n) async => uploadedUrl('${uploads++}'), busy: [])),
      );
      await tester.tap(find.text('Add images (up to 2)'));
      expect(await urlsAfter(tester), existing);
      expect(uploads, 0);
      expect(find.text('You can add up to 4 photos. You selected 3, but only 2 more can be added.'), findsOneWidget);
    });

    testWidgets('rejects more than 4 images even if the gallery ignores the limit', (tester) async {
      var uploads = 0;
      await tester.pumpWidget(host(Harness(pick: () => List.generate(5, (i) => picked('$i.jpg')), upload: (n) async => uploadedUrl('${uploads++}'), busy: [])));
      await tester.tap(find.text('Add images (up to 4)'));
      expect(await urlsAfter(tester), isEmpty);
      expect(uploads, 0);
      expect(find.textContaining('You selected 5, but only 4 more'), findsOneWidget);
    });

    testWidgets('rejects non-image files and still uploads the valid ones', (tester) async {
      await tester.pumpWidget(host(Harness(pick: () => [picked('ok.jpg'), picked('scan.pdf')], upload: (n) async => uploadedUrl(n), busy: [])));
      await tester.tap(find.text('Add images (up to 4)'));
      expect(await urlsAfter(tester), [uploadedUrl('ok.jpg')]);
      expect(find.text('"scan.pdf" isn\'t a JPEG, PNG, WebP or GIF image.'), findsOneWidget);
    });

    testWidgets('keeps a failed upload with its error, reports busy, and retries it', (tester) async {
      final busy = <bool>[];
      var failNext = true;
      await tester.pumpWidget(
        host(
          Harness(
            pick: () => [picked('ok.jpg'), picked('bad.jpg')],
            upload: (n) async {
              if (n == 'bad.jpg' && failNext) {
                failNext = false;
                throw ApiError(400, 'The image is damaged or incomplete. Try exporting it again.');
              }
              return uploadedUrl(n);
            },
            busy: busy,
          ),
        ),
      );
      await tester.tap(find.text('Add images (up to 4)'));
      expect(await urlsAfter(tester), [uploadedUrl('ok.jpg')]);
      expect(find.textContaining('bad.jpg: The image is damaged or incomplete.'), findsOneWidget);
      expect(find.textContaining('Retry or remove it before saving.'), findsOneWidget);
      expect(busy.last, isTrue);

      await tester.tap(find.text('Retry'));
      expect(await urlsAfter(tester), [uploadedUrl('ok.jpg'), uploadedUrl('bad.jpg')]);
      expect(busy.last, isFalse);
      expect(find.text('Retry'), findsNothing);
    });

    testWidgets('removes one existing image and keeps the other', (tester) async {
      await tester.pumpWidget(host(Harness(initial: existing, pick: () => [], upload: (n) async => '', busy: [])));
      await tester.tap(find.byTooltip('Remove image 1'));
      expect(await urlsAfter(tester), [existing[1]]);
    });
  });
}
