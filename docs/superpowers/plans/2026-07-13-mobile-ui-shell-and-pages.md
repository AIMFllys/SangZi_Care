# Mobile UI Shell and Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a route-aware mobile shell with a fixed, level TabBar and refactor every page so core actions fit common phone viewports while only intentional content regions scroll.

**Architecture:** Add a pure pathname-to-shell-mode classifier, let `ClientShell` own viewport height and scrolling, and make page modules describe content rather than recreate the app shell. Shared tokens and primitives establish one geometry system; detail and immersive routes hide the global TabBar. Page work proceeds by domain so every commit is independently renderable and screenshot-verifiable.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, CSS Modules, Zustand 5, Vitest, Testing Library, Playwright CLI for visual audit.

---

## File map

**Create**

- `lib/shellMode.ts` — pure route classification.
- `lib/__tests__/shellMode.test.ts` — route mode coverage.
- `components/providers/ClientShell.module.css` — viewport and scroll ownership.
- `components/layout/__tests__/TabBar.test.tsx` — geometry/route semantics.
- `components/providers/__tests__/ClientShell.test.tsx` — shell mode wiring.
- `docs/audits/mobile-ui-2026-07.md` — before/after measurements and screenshot checklist.

**Modify**

- `app/layout.tsx` — restore zoom and simplify the root wrapper.
- `components/providers/ClientShell.tsx` — compute mode and own the app viewport.
- `components/layout/TabBar.tsx` and `TabBar.module.css` — identical five-item geometry.
- `components/layout/PageHeader.tsx` and `PageHeader.module.css` — primary/detail variants.
- `components/ui/{Button,Button.module.css,Card,Card.module.css,Input.module.css,IconButton.module.css}` — resilient primitives.
- `styles/{globals.css,elder-theme.css,family-theme.css}` — tokens, contrast, accessibility fallbacks.
- All page TSX/CSS under `app/` and affected business components under `components/home`, `components/messages`, `components/medicine`, and `components/health`.

## Task 1: Classify routes and give the shell sole viewport ownership

**Files:**

- Create: `lib/shellMode.ts`
- Create: `lib/__tests__/shellMode.test.ts`
- Create: `components/providers/ClientShell.module.css`
- Create: `components/providers/__tests__/ClientShell.test.tsx`
- Modify: `components/providers/ClientShell.tsx`
- Modify: `styles/globals.css`

- [ ] **Step 1: Write the failing route-classifier test**

```ts
import { describe, expect, it } from 'vitest';
import { getShellMode } from '@/lib/shellMode';

describe('getShellMode', () => {
  it.each([
    ['/', 'tabbed'],
    ['/messages', 'tabbed'],
    ['/medicine', 'tabbed'],
    ['/health', 'tabbed'],
    ['/settings', 'tabbed'],
    ['/radio', 'tabbed'],
    ['/messages/family-1', 'detail'],
    ['/medicine/history', 'detail'],
    ['/health/input', 'detail'],
    ['/family/family-1', 'detail'],
    ['/settings/profile', 'detail'],
    ['/settings/bind', 'detail'],
    ['/settings/accessibility', 'detail'],
    ['/login', 'immersive'],
    ['/onboarding', 'immersive'],
    ['/voice', 'immersive'],
  ] as const)('%s is %s', (pathname, mode) => {
    expect(getShellMode(pathname)).toBe(mode);
  });
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `npx vitest run lib/__tests__/shellMode.test.ts`

Expected: FAIL with an import error for `@/lib/shellMode`.

- [ ] **Step 3: Implement the pure classifier**

```ts
export type ShellMode = 'tabbed' | 'detail' | 'immersive';

const IMMERSIVE = ['/login', '/onboarding', '/voice'] as const;
const DETAIL = [
  '/messages/',
  '/medicine/history',
  '/health/input',
  '/family/',
  '/settings/profile',
  '/settings/bind',
  '/settings/accessibility',
] as const;

