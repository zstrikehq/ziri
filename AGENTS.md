# Agent memory

## Learned User Preferences

- When refactoring for readability, change only structure and readability; do not change behavior.
- Prefer retry mechanisms (e.g. multiple attempts with delay) over increasing timeouts for flaky flows like login.
- Prefer short PR descriptions: what was the issue and what we added.

## Learned Workspace Facts

- E2E specs live under `packages/ui/cypress/e2e`; full-kickoff and per-page specs use the same auto-login vs manual login (ziri via `CYPRESS_ZIRI_ROOT_KEY` or wait for manual login).
- Proxy database schema is managed via numbered SQL migrations in `packages/proxy/src/db/migrations` (starting with `0001_schema.sql` and `0002_legacy_fixes.sql`).
