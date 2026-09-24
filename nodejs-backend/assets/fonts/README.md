Noto Sans (Regular/Bold/Italic/BoldItalic), from the `fonts-noto-core` package,
licensed under the SIL Open Font License 1.1: https://openfontlicense.org/

Used for server-side invoice PDF rendering (`src/services/pdf/pdfPrinter.js`) —
chosen over the standard 14 PDF fonts because it covers non-Latin currency
glyphs (e.g. ₹) that the base PDF fonts don't include.
