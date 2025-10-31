Project Structure

- Frontend: React app (CRA)
- Backend: Node.js + Express + MongoDB
- Database: MongoDB (via Compass). Legacy PHP removed.

Local Development

- Requirements
  - Node.js 18+
  - MongoDB via Docker or Compass
    - Option A: Docker (recommended)
      - Run `docker compose up -d` (starts MongoDB on localhost:27017, user/pass libreport/libreport)
      - Set environment variables in `Backend/.env` (do NOT commit real secrets):
        - `MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?authSource=admin&retryWrites=true&w=majority&appName=LibReport`
        - `DB_NAME=libreport`
    - Option B: Compass
      - Use your Compass connection string (`MONGO_URI=...`)
    - No PHP required.

- Backend env
  - Copy `Backend/.env.example` to `Backend/.env`
  - For Docker, set in `Backend/.env` (placeholders only in docs):
    - `MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?authSource=admin&retryWrites=true&w=majority&appName=LibReport`
    - `DB_NAME=libreport`
  - For Compass, paste your `MONGO_URI` (URL-encode password if needed). Add `authSource=admin` if you use admin auth.

- Install and run
  - Install deps: `npm run setup`
  - Start MongoDB (Docker): `docker compose up -d`
  - Bootstrap DB (indexes + seed demo data): `npm run db:bootstrap`
- Start full dev (fast default): `npm run dev` (in-memory DB + frontend on port 3000)
- Free port 3000 (if needed): `npm run free:3000`
- Start dev with in-memory DB (default CRA port 3000): `npm run dev:fast`
- Guided start with auto-port pick (Windows-friendly): `npm run start:guided` (chooses 3000 → 3001 → 3002 if busy)
  - Backend only (watch, memory DB): `npm run dev:backend:memory`
  - Quick smoke test (requires backend running): `npm run smoke`
  - Tailwind is loaded via CDN for rapid iteration (see `Frontend/public/index.html`).

- Health checks
  - Backend: GET http://localhost:4000/api/health
  - Frontend: loads at http://localhost:3000

Legacy\n\n- The legacy LibTracker PHP folder and route have been removed.\n\nDatabase Bootstrap

- Ensure `Backend/.env` has `MONGO_URI` set (Compass string or local URI)
- Create indexes and seed demo data:
  - `npm --prefix Backend run db:bootstrap`
  - or run separately: `npm --prefix Backend run db:indexes` then `npm --prefix Backend run db:seed`

UI Notes (Tailwind)

- Sign In and Sign Up screens now use Tailwind utility classes.
- Continue migrating other pages incrementally to Tailwind as needed.
- No CRA eject required; Tailwind is provided via CDN for development and quick styling.

Scanner Notes

- Camera scanner uses BarcodeDetector (Chromium-based) on https:// or http://localhost.
- Scanner Sound Preference is saved in localStorage key lr_scan_sound and shared in Tracker and Books Management.

Atlas Setup (Shared Cloud DB)

- Create an Atlas cluster and a DB user with readWrite on your database.
- Add your IP(s) in Atlas Network Access (or 0.0.0.0/0 for dev-only).
- In `Backend/.env` set:
  - `MONGO_URI=mongodb+srv://<user>:<url-encoded-pass>@<cluster>/<db>?authSource=admin&retryWrites=true&w=majority&appName=LibReport`
  - `DB_NAME=<db>` (usually `libreport` to match the URI path)
  - Set a strong `JWT_SECRET` (see JWT Tokens section).
- Install deps: `npm run setup`
- Start backend (Atlas): `npm run dev:backend` (avoid the in-memory scripts)
- Start backend+frontend together (Atlas): `npm run dev:atlas`
- Verify connection: `npm --prefix Backend run check:connection`
- Optional: seed demo data + indexes into Atlas: `npm --prefix Backend run db:bootstrap`

Switching Between Atlas and Local

- Atlas (shared across all PCs)
  - Ensure `Backend/.env` has the Atlas `MONGO_URI` and matching `DB_NAME`.
  - Run `npm run dev:backend`.
- Local Docker (isolated per PC)
  - `docker compose up -d` to start local Mongo.
  - Use either a single URI or parts in `Backend/.env`:
    - `MONGO_URI=mongodb://libreport:libreport@127.0.0.1:27017/libreport?authSource=admin`
    - or parts: `MONGO_HOST=127.0.0.1`, `MONGO_PORT=27017`, `MONGO_USER=libreport`, `MONGO_PASS=libreport`, `MONGO_AUTH_DB=admin`, `DB_NAME=libreport`.
  - Run `npm run dev:backend`.
- In-memory (fast demo/testing; not shared)
  - `npm run dev:backend:memory` or root `npm run dev`.
  - If the memory server download is blocked on your network, set one or more of the following before starting the backend:
    - `MONGO_MEMORY_VERSION` to target a specific MongoDB release (for example `7.0.5`).
    - `MONGO_MEMORY_OS_RELEASE` / `MONGO_MEMORY_OS_DIST` to force an older Ubuntu package (for example `20.04`).
    - `MONGO_MEMORY_SYSTEM_BINARY` to reuse an already installed `mongod` binary on disk.
    - Optional: `MONGO_MEMORY_DOWNLOAD_DIR` to reuse a shared download/cache directory.
  - Set `USE_MEMORY_DB=false` to skip the fallback entirely when you prefer a real MongoDB instance.

Data Migration (Local -> Atlas)

- Use MongoDB Database Tools on your machine.
- Dump local:
  - `mongodump --uri="mongodb://libreport:libreport@127.0.0.1:27017/libreport?authSource=admin" --db=libreport --out=dump_dir`
- Restore to Atlas:
  - `mongorestore --uri="mongodb+srv://<user>:<pass>@<cluster>/libreport?authSource=admin" --nsInclude=libreport.* dump_dir/libreport`
- Or use the bundled migration script:
  - `npm --prefix Backend run migrate:local:atlas`
- Per-collection only:
  - `node Backend/scripts/migrate_to_atlas.js --from local --to env --collections users,admins,books,uploads.files,uploads.chunks --drop-target`
- Files (book covers/PDFs) are in GridFS `uploads.files`/`uploads.chunks` and migrate with dump/restore.

Troubleshooting Connectivity

- Start local Mongo (Docker): `docker compose up -d`
- Test local connection (prefer 127.0.0.1):
  - `mongosh "mongodb://libreport:libreport@127.0.0.1:27017/libreport?authSource=admin" --eval "db.stats().ok"`
- Verify Atlas connectivity (uses your Backend/.env):
  - `npm --prefix Backend run check:connection`
- If migration fails with ECONNREFUSED, confirm the source is running and accessible, then re-run:
  - `npm --prefix Backend run migrate:local:atlas`

Index Maintenance

- Ensure/create managed indexes anytime:
  - `npm --prefix Backend run db:indexes`
- Drop obsolete/duplicate indexes (keeps _id and managed ones):
  - `npm --prefix Backend run db:indexes:clean`

JWT Tokens (Shared Across PCs)

- Generate a strong secret and add to `Backend/.env` on every PC:
  - `npm --prefix Backend run token:secret`
  - Copy the printed `JWT_SECRET=...` into `Backend/.env` (use the SAME value on all machines)
- The backend signs tokens with HS256 and a 7d expiry. Using the same `JWT_SECRET` across machines allows tokens issued by one backend to be valid on the others.
