const { Router } = require("express");
const multer = require("multer");
const c = require("../controllers/fileController");
const { tenantRouter } = require("./_helpers");
const { getEnv } = require("../config/env");

function uploadRoutes(limiters) {
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: getEnv().UPLOAD_MAX_BYTES, files: 1 } });
  const router = tenantRouter();
  router.post("/", limiters.upload, upload.single("file"), c.upload);
  return router;
}

function fileRoutes() {
  const router = Router();
  router.get(/^\/(.+)$/, c.serve);
  return router;
}

module.exports = { uploadRoutes, fileRoutes };
