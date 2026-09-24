const mongoose = require("mongoose");

// Backs atomic sequence generation (e.g. invoice numbers) via $inc, which
// Mongo guarantees atomic on a single document — see src/utils/invoiceNumber.js.
const counterSchema = new mongoose.Schema({
  scopeKey: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("Counter", counterSchema);
