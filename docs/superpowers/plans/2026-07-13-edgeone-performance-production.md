# EdgeOne Performance and Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish measured mobile performance budgets, remove proven rendering/network waste, harden EdgeOne production configuration, deploy the verified build, and prove the public domain and APIs work.

**Architecture:** Capture reproducible build/runtime baselines first, then optimize CSS composition, client boundaries, lazy media, caching, and request limits without changing the full-stack Next.js architecture. Production secrets remain outside Git in EdgeOne variables; Git push is the deployment trigger, followed by DNS/TLS and black-box smoke tests.

**Tech Stack:** Next.js 16, React 19, Node 22, EdgeOne Pages/Makers, PowerShell/curl, Playwright CLI, Vitest.

---

## File map

**Create**

- `scripts/audit/performance-budget.mjs` — reads `.next` assets and fails budgets.
- `scripts/audit/production-smoke.mjs` — public read-only smoke checks.
- `docs/audits/performance-2026-07.md` — baseline and final evidence.

**Modify**

- `package.json` / `package-lock.json` — audit scripts only; no package-manager change.
- `next.config.ts` — only evidence-backed headers/image/build tuning; never static export.
- `edgeone.json` — verify and retain `.next`, Node 22.11.0, Guangzhou, 60 seconds, and immutable static headers.
- `.gitignore` — protect all env and signing files.
- `styles/globals.css` and relevant CSS Modules — reduce compositing cost.
- Client components identified by the baseline — split/lazy-load only proven heavy optional code.
- `docs/ops/{env-config,deploy-edgeone,README}.md` and `docs/详解/*`.

## Task 1: Capture a Node 22 build and runtime baseline

**Files:**

- Create: `docs/audits/performance-2026-07.md`
- Create: `scripts/audit/performance-budget.mjs`
- Modify: `package.json`

- [ ] **Step 1: Stop the dev server cleanly and install exactly from the lockfile on Node 22**

Run `fnm install 22.11.0`, then execute all baseline commands through `fnm exec --using=22.11.0`. Record `fnm exec --using=22.11.0 node --version`, which must print `v22.11.0`. Run `fnm exec --using=22.11.0 npm ci` without changing package manager.

Expected: Node major 22; `npm ci` exits 0.

- [ ] **Step 2: Run the untouched quality baseline**

Run:

```powershell
npm run lint
npm run tsc
npx vitest run
npm run build
```

Record exit codes, test count, build duration, warnings, and `.next` output size. Expected pre-optimization evidence is recorded even if a warning remains.

- [ ] **Step 3: Write a failing budget script test fixture**

The script receives a build directory argument, sums client JS/CSS, reports the largest 20 assets, and exits 1 if any one client asset exceeds 500 KiB uncompressed, all static JS exceeds 2.5 MiB uncompressed, or all static CSS exceeds 300 KiB uncompressed.

Create a temporary fixture directory in the test with one 501 KiB fake JS file; assert non-zero exit. Do not scan `.next/cache`.

- [ ] **Step 4: Implement the dependency-free budget reader**

Use `fs.readdir({ recursive: true })`, include `.next/static/chunks/**/*.js` and `.next/static/css/**/*.css`, exclude maps and cache. Output JSON plus a readable table. Enforce the exact 500 KiB single-asset, 2.5 MiB total-JS, and 300 KiB total-CSS limits from Step 3; record the baseline separately rather than weakening these limits.

- [ ] **Step 5: Add scripts**

```json
{
  "perf:budget": "node scripts/audit/performance-budget.mjs .next",
  "test": "vitest run"
}
```

- [ ] **Step 6: Capture mobile runtime metrics**

At 390×844 and 360×640, measure the login page plus authenticated Elder/Family home, chat, health, and voice routes using production `next start`, not dev mode. Record:

- navigation timing and first-contentful-paint where exposed;
- transferred JS/CSS/font/image bytes;
- long tasks >50ms;
- layout shifts;
- DOM node count;
- root/intentional scroller counts;
- console errors.

- [ ] **Step 7: Commit the baseline tooling and document**

```powershell
git add scripts/audit/performance-budget.mjs package.json package-lock.json docs/audits/performance-2026-07.md
git commit -m "test(perf): establish mobile production budgets"
```

## Task 2: Reduce rendering and client-side work proven by the baseline

**Files:**

- Modify: `styles/globals.css`
- Modify: `components/ui/Card.module.css`
- Modify: `components/layout/{TabBar,PageHeader}.module.css`
- Modify: page/component files named in the baseline report.
- Modify: affected tests.

- [ ] **Step 1: Add regression checks for lazy optional surfaces**