export function getShellMode(pathname: string): ShellMode {
  if (IMMERSIVE.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return 'immersive';
  }
  if (DETAIL.some((route) => pathname === route || pathname.startsWith(route))) {
    return 'detail';
  }
  return 'tabbed';
}
```

- [ ] **Step 4: Write a failing `ClientShell` wiring test**

Mock `next/navigation`, `AuthProvider`, `ErrorBoundary`, and `TabBar`; render at `/messages/family-1`; assert the main element has `data-shell-mode="detail"` and the TabBar mock is absent.

```tsx
expect(screen.getByRole('main')).toHaveAttribute('data-shell-mode', 'detail');
expect(screen.queryByTestId('tabbar')).not.toBeInTheDocument();
```

- [ ] **Step 5: Run the shell test and verify it fails**

Run: `npx vitest run components/providers/__tests__/ClientShell.test.tsx`

Expected: FAIL because the current shell always mounts `TabBar` and has no mode attribute.

- [ ] **Step 6: Wire mode ownership into `ClientShell`**

Use `usePathname()` and `getShellMode(pathname)`. Render:

```tsx
<div className={styles.shell} data-shell-mode={mode}>
  <main className={styles.main} data-shell-mode={mode}>{children}</main>
  {mode === 'tabbed' && <TabBar />}
</div>
```

The CSS contract is:

```css
.shell { height: 100dvh; min-height: 0; overflow: hidden; }
.main { min-height: 0; overflow: hidden; }
.main[data-shell-mode='tabbed'] {
  height: calc(100dvh - var(--tabbar-content-height) - var(--safe-bottom));
}
.main[data-shell-mode='detail'],
.main[data-shell-mode='immersive'] { height: 100dvh; }
```

Remove global `.page-content` minimum height and bottom padding. Keep `.device-wrapper` at `height: 100dvh; overflow: hidden`.

- [ ] **Step 7: Verify tests and typecheck**

Run: `npx vitest run lib/__tests__/shellMode.test.ts components/providers/__tests__/ClientShell.test.tsx && npm run tsc`

Expected: all new tests PASS; TypeScript exits 0.

- [ ] **Step 8: Commit the shell foundation**

```powershell
git add lib/shellMode.ts lib/__tests__/shellMode.test.ts components/providers/ClientShell.tsx components/providers/ClientShell.module.css components/providers/__tests__/ClientShell.test.tsx styles/globals.css
git commit -m "feat(ui): add route-aware mobile app shell"
```

## Task 2: Make all five TabBar items level and safe-area correct

**Files:**

- Create: `components/layout/__tests__/TabBar.test.tsx`
- Modify: `components/layout/TabBar.tsx`
- Modify: `components/layout/TabBar.module.css`
- Modify: `styles/globals.css`

- [ ] **Step 1: Write failing semantic and geometry-contract tests**

Render Elder and Family roles. Assert five links, one `aria-current`, and no `center`-specific class or prop in rendered items. Export a shared `TAB_ITEMS` builder so labels and destinations remain testable without reading JSX internals.

```tsx
const links = screen.getAllByRole('link');
expect(links).toHaveLength(5);
expect(screen.getByRole('link', { name: '功能' })).not.toHaveClass('tabCenter');
expect(screen.getByRole('link', { name: '看板' })).toHaveAttribute('aria-current', 'page');
```

- [ ] **Step 2: Run the test and verify the center-class failure**

Run: `npx vitest run components/layout/__tests__/TabBar.test.tsx`

Expected: FAIL because the current middle item renders `tabCenter` and enlarged geometry.

- [ ] **Step 3: Remove the center geometry branch**

Delete `center`, `CENTER_ICON_SIZE`, `tabCenter`, `tabCenterIcon`, and `tabCenterLabel`. Use one item markup:

```tsx
<Link className={`${styles.tabItem} ${active ? styles.tabActive : ''}`}>
  <span className={styles.tabIcon} aria-hidden="true">{tab.icon}</span>
  <span className={styles.tabLabel}>{tab.label}</span>
