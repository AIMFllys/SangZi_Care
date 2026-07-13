# Sangzi Deep Iteration Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coordinate the existing database-prefix work, mobile UI rebuild, Xiaomi MiMo voice migration, EdgeOne performance/deployment, and signed Android APK into independently verified local commits and a proven production release.

**Architecture:** Execute four detailed subsystem plans in dependency order. UI shell and route geometry precede consumer voice wiring; MiMo precedes production performance/deployment; the Android Release APK is accepted only after the public EdgeOne hostname works. Every stage has a narrow commit boundary and must pass its own tests before the next stage begins.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, Zustand, Supabase, Xiaomi MiMo, EdgeOne Pages/Makers, Android/Kotlin WebView.

---

## Detailed plans

1. `docs/superpowers/plans/2026-07-13-mobile-ui-shell-and-pages.md`
2. `docs/superpowers/plans/2026-07-13-mimo-voice-migration.md`
3. `docs/superpowers/plans/2026-07-13-edgeone-performance-production.md`
4. `docs/superpowers/plans/2026-07-13-android-online-shell-apk.md`

## Task 0: Preserve and commit the pre-existing `oc_` database-prefix migration

**Files:**

- Existing modified `app/api/v1/{ai,auth,emergency,family,health,medicine,messages,radio,users}/**`.
- Existing modified `components/voice/VoicePanel.tsx`, `lib/realtimeSubscriptions.ts`, tests, store, generated Supabase types, and live docs.
- Existing untracked `docs/ops/oc-table-prefix.md`.

- [ ] **Step 1: Confirm scope without staging**

Run `git diff --stat`, `git diff --name-only`, and `git status --short`. Expected: only the known `oc_` migration files plus later plan documents; no env, key, media, APK, or unrelated user file.

- [ ] **Step 2: Review every code replacement for consistency**

Run:

```powershell
rg -n "\.from\('(users|health_records|medication_plans|medication_records|elder_care_messages|elder_family_binds|emergency_calls|health_broadcasts|broadcast_play_history|ai_conversations)'\)" app lib stores components
rg -n "Tables<'(users|health_records|medication_plans|medication_records|elder_care_messages|elder_family_binds|emergency_calls|health_broadcasts|broadcast_play_history|ai_conversations)'" app lib stores components
```

Expected: no active runtime reference to old physical table names. Text in migration history/archive is not rewritten.

- [ ] **Step 3: Verify generated type/table parity**

Compare `types/supabase.ts` table keys to runtime `.from('oc_*')` values and `lib/realtimeSubscriptions.ts`. Every runtime table must have a matching generated type, foreign-key relation, and test expectation.

- [ ] **Step 4: Remove only real whitespace errors**

Run `git diff --check`. Preserve intentional Chinese Markdown line breaks only when required; eliminate accidental trailing whitespace and extra EOF blank lines.

- [ ] **Step 5: Run the full current baseline**

Run: `npm run lint && npm run tsc && npx vitest run && npm run build`

Expected: all exit 0. Existing warnings must be recorded; no failure is accepted because the diff is “pre-existing”.

- [ ] **Step 6: Stage only the `oc_` migration group and inspect staged diff**

Use explicit paths. Run `git diff --cached --name-only`, `git diff --cached --check`, and scan `git diff --cached` for secrets. Expected: no plan/UI/voice/Android implementation file enters this commit.

- [ ] **Step 7: Commit the preserved work**

```powershell
git commit -m "fix(db): align runtime tables with oc prefix"
```

## Task 1: Execute the mobile UI plan completely

**Files:** all files enumerated in `2026-07-13-mobile-ui-shell-and-pages.md`.

- [ ] **Step 1: Execute Tasks 1–3 of the UI plan**

Expected: route-aware shell, level TabBar, safe-area model, hardened tokens/primitives, and restored zoom. Run focused tests and commit after every plan task.

- [ ] **Step 2: Execute Tasks 4–7 of the UI plan**

Expected: both home roles, chat, medicine, health, settings, family detail, radio, login, onboarding, and voice layout satisfy the new shell without placeholder interactions.

- [ ] **Step 3: Execute Task 8 responsive audit**

Expected: six portrait sizes plus landscape, no root scroll on short pages, one intentional scroller on long pages, no button/fixed-chrome overlap, and identical TabBar item rectangles.

- [ ] **Step 4: Run the UI stage gate**

Run: `npm run lint && npm run tsc && npx vitest run && npm run build`.

Expected: all exit 0; UI audit document contains before/after evidence; no generated PNG is committed.

## Task 2: Execute the Xiaomi MiMo voice plan completely

**Files:** all files enumerated in `2026-07-13-mimo-voice-migration.md`.

- [ ] **Step 1: Execute server client and route boundary tasks**

Expected: real MiMo client, strict WAV/MP3 and 5MB validation, 45-second abort, bounded retry, no placeholder audio/text, no sensitive logging.

- [ ] **Step 2: Execute WAV recorder and hook tasks**

