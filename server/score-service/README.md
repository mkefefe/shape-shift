# Shape Shift score and report service

This is the existing Cloudflare Worker source, captured with its module dependencies and updated for the 4.94.240 private bug-report inbox. It is server code and is excluded from the web and Android asset bundles.

The production worker is `shape-shift-test-scores`. It retains the existing `DB` D1 binding and `CREATIONS`/`SUBMISSIONS` rate-limit bindings. Apply `reports-schema.sql` to that existing database before deploying these modules. The migration only adds the report table and indexes; existing scores and owner permissions remain intact. Deploy the module set with `worker.mjs` as the entry point while preserving the existing Worker configuration and bindings.

Players submit to `POST /api/reports` using their installation credential. A UUID makes retries idempotent, and the database atomically limits each installation to five new reports per hour. Messages are limited to 2,000 characters. Reports expire after 180 days and are also covered by the existing online-profile deletion operation.

`POST /api/reports/inbox` and `POST /api/reports/status` require an existing entry in the server's `owners` table. Client flags, leaderboard consent and admin-mode state do not grant this access. The Settings inbox appears after the normal server owner check succeeds. No credentials are included in this repository.

Run the integration tests with Node 24 or newer:

```sh
node --test server/score-service/reports.test.mjs
```

The test harness executes the actual Worker request handler against an in-memory SQLite database, including authentication, origins, validation, deduplication, limits, private pagination, status changes, failures and expiry.
