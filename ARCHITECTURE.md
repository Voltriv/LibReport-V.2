# LibReport Architecture & Quality Guide

This guide documents the current structure of LibReport V.2 and sets the standard for future work. It lays out how to keep the system modular, reliable, accessible, and secure while moving quickly.

---

## 1. High‑level Layout

| Layer | Location | Responsibility | Key Notes |
| --- | --- | --- | --- |
| Web UI | `Frontend/src/**` | Student/admin SPA built with React (CRA) | Uses lazy routes + context free components. All new UI work should land inside `pages/`, `components/`, or `student/` folders with colocated styles. |
| API Gateway | `Backend/server.js` | Express app exposing admin + student endpoints | Planned modularisation: controllers, services, models, middleware. Until that refactor lands, new logic should live in helper modules under `Backend/services` or `Backend/utils` and be required from `server.js`. |
| Persistence | MongoDB models in `Backend/models/**` | Schemas + helpers for students, books, loans, requests. | Use Lean queries + index-friendly filters. Avoid leaking raw mongoose documents to the client. |
| Tooling | `scripts/**`, `package.json` | Build, smoke tests, release scripts | Run `npm run build` before pushing to keep the React bundle healthy. |

### Version Control

* Default branch: `main`.
* Feature workflow: `git checkout -b feature/<name>` → commit often → PR → squash merge.
* Never commit generated artefacts (`Frontend/build`, logs).
* Add tests or smoke scripts for regressions and link them in the PR description.

---

## 2. Backend Quality Bar

### 2.1 Modular boundaries

* **Routing** (Express) must call slim **controllers** (input/output) which then use **services** (business logic) and **models** (persistence).
* When touching `server.js`, extract heavy logic to `/services` (e.g. `Backend/services/borrowRequests.js`) and unit test it.
* Reuse shared helpers in `/utils` (Date handling, ID validation, sanitisation).

### 2.2 Validation & Error Handling

* Always validate request bodies and query params before hitting the DB (`express-validator` or manual guard).
* Throw typed errors (`BadRequestError`, `ForbiddenError`, …) and convert them to HTTP responses in one place (`app.use(errorHandler)`).
* Mask internal errors: respond with `500` + tracking id, log full stack server-side.
* Sanitise user-facing messages to strip emails, tokens, internal IDs.

### 2.3 Privacy & Security

* Store sensitive user fields encrypted/hashed (`passwordHash` already uses bcrypt; never log raw passwords).
* When exposing student/admin data, omit PII not needed by the client (`email`, `studentId`, etc.) unless required.
* Enforce RBAC via middleware (`studentRequired`, `adminRequired`); never rely on front-end role checks.
* Enable rate limiting for sensitive endpoints (auth, borrow requests) – plan to add `express-rate-limit`.
* Use CSRF-safe design (SPA uses tokens; ensure tokens have expiry and refresh flow).

### 2.4 Edge Cases

* Borrowing flows must handle: already borrowed, existing requests, unavailable copies, invalid IDs, network failures.
* Always check for missing docs (`404`) and return actionable copy.
* Queue background tasks (emails, analytics) via worker instead of blocking requests.

---

## 3. Frontend Quality Bar

### 3.1 Modular React

* Pages live under `pages/` or `student/pages/`. Shared components in `components/` or `student/components/`.
* Hooks belong in `hooks/`; stateful logic should be abstracted from JSX to keep rendering declarative.
* Keep files ≤ 300 lines. Split long files into subcomponents/modules.
* Use TypeScript or PropTypes for new complex components (roadmap addition).

### 3.2 UX Consistency & Accessibility

* Reuse the design tokens defined in `index.css` (`--brand-*`). No hard-coded colour hexes.
* Provide accessible labels, focus states, and keyboard interactions. Use semantic HTML (`<button>`, `<nav>`, `<section>`).
* Add `aria-live` regions for async feedback (e.g., borrow request status).
* Ensure screens are responsive (Tailwind classes already in use; confirm breakpoints).
* Keep skeleton loaders + empty states for every async list.

### 3.3 Error, Loading, Success States

* Each API call should manage `loading`, `error`, `empty`, and `success` or `info` states (toasts or inline alerts).
* Form validation: inline hints, disabled submit while busy, summarise server errors.
* Use optimistic updates when safe (e.g. editing profile) but reconcile with server response.

---

## 4. Performance & Responsiveness

* Client: Lazy load routes (`safeLazy` already in `App.jsx`), memoise expensive calculations, avoid re-render loops.
* API: Optimise DB queries with projection + indexes, paginate lists (library catalogue uses `limit/skip` already).
* Use caching for static content (CloudFront, Netlify) and HTTP cache headers for GET endpoints (`/books/library`).

---

## 5. Testing Strategy

| Layer | Tool | Expectation |
| --- | --- | --- |
| API | Jest + Supertest (TBD) | Test services + controllers covering success, validation, auth. |
| Frontend | React Testing Library | Cover critical components (catalog actions, account editing, admin flows). |
| E2E | Playwright/Cypress (roadmap) | Critical user journeys: student borrow flow, admin approval, login/logout. |
| Smoke | `scripts/smoke.js` | Runs on deploy to ensure basic health endpoints. |

Automate via CI (GitHub Actions or similar). Block merge if tests or lint fail.

---

## 6. Release Discipline

1. `npm run lint && npm run build` (frontend) + backend tests.
2. Bump version (`package.json` + `CHANGELOG.md`).
3. Create release branch `release/<version>`, run QA, merge to `main`, tag `v<version>`.
4. Deploy backend (PM2/Docker) and frontend (S3/CloudFront or Render/Vercel). Monitor logs immediately after release.

---

## 7. Roadmap Improvements

* [ ] Extract Express routes into `/routes`, controllers into `/controllers`, services into `/services`.
* [ ] Introduce `zod` or `yup` schemas for request validation.
* [ ] Implement rate limiting + audit logging.
* [ ] Add multi-tenant support (campus separation).
* [ ] Convert React codebase to TypeScript for safer refactors.

---

By following these guidelines we maintain a codebase that stays modular, secure, accessible, and easy to evolve. Treat this document as a living reference—update it whenever architecture decisions change or new quality rules are introduced.
