# BlueMind Docs Backend

Backend-only repository for BlueMind Docs.

Contains API routes, authentication, sessions, database schema, autosave, uploads, storage, sharing, validation, and business logic. Frontend UI files live in `bluemind-docs-frontend`.

## Local Run

```powershell
npm.cmd run migrate
npm.cmd start
```

API runs on `http://127.0.0.1:4000` by default.

## Environment

Copy `.env.example` to `.env` and configure:

- `PORT`
- `DATABASE_PATH`
- `IMAGE_STORAGE_ROOT`
- `CORS_ORIGIN` as the frontend origin, for example `http://127.0.0.1:3000` locally or the deployed frontend URL in production.

## Test

```powershell
npm.cmd test
```
