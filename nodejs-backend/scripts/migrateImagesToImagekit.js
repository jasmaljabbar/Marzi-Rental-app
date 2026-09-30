// Copies registered local images to ImageKit without changing application keys.
// Original files are retained. Re-running skips successfully migrated objects.
require("dotenv").config();
const mongoose = require("mongoose");
const { getEnv } = require("../src/config/env");
const FileObject = require("../src/models/FileObject");
const { createLocalDriver } = require("../src/storage/localDriver");
const { createImageKitDriver } = require("../src/storage/imagekitDriver");
async function main() {
  const env = getEnv();
  await mongoose.connect(env.MONGODB_URI);
  const source = createLocalDriver({ rootDir: env.STORAGE_LOCAL_DIR, legacyDir: env.LEGACY_UPLOADS_DIR });
  const target = createImageKitDriver({ privateKey: env.IMAGEKIT_PRIVATE_KEY, urlEndpoint: env.IMAGEKIT_URL_ENDPOINT });
  const files = await FileObject.find({ storageDriver: { $ne: "imagekit" } }).setOptions({ skipTenantCheck: true }).lean();
  let migrated = 0;
  let missing = 0;
  for (const file of files) {
    const full = await source.getBuffer(file.key);
    const thumb = file.thumbKey ? await source.getBuffer(file.thumbKey) : null;
    if (!full || (file.thumbKey && !thumb)) { missing++; continue; }
    const uploaded = await target.put(file.key, full, file.contentType);
    const thumbnail = thumb ? await target.put(file.thumbKey, thumb, file.contentType) : null;
    await FileObject.updateOne({ _id: file._id, accountId: file.accountId }, { $set: { storageDriver: "imagekit", providerFileId: uploaded.fileId, providerThumbFileId: thumbnail?.fileId || null } });
    migrated++;
  }
  console.log(JSON.stringify({ migrated, missingLocalFiles: missing, alreadyMigrated: await FileObject.countDocuments({ storageDriver: "imagekit" }).setOptions({ skipTenantCheck: true }) }));
  if (missing) process.exitCode = 1;
}
main().catch((err) => { console.error(err.code || err.name, "Image migration failed"); process.exitCode = 1; }).finally(() => mongoose.disconnect());
