const mongoose = require("mongoose");

// Records which data migrations (scripts/migrations/*) have been applied.
const migrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    appliedAt: { type: Date, default: Date.now },
    summary: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: false }
);

module.exports = mongoose.model("Migration", migrationSchema);
