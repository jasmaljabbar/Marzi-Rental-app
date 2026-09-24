const path = require("path");
const pdfMake = require("pdfmake");

const FONTS_DIR = path.join(__dirname, "../../../assets/fonts");

pdfMake.addFonts({
  Roboto: {
    normal: path.join(FONTS_DIR, "NotoSans-Regular.ttf"),
    bold: path.join(FONTS_DIR, "NotoSans-Bold.ttf"),
    italics: path.join(FONTS_DIR, "NotoSans-Italic.ttf"),
    bolditalics: path.join(FONTS_DIR, "NotoSans-BoldItalic.ttf"),
  },
});
// docDefinitions built in this app never reference remote URLs (images are
// pre-resolved to base64 data URIs), so deny those outright to close off
// SSRF via a future accidental `images: {url: ...}`. Local file access is
// used legitimately by pdfmake itself to load the fonts registered above, so
// it can't be blanket-denied — scope it to just the fonts directory instead.
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy((filePath) => path.resolve(filePath).startsWith(FONTS_DIR + path.sep));

function renderInvoicePdfBuffer(docDefinition) {
  return pdfMake.createPdf(docDefinition).getBuffer();
}

module.exports = { renderInvoicePdfBuffer };
