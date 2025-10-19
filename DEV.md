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
      - Use `MONGO_URI=mongodb://libreport:libreport@localhost:27017/?authSource=admin`, `DB_NAME=libreport`
    - Option B: Compass
      - Use your Compass connection string (`MONGO_URI=...`)
    - No PHP required.

- Backend env
  - Copy `Backend/.env.example` to `Backend/.env`
  - For Docker, set:
    - `MONGO_URI=mongodb://libreport:libreport@localhost:27017/?authSource=admin`
    - `DB_NAME=libreport`
  - For Compass, paste your `MONGO_URI` (URL-encode password if needed). Add `authSource=admin` if you use admin auth.

- Install and run
  - Install deps: `npm run setup`
  - Start MongoDB (Docker): `docker compose up -d`
  - Bootstrap DB (indexes + seed demo data): `npm run db:bootstrap`
  - Start full dev (fast default): `npm run dev` (in-memory DB + frontend on port 3000)
  - Free port 3000 (if needed): `npm run free:3000`
  - Start dev with in-memory DB (default CRA port 3000): `npm run dev:fast`
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