Expected: PCM WAV capture, awaitable stop, MiMo-first capability, abortable TTS, user speed, deterministic tests.

- [ ] **Step 3: Execute page/consumer integration tasks**

Expected: real `/voice` state machine, confirmed health voice input, stored chat audio, medicine TTS, persisted/played radio audio, no fake success.

- [ ] **Step 4: Configure `.env.local` securely**

Write the user-provided key only as `MIMO_API_KEY` in ignored `.env.local`. Never print or stage it. Verify with `git check-ignore` and tracked secret scans.

- [ ] **Step 5: Run deterministic and paid live voice gates**

Run `npm run test:voice`, then one opt-in `RUN_MIMO_E2E=1` TTS→ASR round trip. Expected: deterministic suite and live keyword assertion PASS.

- [ ] **Step 6: Run the voice stage gate**

Run: `npm run lint && npm run tsc && npm test && npm run build`.

Expected: all exit 0; no `doubao` voice level or placeholder response remains; Ark text-AI configuration remains intact.

## Task 3: Execute performance optimization and EdgeOne production deployment

**Files:** all files enumerated in `2026-07-13-edgeone-performance-production.md`.

- [ ] **Step 1: Capture Node 22 baseline and apply measured optimizations**

Expected: budget tool, production runtime metrics, reduced compositing/optional initial work, and no route budget regression.

- [ ] **Step 2: Apply cache/security/env safeguards**

Expected: personalized data and audio no-store, EdgeOne body/time limits enforced, `.env*` and signing artifacts ignored, `.next` full-stack output retained.

- [ ] **Step 3: Run all pre-push gates**

Run `npm ci`, lint, tsc, all tests, build, performance budget, `git diff --check`, secret scan, and `git push --dry-run` under Node 22.

- [ ] **Step 4: Push and observe exact commit deployment**

Push `main` as explicitly requested. Do not infer deployment from a successful push; verify EdgeOne reports or serves the exact commit.

- [ ] **Step 5: Prove public production**

Expected: public DNS answer, valid TLS, `/api/ping`, root/login, authenticated app/API, deployed MiMo TTS/ASR, cache/security headers, and performance smoke all PASS.

## Task 4: Execute Android online-shell and signed APK plan

**Files:** all files enumerated in `2026-07-13-android-online-shell-apk.md`.

- [ ] **Step 1: Restore wrapper/resources and variant URL policy**

Expected: Gradle 8.2.1/JDK17 build, vector launcher, exact production URL, debug localhost override, Release cleartext false.

- [ ] **Step 2: Implement navigation and microphone security**

Expected: exact-origin WebView, external links/system dialer, blocked unsafe schemes, no JavaScript native speech bridge, origin-scoped audio capture.

- [ ] **Step 3: Configure ignored stable Release signing**

Generate and preserve the local keystore outside Git. Build Debug and signed Release; verify both.

- [ ] **Step 4: Install and run device/emulator matrix**

Expected: production domain loads; first/refused/retried microphone permissions work; ASR→AI→TTS, health, chat, radio, back, restart, and offline recovery pass in Release/R8.

- [ ] **Step 5: Record APK identity**

Record source commit, package/version, signer SHA-256, APK SHA-256, file size, and local artifact path. Do not commit the APK or keystore.

## Task 5: Perform requirement-by-requirement completion audit and final push

**Files:** `docs/audits/mobile-ui-2026-07.md`, `docs/audits/performance-2026-07.md`, `docs/ops/deploy-edgeone.md`, `android/README.md`, and `docs/详解/*` for final evidence corrections.

- [ ] **Step 1: Audit every explicit user requirement**

Map each requested item to authoritative evidence: route screenshots/geometry, MiMo live result, performance budgets, EdgeOne public responses, Git commits/push, signed APK verification/install.

- [ ] **Step 2: Search for forbidden regressions**

Expected no match in active sources for:

- `output: 'export'`;
- real key prefixes or tracked `.env`;
- old Python `backend/` business code;
- static `out/` APK copy flow;
- placeholder TTS/ASR text/audio;
- center TabBar translation;
- Android cleartext Release or broad JS bridge.

- [ ] **Step 3: Run final web and Android gates from clean inputs**

Run Node 22 `npm ci`, lint, tsc, full tests, build, performance budget, production smoke, Android unit/lint/Debug, signed Release build, `apksigner`, `aapt`, and install smoke.

- [ ] **Step 4: Inspect Git state and commit history**

Expected: clean worktree except ignored local secrets/artifacts; each stage is a logical local commit; no accidental binary or secret.

- [ ] **Step 5: Push final documentation/fixes and recheck deployment**

Run `git push origin main`, wait for exact final commit, repeat public smoke and APK production URL startup.

- [ ] **Step 6: Mark the goal complete only after all evidence passes**

If DNS, EdgeOne access, Supabase/storage configuration, device availability, or signing fails, keep the goal active and continue all other meaningful work. Do not redefine completion around a Debug build or local-only web test.