Add a HomePage test that renders an Elder user and asserts only the Elder lazy component resolves; repeat for Family. This protects the role split from returning to one shared eager home chunk.

- [ ] **Step 2: Verify the selected check fails before splitting**

Run the focused HomePage test and inspect the production chunk graph. Expected before the change: both `ElderHomeView` and `FamilyHomeView` are static imports in `app/page.tsx` and belong to the same route graph.

- [ ] **Step 3: Remove scrolling-card backdrop filters**

Use opaque or ≥0.94 alpha card backgrounds. Keep blur only on fixed TabBar/PageHeader and modal chrome. Add:

```css
@media (prefers-reduced-transparency: reduce) {
  .glassBar { backdrop-filter: none; background: var(--bg-card-solid); }
}
```

Do not add `will-change` globally; use it only during an imminent transform animation.

- [ ] **Step 4: Lazy-load only optional, measured-heavy UI**

Use `next/dynamic` for `ElderHomeView` and `FamilyHomeView`, selecting only the current role. Each loading state uses the same page grid and fixed skeleton dimensions to avoid layout shift. Keep primary text and navigation in the page shell; do not add other dynamic imports in this task.

- [ ] **Step 5: Remove perpetual timers/animations offscreen**

Pause voice pulses, radio progress, and time updates when the document is hidden. Replace 30-second home clock re-renders with a minute-aligned update. All decorative loops respect reduced motion.

- [ ] **Step 6: Rebuild and compare**

Run: `npm run build && npm run perf:budget`

Expected: budgets pass; no route’s initial JS/CSS grows above baseline without a documented reason; large blur layers decrease in the browser layer/compositing inspection.

- [ ] **Step 7: Run visual and functional regression tests**

Run: `npm test && npm run lint && npm run tsc` plus key screenshots. Expected: exit 0 and no visual loss in fixed chrome.

- [ ] **Step 8: Commit measured runtime improvements**

```powershell
git add styles components app package.json package-lock.json docs/audits/performance-2026-07.md
git commit -m "perf(ui): reduce mobile rendering and initial work"
```

## Task 3: Harden request, response, caching, and security policies

**Files:**

- Modify: `next.config.ts`
- Inspect without modifying: `edgeone.json`; static asset headers stay at the edge and application/private headers stay in Next routes.
- Modify: API routes returning health/chat/audio/private content.
- Create or modify: route/header tests.

- [ ] **Step 1: Write failing header tests**

Assert:

- TTS, health, chat, user, and private signed-URL responses include `Cache-Control: private, no-store`.
- `/api/ping` is short-cache or no-store and exposes no config.
- static Next assets remain `public, max-age=31536000, immutable` through `edgeone.json`.
- HTML has `X-Content-Type-Options`, `Referrer-Policy`, and microphone Permissions-Policy compatible with same-origin WebView capture.

- [ ] **Step 2: Run tests and verify missing private cache policies fail**

Run the focused route/header tests. Expected: at least health/chat/private routes lack explicit no-store.

- [ ] **Step 3: Add one shared private response helper where repetition is real**

The helper sets `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, and `Vary: Authorization` without changing response bodies. Use it only for authenticated personalized responses.

- [ ] **Step 4: Review `next.config.ts` without reintroducing forbidden behavior**

Keep full-stack output. Remove `images.unoptimized: true` only after confirming every `next/image` use works in EdgeOne’s Next runtime; otherwise document why it remains. Do not put redirects/rewrites in this file.

- [ ] **Step 5: Enforce body/time boundaries**

ASR upload stays ≤5MB; TTS stays ≤1000 characters per chunk; upstream aborts before 50 seconds. Add route tests so the EdgeOne 6MB/60s platform limits cannot be exceeded by normal requests.

- [ ] **Step 6: Run tests and build**

Run: `npm test && npm run lint && npm run tsc && npm run build`

Expected: all exit 0; header tests pass; no build warning about static export.

- [ ] **Step 7: Commit production policies**

```powershell
git add next.config.ts edgeone.json app/api lib/server docs/audits/performance-2026-07.md
git commit -m "perf(edge): harden private caching and request limits"
```

## Task 4: Secure environment and deployment configuration

**Files:**

- Modify: `.gitignore`
- Modify: `.env.example`
- Modify: `docs/ops/env-config.md`
- Modify: `docs/ops/deploy-edgeone.md`
- Modify: `docs/ops/README.md`
- Modify: `docs/详解/项目结构详解.md`

- [ ] **Step 1: Write a failing Git-safety shell check**

Create temporary ignored-name probes `.env.production`, `.env.staging`, `release.jks`, `keystore.properties`, then run `git check-ignore`. Expected before the fix: `.env.production` and signing files are not all ignored. Remove probes after the check.

- [ ] **Step 2: Harden ignore rules**

Use:

```gitignore
.env*
!.env.example
*.jks
*.keystore
keystore.properties
*.apk
*.aab
```

Keep current media/build ignores. Ensure `docs/designs/ui/**/*.png` remains explicitly allowed.

- [ ] **Step 3: Build the authoritative environment matrix**

Document exact local and EdgeOne names:

- public Supabase URL/publishable key;
- `SUPABASE_SECRET_KEY`, JWT, SMTP;
- `VOLCANO_ARK_*` for AI text;
- `MIMO_*` for voice;
- optional private voice bucket;
- `NEXT_PUBLIC_APP_URL=https://sangzicare.husteread.com` in production.