</Link>
```

- [ ] **Step 4: Replace flex/end alignment with a fixed Grid**

```css
.tabBar {
  position: fixed;
  inset: auto 0 0 50%;
  transform: translateX(-50%);
  width: min(100%, 480px);
  height: calc(var(--tabbar-content-height) + var(--safe-bottom));
  padding: 0 8px var(--safe-bottom);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: stretch;
}
.tabItem {
  min-width: 0;
  min-height: var(--tabbar-content-height);
  display: grid;
  grid-template-rows: 28px 16px;
  place-content: center;
  gap: 3px;
  padding: 6px 2px 5px;
}
.tabIcon { width: 28px; height: 28px; margin-inline: auto; }
```

Set `--tabbar-content-height: 64px`; do not include safe-area padding inside it.

- [ ] **Step 5: Verify unit tests and run a browser geometry probe**

Run unit tests, then at 390×844 evaluate every `nav a` bounding rectangle. Expected: all five links have identical rounded `top`, `bottom`, and `height`; the nav bottom equals 844.

- [ ] **Step 6: Commit the level TabBar**

```powershell
git add components/layout/TabBar.tsx components/layout/TabBar.module.css components/layout/__tests__/TabBar.test.tsx styles/globals.css
git commit -m "fix(ui): align bottom navigation on one baseline"
```

## Task 3: Harden tokens, primitives, headers, and accessibility

**Files:**

- Modify: `app/layout.tsx`
- Modify: `styles/globals.css`
- Modify: `styles/elder-theme.css`
- Modify: `styles/family-theme.css`
- Modify: `components/ui/Button.tsx`
- Modify: `components/ui/Button.module.css`
- Modify: `components/ui/Card.tsx`
- Modify: `components/ui/Card.module.css`
- Modify: `components/ui/Input.module.css`
- Modify: `components/ui/IconButton.module.css`
- Modify: `components/layout/PageHeader.tsx`
- Modify: `components/layout/PageHeader.module.css`
- Modify: existing primitive tests or create focused tests beside each component.

- [ ] **Step 1: Add failing keyboard and variant tests**

For clickable `Card`, fire Enter and Space and assert `onClick` fires once per key. For `PageHeader variant="detail"`, assert left/center/right slots exist and title remains in the center cell.

- [ ] **Step 2: Verify the tests fail**

Run: `npx vitest run components/ui components/layout`

Expected: Card keyboard test and PageHeader variant test FAIL.

- [ ] **Step 3: Implement resilient primitives**

- `Button`: `min-width: 0`, flexible content, 48/52/56px size scale, safe wrapping on ≤350px.
- `Card`: implement Enter/Space keyboard activation when `onClick` exists.
- `Input`: `min-width: 0`; suffix may shrink only its label, never the input.
- `PageHeader`: add `variant: 'primary' | 'detail'`; detail layout uses `48px minmax(0,1fr) 48px`.
- Remove `userScalable: false` and `maximumScale: 1` from viewport metadata.

- [ ] **Step 4: Add contrast and user-preference CSS**

Introduce separate `--accent-action` and `--accent-decoration`. Use an Elder action color dark enough for white text. Add solid fallbacks for reduced transparency and higher-contrast borders for `prefers-contrast: more`.

- [ ] **Step 5: Run primitive tests, axe-free semantic checks, lint, and typecheck**

Run: `npx vitest run components/ui components/layout && npm run lint && npm run tsc`

Expected: exit 0; no warnings in touched files.

- [ ] **Step 6: Commit the design-system hardening**

```powershell
git add app/layout.tsx styles components/ui components/layout/PageHeader.tsx components/layout/PageHeader.module.css
git commit -m "feat(ui): harden mobile tokens and accessible controls"
```

## Task 4: Make both home pages fit the available viewport

**Files:**

- Modify: `components/home/ElderHomeView.tsx`
- Modify: `components/home/FamilyHomeView.tsx`
- Modify: `app/page.module.css`
- Add or modify home component tests.

- [ ] **Step 1: Write failing behavior tests**

Assert the Elder page has no inert “上滑更多功能” text, its voice control is a native button, and SOS invokes the real emergency action adapter rather than routing to settings. Assert Family summary cards remain links/buttons with accessible names.

- [ ] **Step 2: Run and observe failures**

Run: `npx vitest run components/home`

Expected: FAIL for the inert hint, non-native voice control, and settings redirect.

- [ ] **Step 3: Refactor Elder layout**

Use four CSS grid rows: greeting, compact time card, flexible voice region, SOS. Voice diameter is `clamp(132px, 24dvh, 176px)`. On `max-height: 700px`, reduce decorative rings and gaps while keeping voice/SOS touch targets.

- [ ] **Step 4: Refactor Family layout**

Make elder tabs horizontally scrollable, summary cards `minmax(0, 1fr)`, and the trend card the only flexible content. Hide secondary chart labels on short screens, not the primary status.

- [ ] **Step 5: Verify 320×568 through 430×932 screenshots**

Expected: no root scroll; all primary actions appear above TabBar; no button overlaps or horizontal clipping.

- [ ] **Step 6: Commit home pages**

```powershell
git add components/home app/page.module.css
git commit -m "feat(ui): fit elder and family homes to phone viewports"
```

## Task 5: Rebuild chat as a standard mobile conversation

**Files:**

- Modify: `app/messages/page.tsx`
- Modify: `app/messages/page.module.css`
- Modify: `app/messages/[id]/ChatDetail.tsx`
- Modify: `app/messages/[id]/page.module.css`
- Modify: `components/messages/MessageList.tsx`
- Modify: `components/messages/MessageList.module.css`
- Modify: `components/messages/ChatBubble.tsx`
- Modify: `components/messages/ChatBubble.module.css`
- Modify: `components/messages/VoiceRecorder.tsx`
- Modify: `components/messages/VoiceRecorder.module.css`
- Modify: existing message tests.

- [ ] **Step 1: Write failing chat-layout behavior tests**

Assert default input mode is text, switching to voice exposes one “按住说话” control, and the old cancel/send panel is absent while idle. Assert a voice bubble with short content has no forced minimum width class.

- [ ] **Step 2: Run tests and verify current behavior fails**

Run: `npx vitest run app/messages components/messages`

Expected: FAIL because current default is voice and renders the expanded recorder.

- [ ] **Step 3: Implement the three-row conversation shell**

```css
.page { height: 100%; min-height: 0; display: grid; grid-template-rows: auto minmax(0,1fr) auto; }
.messageScroller { min-height: 0; overflow-y: auto; overscroll-behavior-y: contain; }
.composer { padding: 8px var(--page-gutter) calc(8px + var(--safe-bottom)); }
```

Use detail shell mode, so global TabBar is absent. Add `scroll-padding-bottom` for the composer and a `visualViewport.resize` effect that writes `--chat-viewport-height` while the page is mounted; remove the listener and CSS property on unmount. The page height uses `var(--chat-viewport-height, 100dvh)` so Android keyboard resizing is deterministic.

- [ ] **Step 4: Replace the idle recorder with an equal-height press control**

Idle voice UI is a 52–56px button. During recording, show an overlay/HUD with duration and cancel instruction. After release, render uploading/transcribing state; do not show independent cancel/send buttons until a transcript exists and user confirmation is actually required.

- [ ] **Step 5: Make bubbles width-safe**

Set `max-width: min(78%, 30rem); min-width: 0; overflow-wrap: anywhere`. Preserve 48px play target without forcing a 200px bubble.

- [ ] **Step 6: Verify text mode, voice mode, long bubbles, and keyboard screenshots**

Expected at 320×568 and 390×844: header and composer visible; only the message list scrolls; no global TabBar; no horizontal overflow.

- [ ] **Step 7: Commit the chat redesign**

```powershell
git add app/messages components/messages
git commit -m "feat(ui): rebuild chat for mobile conversation flow"
```

## Task 6: Compact medicine and health flows

**Files:**

- Modify: `app/medicine/page.tsx` and `page.module.css`
- Modify: `app/medicine/history/page.tsx` and `page.module.css`
- Modify: `components/medicine/*`
- Modify: `app/health/page.tsx` and `page.module.css`
- Modify: `app/health/input/page.tsx` and `page.module.css`
- Modify: `components/health/*`
- Modify: corresponding tests.

- [ ] **Step 1: Add failing tests for real controls and compact mode selectors**

Assert medicine date arrows change selected date or are absent; defer and SOS controls call real handlers. Assert health input renders a compact two-option segmented control and optional details start collapsed.

- [ ] **Step 2: Run domain tests and verify failure**

Run: `npx vitest run app/medicine components/medicine app/health components/health`

Expected: failures for inert controls and expanded layout assumptions.

- [ ] **Step 3: Implement medicine current-item focus**

Display one current medication card with a 52–56px primary action and 48px secondary action. Multiple upcoming items live in a scrollable timeline. Detail/history routes use detail header and no TabBar.

- [ ] **Step 4: Implement health grid and compact input**

Use `grid-template-columns: repeat(2, minmax(0, 1fr))`, falling to one column only under 340px or 150% text. Replace the two 106px mode buttons with a 48–52px segmented control. Keep optional notes/symptoms collapsed; make save actions sticky inside the detail shell.

- [ ] **Step 5: Verify tests and viewport matrix**

Expected: medicine current action fits 360×640; health dashboard short state does not root-scroll; health input has exactly one content scroller and no TabBar.

- [ ] **Step 6: Commit medicine and health**

```powershell
git add app/medicine components/medicine app/health components/health
git commit -m "feat(ui): compact medicine and health mobile flows"
```

## Task 7: Repair settings, family detail, radio, login, onboarding, and voice layout

**Files:**

- Modify: `app/settings/**/*.tsx` and `app/settings/**/*.module.css`
- Modify: `app/family/[id]/FamilyDetailClient.tsx` and `page.module.css`
- Modify: `app/radio/page.tsx` and `page.module.css`
- Modify: `app/login/page.tsx` and `login.module.css`
- Modify: `app/onboarding/page.tsx` and `page.module.css`
- Modify: `app/voice/page.tsx` and `page.module.css` (layout only; voice behavior is in the MiMo plan)
- Modify: affected tests.

- [ ] **Step 1: Add failing structure tests**

Assert no settings page renders literal `device-wrapper` or `page-content` classes. Add a static CSS-module contract test that every `styles.name` used by `FamilyDetailClient` exists in its CSS file. Assert radio search has a labeled input and submit action.

- [ ] **Step 2: Run and verify failures**

Run: `npx vitest run app/settings app/family app/radio app/login app/onboarding app/voice`

Expected: settings nested-shell and family CSS contract failures.

- [ ] **Step 3: Remove duplicate shells from settings**

Every settings page returns one page container. Primary settings remains tabbed; profile, bind, and accessibility use detail mode. Use a single page gutter and responsive switch/range rows.

- [ ] **Step 4: Rebuild all FamilyDetail CSS classes**

Define every referenced class: header, action row, sections, health grid, medication progress, conversations, info rows, loading/empty/error. Use real buttons/links and `minmax(0,1fr)` in every grid.

- [ ] **Step 5: Wire every radio visual affordance**

Search submits the trimmed query, category chips update the selected category and refetch, and play/pause controls invoke the radio store. The player is part of the tabbed main grid and reserves its own row; it may not float over the last list item or TabBar. The MiMo plan supplies the real audio URL behavior without changing this geometry.

- [ ] **Step 6: Fit immersive pages without global padding**

Login, onboarding, and `/voice` occupy 100% of the immersive shell. Add short-height rules and safe-area padding once. Settings gear on `/voice` must navigate or be removed until implemented.

- [ ] **Step 7: Run tests and visual audit**

Expected: all domain tests PASS; no missing CSS class; no duplicate root shell; short immersive pages have document height equal to viewport.

- [ ] **Step 8: Commit remaining pages**

```powershell
git add app/settings app/family app/radio app/login app/onboarding app/voice
git commit -m "feat(ui): finish responsive mobile page layouts"
```

## Task 8: Run the full responsive and accessibility audit

**Files:**

- Create: `docs/audits/mobile-ui-2026-07.md`
- Modify: the exact focused test file for each geometry regression found during the audit before applying its fix.

- [ ] **Step 1: Run all unit and component tests**

Run: `npx vitest run`

Expected: all tests PASS and no new React `act(...)` warnings.

- [ ] **Step 2: Run lint and typecheck**

Run: `npm run lint && npm run tsc`

Expected: both exit 0; no warnings in touched files.

- [ ] **Step 3: Capture all route states at the viewport matrix**

Use Playwright CLI with fake authenticated user/API routes. Capture both roles and all current routes at 320×568, 360×640, 375×667, 390×844, 430×932, and 480×960, plus 844×390 landscape.

- [ ] **Step 4: Assert geometry, not only screenshots**

For every state record root `scrollHeight`, content scroller count, horizontal `scrollWidth`, TabBar link rectangles, and visible button rectangles. Expected:

- Short pages: root `scrollHeight <= innerHeight + 1`.
- Scroll pages: exactly one intentional `overflow-y: auto` region.
- All visible buttons are inside the viewport/content scroller and outside fixed chrome.
- TabBar five items have identical top/bottom/height.
- No horizontal overflow at any width.

- [ ] **Step 5: Document before/after evidence**

Record the original 88px excess, 26px SOS overlap, 48px medicine overlap, and the post-fix measurements in `docs/audits/mobile-ui-2026-07.md`. Do not commit generated PNGs.

- [ ] **Step 6: Run the production build**

Run: `npm run build`

Expected: exit 0; output remains `.next`; no `output: 'export'`.

- [ ] **Step 7: Commit the UI audit**

```powershell
git add docs/audits/mobile-ui-2026-07.md
git commit -m "docs: record mobile UI responsive audit"
```
