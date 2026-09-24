// Response helpers shared by controllers that return files.
function sendPdf(res, { buffer, filename }) {
  const safeName = String(filename).replace(/[^\w.-]/g, "-");
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${safeName}"`,
    "Content-Length": buffer.length,
    "Cache-Control": "private, no-store",
  });
  res.send(buffer);
}

module.exports = { sendPdf };
