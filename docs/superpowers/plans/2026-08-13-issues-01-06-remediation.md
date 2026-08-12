# GitHub Issues #1–#6 Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `requesting-code-review`, and `verification-before-completion`. Execute one Loop at a time; do not run parallel implementers against the shared worktree.

**Goal:** Fix all six open repository Issues in dependency order, preserving the full-stack Next.js/Supabase/Android online-shell architecture, and finish each Loop with focused tests, real Chromium endpoint validation, independent review, and an exact-scope local commit. Run Android thin-shell smoke once after all business Loops.

**Architecture:** Ordinary chat, AI murmur sharing, and SOS all write `oc_elder_care_messages` but keep distinct authorization and recipient policies. Server-side Route Handlers own actor validation and side effects; atomic multi-row operations use narrowly granted Supabase RPCs. Client UI consumes structured action results. Android remains an online WebView shell with no business JSBridge.

**Execution order:** `#1 → #6 → #3 → #2 → #4 → #5`.

**Tech stack:** Next.js 16 App Router, React 19, TypeScript strict, Zustand 5, CSS Modules, Vitest/Testing Library, Supabase PostgreSQL, Kotlin WebView, Android API 35 AVD.

---

## Stage 0: Freeze cross-Issue truth and baseline

**Files:**

- `docs/superpowers/specs/2026-08-13-issues-01-06-remediation-design.md`
- `docs/superpowers/plans/2026-08-13-issues-01-06-remediation.md`

- [x] Fetch all live Issues and verify that #1–#6 are the complete open set.
- [x] Audit current implementation, migrations, tests, Git state and Android environment with independent subagents.
- [x] Run baseline `npm test`; expected observed baseline is 956 passed, 1 skipped.
- [ ] Run `git diff --check`, U+FFFD scan and secret/path review for the two planning files.
- [ ] Stage only these two files and commit `docs(issues): plan dependency-ordered remediation`.

## Loop #1: Feed ASR transcript into an editable text draft

**Primary files:**

- `components/messages/VoiceRecorder.tsx`
- `app/messages/[id]/ChatDetail.tsx`
- focused tests beside the existing message component tests

- [ ] Analysis agent confirms current ASR and both send paths, then writes an acceptance checklist.
- [ ] Add a failing integration-style component test: successful transcript enters editable text input and edited content calls only `sendTextMessage`.
- [ ] Add failing cases for existing manual draft, blank transcript and ASR failure.
- [ ] Implement a typed transcript-draft callback and explicit voice/text send choices without duplicating send effects.
- [ ] Run only focused message component/store tests and `npm run tsc` if shared types changed.
- [ ] Main agent inspects the complete diff and focused test output.
- [ ] In real Chromium verify transcript review → editable draft → edit → text send UI, plus empty/failure feedback. Use deterministic runtime boundaries if live ASR credentials are unavailable and label them.
- [ ] Spec reviewer and code-quality reviewer approve; original implementer fixes any findings and reviewers recheck.
- [ ] Exact-stage Loop #1 files and commit `fix(messages): edit and send voice transcripts as text`.

## Loop #6: Surface and harden AI tool-call side effects

**Primary files:**

- `hooks/useAIChat.ts`
- `app/voice/page.tsx`
- `app/voice/page.module.css`
- `app/api/v1/ai/chat/route.ts`
- `lib/server/companion-tools.ts`
- `supabase/migrations/*` only if idempotency requires a schema/RPC change
- focused AI/voice/tool tests

- [ ] Analysis agent maps existing #6 implementation to every live acceptance item and explicitly excludes obsolete `intentHandlers` work.
- [ ] Add failing tests proving the hook preserves structured actions and the page renders succeeded/skipped/failed states.
- [ ] Add a failing cross-layer Route Handler test using the real tool executor boundary, covering consent, refusal, no active family and tool failure.
- [ ] Implement client-safe action types, visible accessible feedback, redacted structured logs and retry idempotency.
- [ ] Run focused AI/voice/tool/SQL contract tests only.
- [ ] Main agent audits authorization, content privacy, RPC grants and duplicate-send behavior.
- [ ] In real Chromium exercise voice → AI result → action feedback. If target MiMo/Supabase is unavailable, separately run deterministic tool-response scenarios and retain the missing live-environment gate.
- [ ] Spec and code-quality reviewers approve after any fixes.
- [ ] Exact-stage Loop #6 files and commit `fix(ai): expose reliable companion action results`.

## Loop #3: Deliver SOS messages atomically to authorized family

**Primary files:**

- `app/api/v1/emergency/trigger/route.ts`
- `components/home/ElderHomeView.tsx`
- `app/medicine/page.tsx`
- shared SOS client hook/helper if introduced
- one new Supabase migration for the atomic idempotent RPC
- focused emergency Route/UI/SQL tests

- [ ] Analysis agent validates both UI entry points, current role checks, recipient permissions and message schema.
- [ ] Add failing route/RPC contract tests for elder authorization, authorized recipients, zero recipients, idempotency and rollback.
- [ ] Add failing UI tests for pending duplicate prevention, truthful success count, no-contact state and retry.
- [ ] Implement one server-side RPC that records the call and inserts one `system/text` message per eligible recipient in one transaction.
- [ ] Unify both SOS entry points behind the same structured client result; never claim notification on partial/zero success.
- [ ] Run focused emergency tests and migration contract checks only.
- [ ] Main agent inspects grants, `search_path`, actor derivation, request id uniqueness and message visibility.
- [ ] In real Chromium verify both SOS buttons, confirmation, pending state, truthful success/no-contact/failure/retry UI. Use test backend states where target accounts are unavailable and label them.
- [ ] Spec and code-quality reviewers approve after any fixes.
- [ ] Exact-stage Loop #3 files and commit `fix(emergency): notify authorized family atomically`.

