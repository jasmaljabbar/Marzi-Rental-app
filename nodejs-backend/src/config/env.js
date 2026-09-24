const { z } = require("zod");

// Every environment variable the API reads is declared here and validated once
// at startup, so a misconfigured deployment fails fast with a readable message
// instead of surfacing later as a confusing 401/500.
const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === "boolean" ? v : ["1", "true", "yes", "on"].includes(v.toLowerCase())));

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),

    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    // "auto" uses transactions when the server supports them (replica set /
    // Atlas) and falls back to plain writes on a standalone dev mongod.
    MONGO_TRANSACTIONS: z.enum(["auto", "on", "off"]).default("auto"),
    REQUIRE_MIGRATIONS: booleanish.optional(),

    JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    JWT_EXPIRES_IN_STAFF: z.string().default("8h"),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

    CORS_ORIGINS: optionalString,
    // Number of reverse-proxy hops to trust for X-Forwarded-* (0 = none).
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    // Public base URL of this API (e.g. https://api.example.com). Used to build
    // absolute file URLs; when unset, URLs are built from the request.
    PUBLIC_API_URL: optionalString,

    TRIAL_DAYS: z.coerce.number().int().positive().default(14),
    FRONTEND_URL: z.string().default("http://localhost:5174"),

    STRIPE_SECRET_KEY: optionalString,
    STRIPE_WEBHOOK_SECRET: optionalString,

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("storage"),
    LEGACY_UPLOADS_DIR: z.string().default("uploads"),
    FILE_SIGNING_SECRET: optionalString,
    UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
    S3_BUCKET: optionalString,
    S3_REGION: z.string().default("auto"),
    S3_ENDPOINT: optionalString,
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_FORCE_PATH_STYLE: booleanish.default(false),
    S3_PUBLIC_BASE_URL: optionalString,

    SMTP_URL: optionalString,
    MAIL_FROM: z.string().default("Rental Manager <no-reply@localhost>"),
    PASSWORD_RESET_URL: optionalString,

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (env.JWT_SECRET.length < 32) {
        ctx.addIssue({ code: "custom", path: ["JWT_SECRET"], message: "must be at least 32 characters in production" });
      }
      if (env.STORAGE_DRIVER === "s3" && !env.S3_BUCKET) {
        ctx.addIssue({ code: "custom", path: ["S3_BUCKET"], message: "is required when STORAGE_DRIVER=s3" });
      }
    }
  });

let cached;

function formatIssues(error) {
  return error.issues.map((i) => `  - ${i.path.join(".") || "env"}: ${i.message}`).join("\n");
}

function loadEnv(source = process.env) {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const err = new Error(`Invalid environment configuration:\n${formatIssues(parsed.error)}`);
    err.code = "INVALID_ENV";
    throw err;
  }
  const env = parsed.data;
  env.isProduction = env.NODE_ENV === "production";
  env.isTest = env.NODE_ENV === "test";
  env.requireMigrations = env.REQUIRE_MIGRATIONS ?? env.isProduction;
  env.corsOrigins = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : ["http://localhost:5173", "http://localhost:5174", "http://localhost:8081", "http://localhost:19006", "http://localhost:8000"];
  env.fileSigningSecret = env.FILE_SIGNING_SECRET || `files:${env.JWT_SECRET}`;
  env.weakJwtSecret = env.JWT_SECRET.length < 32;
  cached = env;
  return env;
}

function getEnv() {
  return cached || loadEnv();
}

// Tests mutate process.env between suites; this forces the next getEnv() to re-read it.
function resetEnv() {
  cached = undefined;
}

module.exports = { loadEnv, getEnv, resetEnv };
