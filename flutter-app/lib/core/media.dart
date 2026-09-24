import 'package:image_picker/image_picker.dart';
import '../app/controller.dart';
import 'api.dart';

// Upload rules mirrored from nodejs-backend/src/storage/uploadRules.js so the
// app can explain problems before uploading. The API enforces them anyway.
const maxEquipmentImages = 4;
const maxUploadBytes = 10 * 1024 * 1024;
const acceptedImageExtensions = {'jpg', 'jpeg', 'png', 'webp', 'gif'};

/// A picked file that can't be uploaded; the message is shown to the user.
class ImageProblem implements Exception {
  final String message;
  const ImageProblem(this.message);
  @override
  String toString() => message;
}

/// Name sent with an upload. The picker re-encodes HEIC photos to JPEG on
/// Android and iOS, so the extension is corrected to match.
String uploadName(String name) => name.replaceFirst(RegExp(r'\.(heic|heif)$', caseSensitive: false), '.jpg');

/// Why a picked file can't be uploaded, or null when it can.
String? imageFileProblem(String name, int bytes) {
  final sent = uploadName(name);
  final dot = sent.lastIndexOf('.');
  final ext = dot > 0 ? sent.substring(dot + 1).toLowerCase() : '';
  if (ext.isNotEmpty && !acceptedImageExtensions.contains(ext)) {
    return '"$name" isn\'t a JPEG, PNG, WebP or GIF image.';
  }
  if (bytes > maxUploadBytes) return '"$name" is too large (max ${maxUploadBytes ~/ (1024 * 1024)} MB).';
  return null;
}

/// Checks how many photos a selection may add. [room] is how many more fit.
String? selectionProblem(int selected, int room, int max) {
  if (selected <= room) return null;
  final limit = 'You can add up to $max photo${max == 1 ? '' : 's'}';
  if (room <= 0) return '$limit. Remove one before adding another.';
  return '$limit. You selected $selected, but only $room more can be added.';
}

/// Opens the gallery (several photos at once when [limit] > 1) or the camera
/// (one photo). The picker re-encodes to JPEG and caps the size so uploads are
/// quick on mobile data. Some Android galleries ignore [limit], so callers
/// must still check how many came back.
Future<List<XFile>> pickImages({bool camera = false, int limit = 1, int quality = 70}) async {
  final picker = ImagePicker();
  if (camera || limit <= 1) {
    final image = await picker.pickImage(
      source: camera ? ImageSource.camera : ImageSource.gallery,
      imageQuality: quality,
      maxWidth: 1600,
      maxHeight: 1600,
    );
    return image == null ? const [] : [image];
  }
  return picker.pickMultiImage(imageQuality: quality, maxWidth: 1600, maxHeight: 1600, limit: limit);
}

/// Picks one photo and uploads it; returns its URL, or null if cancelled.
Future<String?> uploadImage(AppController app, {bool camera = false, int quality = 70, UploadKind kind = UploadKind.equipment}) async {
  final picked = await pickImages(camera: camera, quality: quality);
  if (picked.isEmpty) return null;
  final image = picked.first;
  final bytes = await image.readAsBytes();
  final problem = imageFileProblem(image.name, bytes.length);
  if (problem != null) throw ImageProblem(problem);
  return app.repo.api.upload(bytes, uploadName(image.name), kind: kind);
}