Never place server secrets under `NEXT_PUBLIC_*`.

- [ ] **Step 4: Verify EdgeOne file contract**

Assert `buildCommand` is `npm run build`, output is `.next`, Node is 22.11.0, region stays `ap-guangzhou`, duration stays 60, and redirects remain in `edgeone.json`. Do not change region/duration without production evidence and explicit authorization.

- [ ] **Step 5: Scan tracked files for secret patterns and forbidden output**

Run:

```powershell
git ls-files -- '.env' '.env.*' '*.jks' '*.keystore' '*.apk' '*.aab'
rg -n "output\s*:\s*['\"]export|sb_secret_|sk-[A-Za-z0-9]{20,}" --glob '!docs/archive/**'
```

Expected: only `.env.example` is tracked; no real secret or static export match.

- [ ] **Step 6: Commit env/deploy documentation**

```powershell
git add .gitignore .env.example docs/ops docs/详解/项目结构详解.md
git commit -m "docs(ops): secure EdgeOne production configuration"
```

## Task 5: Push, observe EdgeOne deployment, and prove public production

**Files:**

- Create: `scripts/audit/production-smoke.mjs`
- Modify: `package.json`
- Modify: `docs/audits/performance-2026-07.md`
- Modify: `docs/ops/deploy-edgeone.md` with actual verified state.

- [ ] **Step 1: Implement a read-only public smoke script**

The script accepts `PRODUCTION_URL`, enforces HTTPS, and checks `/api/ping`, `/`, `/login`, static asset caching, security headers, redirect loops, and response timing. It must never submit login or mutate data.

- [ ] **Step 2: Test the smoke script against a local `next start`**

Run a production build/start on a free port and execute the smoke script. Expected: ping/login/root checks pass; HTTPS enforcement can be disabled only with explicit `ALLOW_HTTP_LOCAL=1`.

- [ ] **Step 3: Run final pre-push gates on Node 22**

Run:

```powershell
npm ci
npm run lint
npm run tsc
npm test
npm run build
npm run perf:budget
git diff --check
git status --short --branch
git push --dry-run origin main
```

Expected: all exit 0; only intended commits are ahead; no secrets/untracked artifacts.

- [ ] **Step 4: Push `main`**

Run: `git push origin main`

Expected: push succeeds and EdgeOne Git deployment starts automatically.

- [ ] **Step 5: Observe deployment without assuming success**

Use the EdgeOne control surface or public endpoint. Wait for the exact pushed commit to be active. If the platform reports a build failure, collect its log, fix in a new local commit, rerun gates, and push again.

- [ ] **Step 6: Verify DNS and TLS**

Run Google and Cloudflare DoH queries for `sangzicare.husteread.com`, then `curl -I` and certificate inspection. Expected: public A/AAAA/CNAME answer, valid certificate for the hostname, no NXDOMAIN, no TLS failure.

- [ ] **Step 7: Run production smoke and live MiMo smoke**

Run:

```powershell
$env:PRODUCTION_URL='https://sangzicare.husteread.com'
npm run smoke:production
```

Then exercise authenticated TTS/ASR through the deployed same-origin routes using a non-sensitive test account. Expected: 2xx MP3, valid Chinese transcript, no key in client bundles or logs.

- [ ] **Step 8: Record final performance and production evidence**

Update the audit with pushed commit, EdgeOne deployment identifier/time, DNS/TLS evidence, production metrics, known external limits, and smoke results.

- [ ] **Step 9: Commit only documentation changes produced after deployment and push once more**

```powershell
git add scripts/audit/production-smoke.mjs package.json package-lock.json docs/audits/performance-2026-07.md docs/ops/deploy-edgeone.md
git commit -m "test(prod): add EdgeOne deployment smoke evidence"
git push origin main
```
