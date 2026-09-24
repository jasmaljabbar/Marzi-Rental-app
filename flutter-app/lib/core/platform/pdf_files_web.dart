import 'dart:typed_data';
import 'package:printing/printing.dart';

Future<Uint8List> cachedInvoice(
  String name,
  Future<Uint8List> Function() fetch,
) => fetch();
Future<void> savePdf(Uint8List bytes, String name) async {
  await Printing.sharePdf(bytes: bytes, filename: name);
}