## Loop #2: Add private contact aliases and stable pinning

**Primary files:**

- one Supabase migration for owner-scoped contact preferences
- new `app/api/v1/messages/contacts/**` or existing family/messages Route Handler extension
- `stores/messageStore.ts`
- `app/messages/page.tsx`
- `app/messages/[id]/ChatDetail.tsx`
- reusable Dialog/ActionSheet component and focused tests

- [ ] Analysis agent confirms binding identity, owner/peer orientation and all contact projections.
- [ ] Add failing pure tests for display-name fallback and stable pinned/recent/id sorting.
- [ ] Add failing Route Handler tests for owner isolation, active-bind validation, persistence, alias clearing and pin toggling.
- [ ] Add failing interaction tests for long press, scroll cancellation, short-click navigation and visible keyboard-accessible menu.
- [ ] Implement private preferences table/API, store projection and shared accessible operation dialog.
- [ ] Run focused contact/store/route tests only.
- [ ] Main agent inspects RLS/grants, authorization and avoidance of global-name mutation.
- [ ] In real Chromium verify touch long press, visible more button, edit/clear alias, pin/unpin, refresh persistence, list/chat-title consistency and scroll behavior.
- [ ] Spec and code-quality reviewers approve after any fixes.
- [ ] Exact-stage Loop #2 files and commit `feat(messages): persist private contact preferences`.

## Loop #4: Constrain long AI replies to an internal scroller

**Primary files:**

- `app/voice/page.tsx`
- `app/voice/page.module.css`
- focused voice layout tests or Playwright geometry fixture

- [ ] Analysis agent measures the active route structure after Loop #6 and identifies the sole intended scroll container.
- [ ] Add a focused failing CSS/DOM contract test for bounded reply content and fixed controls.
- [ ] Implement flex/min-height/max-height/overflow/overscroll rules; keep short replies naturally sized.
- [ ] Run focused voice tests only.
- [ ] Main agent checks reduced motion, large text, safe areas and nested-scroll behavior.
- [ ] In real Chromium verify short and long replies at portrait 360×640, landscape, and enlarged font. Capture geometry showing response can reach its end while microphone/end controls remain in viewport.
- [ ] Spec and code-quality reviewers approve after any fixes.
- [ ] Exact-stage Loop #4 files and commit `fix(voice): keep long replies independently scrollable`.

## Loop #5: Preserve typed health drafts and save them transactionally

**Primary files:**

- `app/health/input/page.tsx`
- `app/api/v1/health/records/route.ts` or a dedicated batch child route
- `stores/healthStore.ts`
- shared accessible confirmation dialog
- `android/app/src/main/java/**/MainActivity.kt`
- one Supabase migration for transactional batch insertion
- focused health/route/Android tests

- [ ] Analysis agent specifies per-type draft shape, dirty-state rules, care-recipient boundary and batch payload limits.
- [ ] Add failing tests proving values, notes, method and voice state remain independent across tabs and care recipients.
- [ ] Add failing validation/route tests proving one bad draft causes zero writes and a valid batch commits all records.
- [ ] Add failing navigation tests for page back, cancel, refresh and the cancelable Android back event.
- [ ] Implement typed draft map, review/confirm flow, max-five atomic batch RPC and shared dirty confirmation.
- [ ] Update Android hardware back to dispatch a cancelable DOM event before WebView history navigation, without adding a business JSBridge.
- [ ] Run focused health/route/Android unit tests only.
- [ ] Main agent inspects transaction semantics, validation parity, recipient isolation and WebView security.
- [ ] In real Chromium enter multiple tabs, navigate away/cancel/continue, use browser history, correct an invalid tab and save; verify success clears dirty state and no partial-save UI appears. Defer the Android hardware-back adapter itself to final thin-shell smoke.
- [ ] Spec and code-quality reviewers approve after any fixes.
- [ ] Exact-stage Loop #5 files and commit `feat(health): save multi-type drafts atomically`.

## Final unified verification

- [ ] Ask a final architecture/test subagent to audit all six Issue acceptance matrices against HEAD.
- [ ] Run `npm run lint`; require exit 0.
- [ ] Run `npm run tsc`; require exit 0.
- [ ] Run `npm test`; require all non-opt-in tests pass.
- [ ] Run `npm run build`; require exit 0 and `.next` output.
- [ ] Run Android unit tests, lint and Debug build with JDK 17.
- [ ] Install the final Debug APK on API 35 AVD and run one thin-shell smoke for startup, local/production URL policy, microphone permission, system back and background/resume; business #1–#6 regression remains the real Chromium pass.
- [ ] Run `git diff --check`, U+FFFD scan, tracked `.env`/secret/keystore/APK scan and forbidden-architecture scan.
- [ ] Update live `docs/详解/功能详解.md` and any affected architecture/ops docs to match implementation, then exact-stage and locally commit the final evidence.
- [ ] Keep remote Issues open and do not push, merge or publish unless separately authorized.
- [ ] Mark the goal complete only when every locally achievable requirement is proven; report Release/physical-device/target-environment gates separately if their external prerequisites remain unavailable.
