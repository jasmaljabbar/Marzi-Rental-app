import 'dart:io';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:printing/printing.dart';

Future<Uint8List> cachedInvoice(
  String name,
  Future<Uint8List> Function() fetch,
) async {
  final dir = Directory('${(await getTemporaryDirectory()).path}/invoices');
  await dir.create(recursive: true);
  final file = File('${dir.path}/$name');
  if (await file.exists()) return file.readAsBytes();
  final bytes = await fetch();
  await file.writeAsBytes(bytes, flush: true);
  return bytes;
}

Future<void> savePdf(Uint8List bytes, String name) async {
  if (Platform.isAndroid) {
    await const MethodChannel(
      'rental_manager/files',
    ).invokeMethod<void>('savePdf', {'bytes': bytes, 'name': name});
  } else {
    await Printing.sharePdf(bytes: bytes, filename: name);
  }
}
