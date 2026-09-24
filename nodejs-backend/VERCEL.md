# Deploying this backend to Vercel

## Diagnosed failure

The deployed `/`, `/health`, `/ready` and `/auth/login` returned HTTP 500
`FUNCTION_INVOCATION_FAILED`. The supplied Vercel log identifies:

```text
Invalid export found in module "/var/task/src/app.js".
The default export must be a function or server.
```

Vercel discovers `src/app.js` as the Express entry point. Previously that module
exported the object `{ createApp }`. It now exports a callable request handler
while retaining `.createApp` for the local server and tests. The handler awaits
MongoDB and checks required migrations before passing requests to Express.
Concurrent startup requests share initialization; warm requests reuse the app
and connection pool; a failed startup returns a safe 503 and can be retried.

`vercel.json` selects Express and includes the invoice fonts. `.vercelignore`
excludes local secrets, test artifacts and local database/upload directories.

## Redeploy the fixed files

1. Push these backend changes to the Git branch connected to Vercel, or deploy
   this backend directory through your existing Vercel deployment workflow.
   Redeploying the old commit alone will not include the fix.
2. In the Vercel project, set **Root Directory** to `nodejs-backend` when the
   connected repository is Marzi-Rental-app. If the connected repository already
   contains only the backend, leave its root at the repository root.
3. Use the **Express** framework preset and **Node.js 24.x**. Keep build/output
   overrides unset; this backend does not produce a `dist` or static site folder.
4. Set the following variables in Vercel for the deployment environment, then
   redeploy. The local `.env` file is not deployed.

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your existing Atlas connection string, including database name |
| `JWT_SECRET` | Your secret with at least 32 characters |
| `PUBLIC_API_URL` | `https://marzi-api.vercel.app` |
| `FRONTEND_URL` | Your hosted frontend URL |
| `CORS_ORIGINS` | Comma-separated exact allowed frontend origins, without trailing slashes |
| `TRUST_PROXY` | `1` for the Vercel reverse proxy |
| `REQUIRE_MIGRATIONS` | `true` (also the production default) |

Before deploying against a different database, run `node scripts/migrate.js --apply`
against that database. The original demo database was already migrated. The
request handler checks migrations but deliberately does not run data migrations
inside live requests. A startup 503 is accompanied by the actual initialization
error in Vercel Logs; check environment validation, database connectivity and
pending migrations there.

## Uploads need persistent storage

The inspected local configuration uses `STORAGE_DRIVER=local`. That cannot provide
persistent uploads on Vercel: the function filesystem is read-only except temporary
scratch space. Do not use `/tmp` to store customer documents or equipment photos.

This backend already supports S3-compatible storage. Configure these Vercel
environment variables using your bucket/provider details:

```text
STORAGE_DRIVER=s3
S3_BUCKET=<bucket name>
S3_REGION=<provider region, or auto where supported>
S3_ACCESS_KEY_ID=<access key>
S3_SECRET_ACCESS_KEY=<secret key>
S3_ENDPOINT=<endpoint for an S3-compatible provider; omit for AWS S3>
UPLOAD_MAX_BYTES=4194304
```

Keep the bucket private. `S3_PUBLIC_BASE_URL` is optional; leave it unset to serve
images through the API. Private customer files continue to require signed URLs.
Existing files on the development machine are not in the bucket: copy them with
their existing storage keys or re-upload them after configuration.

Vercel limits function request/response payloads to 4.5 MB. The 4 MiB upload setting
above leaves space for multipart metadata. Large uploads or very large PDFs can
still be rejected by Vercel before/after the application runs. Stripe and SMTP
also require their existing environment variables to enable those integrations.

## Check after deployment

- `GET https://marzi-api.vercel.app/health` should return `200 {"status":"ok"}`.
- `GET https://marzi-api.vercel.app/ready` should return `200 {"status":"ready"}`.
- `GET https://marzi-api.vercel.app/plans` should return a JSON array.
- Login is **POST** `/auth/login` with JSON `username`, `password` and
  `business_code`; browsing to it sends GET, which should return 404.
- `/` has no route and should return the application's JSON 404 after the fix.
  Use `/health` as the deployment check, not the root page.

In the existing Postman environment, change `base_url` to
`https://marzi-api.vercel.app`, run Owner login, then read requests. This uses the
saved demo credentials when Vercel connects to the same MongoDB. A complete
collection run creates another demo business and needs working persistent uploads.

The local fix and tests do not replace the running Vercel deployment. A successful
live redeployment must be checked separately.

References: [Vercel Express entry points](https://vercel.com/docs/frameworks/backend/express),
[function runtime filesystem](https://vercel.com/docs/functions/runtimes),
[payload limits](https://vercel.com/docs/functions/limitations),
[function configuration](https://vercel.com/docs/project-configuration/vercel-json#functions).
