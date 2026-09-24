const {
  uploadImage,
  createUrlResolver,
  getDriver,
  isValidKey,
  visibilityOf,
  contentTypeOf,
  verifySignature,
  checkDeclaredImage,
  FILE_KINDS,
} = require("../storage");
const { getEnv } = require("../config/env");
const { badRequest, notFound, forbidden } = require("../lib/errors");
const { wrapController } = require("../lib/http");

module.exports = wrapController({
  // POST /upload?kind=<kind> (multipart field "file", one image per request;
  // clients upload a multi-image selection as parallel requests so each file
  // gets its own progress and error). The kind decides who can later see the
  // file; a missing kind defaults to private.
  async upload(req, res) {
    if (!req.file) {
      throw badRequest("No image file received. Send a field named 'file' as multipart/form-data with an image.", "NO_FILE");
    }
    const kind = String(req.query.kind || req.body?.kind || "attachment");
    if (!FILE_KINDS[kind]) throw badRequest(`Unknown upload kind "${kind}".`, "VALIDATION_ERROR");
    checkDeclaredImage(req.file);
    const { key } = await uploadImage({ buffer: req.file.buffer, kind, accountId: req.tenant.accountId, userId: req.tenant.userId });
    const files = createUrlResolver(req);
    res.status(201).json({ key, url: files.url(key), thumb_url: files.thumb(key), kind });
  },

  // GET /files/<key>. Public keys are served to anyone; private ones need a
  // valid, unexpired signature produced by createUrlResolver.
  async serve(req, res) {
    const key = req.params[0];
    if (!isValidKey(key)) throw notFound("File not found.");
    const isPrivate = visibilityOf(key) === "private";
    if (isPrivate && !verifySignature(getEnv().fileSigningSecret, key, req.query.exp, req.query.sig)) {
      throw forbidden("This file link has expired. Reload the page to get a new one.", "FILE_LINK_EXPIRED");
    }
    const file = await getDriver().getStream(key);
    if (!file) throw notFound("File not found.");
    res.set({
      "Content-Type": contentTypeOf(key),
      "Cache-Control": isPrivate ? "private, max-age=1800" : "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      "Content-Disposition": "inline",
    });
    if (file.size) res.set("Content-Length", String(file.size));
    file.stream.on("error", () => res.destroy());
    file.stream.pipe(res);
  },
});
