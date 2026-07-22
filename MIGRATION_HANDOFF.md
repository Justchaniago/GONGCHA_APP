# Gong Cha Loyalty V2 - Migration Handoff

**Updated:** 2026-07-23  
**Active repository:** `gongcha_app`  
**Active branch:** `Brain-surgery-loyaltyapp`  
**Purpose:** retain V1 Member App UI/UX while replacing its backend coupling with
the approved Loyalty V2 architecture.

## Non-negotiable direction

Do **not** rebuild the member experience from the V2 shell. The existing V1
Member App is the product-facing baseline because its UI, UX, animation,
navigation, modal, button-feedback, and interaction quality are preferred.

Refactor its "brain and nervous system" incrementally:

```text
V1 presentation (preserve)
  -> application controller / use case
    -> gateway interface
      -> FastAPI HTTP/native infrastructure adapter
        -> PostgreSQL source of truth
```

No screen, component, React context, or UI model may access Firestore directly
after its migration slice is complete. UI must not calculate or mutate points,
tier, voucher eligibility, redemption, or transaction state.

## Target ecosystem architecture

```text
Member App + Admin Panel + POS/Cashier
               -> FastAPI
                    |- ESB webhook receiver and order retrieval
                    |- loyalty, voucher, CRM, notification engines
                    |- REST API and audit log
               -> PostgreSQL

Firebase infrastructure adapters only:
  - Firebase Authentication (identity)
  - Firebase Cloud Messaging (push)
  - Firebase Storage (assets/uploads)
```

- PostgreSQL is the source of truth.
- FastAPI owns business logic.
- ESB is the POS integration layer, not the loyalty database.
- Transaction is the source of truth. Process ESB events idempotently, retain
  raw events for audit/replay, retrieve authoritative order detail, then write
  a canonical transaction and append-only point ledger.
- Point balance is derived from the ledger. Refund/void/manual adjustment and
  redemption must be ledger entries, not arbitrary client balance updates.

## Authoritative reference material

Read these before design or implementation:

1. `../Document/GongCha_Loyalty_System_Design_Document.md`
2. `../Document/GongCha_Loyalty_Architecture_Summary.md`
3. `../Document/Global Loyalty Toolkit - Technology and Implementation Playbook.pdf`
4. `../Document/Loyalty Marketing and Commercial Playbook.pdf`

The old root `../ROADMAP.md` describes the previous shell-first V2 effort. Do
not continue that roadmap as the delivery strategy; replace it only after the
new V1 UX-preserving migration roadmap is reviewed and approved.

## V1 coupling audit: starting facts

Full static audit: `../.archive/docs/member-app/V1_BACKEND_COUPLING_AUDIT.md`.

Critical coupling to remove through vertical slices:

- `src/context/MemberContext.tsx`: Firebase Auth listener, Firestore member
  snapshot, transaction polling, and pending-points reconciliation in global
  React state.
- `src/services/AuthService.ts`: Firebase Auth plus Firestore user-document
  writes and client-created tier/points/voucher defaults.
- `src/services/TransactionService.ts`: legacy Firestore access, polling, and
  frontend transaction/point normalization and pending-point aggregation.
- `src/screens/RewardsScreen.tsx`: Firestore catalog, redemption path, and
  locally-composed voucher QR payload.
- `src/screens/MembershipStatusScreen.tsx`: tier progress and remaining XP
  calculation in UI.

High-risk direct presentation paths: `WelcomeScreen`, `LoginScreen`,
`HomeScreen`, `MenuScreen`, `StoreLocatorScreen`, `ProfileCompletionScreen`,
and `ProfileScreen`.

V1 UX assets worth preserving with minimal change: `ScreenFadeTransition`,
`BouncyPressable`, `CustomTabBar`, `MemberCardModal`, `PromoAdModal`,
`NotificationSheet`, `SecurityModal`, decorative background, onboarding, and
navigation behavior. Refactor only their data inputs and callbacks.

## Current repository state

- `gongcha_app` baseline was committed and pushed on
  `feature/magic-link-auth` at `8b8a7ee` (`chore(member-app): checkpoint V1 frontend baseline`).
- The active work branch was created and pushed from that exact commit:
  `Brain-surgery-loyaltyapp` tracking `origin/Brain-surgery-loyaltyapp`.
- Working tree was clean immediately after branch creation.
- `npx tsc --noEmit` passed before the baseline commit.
- The repository has no `lint` or `test` npm script.
- `.gitignore` was updated so local Firebase configuration cannot be staged:
  `.env`, `.env.*` (except `.env.example`), `google-services.json`, and
  `GoogleService-Info.plist`.
- Never print, commit, or copy credentials/configuration into documentation.

## Workspace state outside this repository

- Cashier V1 is frozen and GitHub repository `Justchaniago/Gongcha_Chasier`
  is archived. Local copy is hidden but preserved at
  `../.archive/gongcha_cashierapp/`; its freeze checkpoint is `f92aae3`.
- Historical workspace docs were moved, not deleted, to `../.archive/docs/`.
- Admin repository remains untouched at `../gongcha-adminnew/`.
- Old V2 Member App shell remains untouched at
  `../gongcha-loyalty-v2/member-app/`. It is useful as a clean-client
  architecture reference but must not replace the approved V1 UX.

## Subagent setup for the next session

Use up to three bounded audit agents plus one lead/integrator. Do not let
multiple agents edit the same source area concurrently.

```text
Lead/integrator (primary agent)
  - owns decisions, source integration, tests, checkpoints, and final review

Agent A: backend-blueprint
  - derive FastAPI modules, PostgreSQL schema, ESB webhook/idempotency flow,
    ledger invariants, and versioned API contracts from Document/

Agent B: v1-extraction-map
  - turn the coupling audit into file-by-file migration seams, controller and
    gateway interfaces, and a safe migration sequence without editing source

Agent C: ux-regression-contract
  - inventory V1 visual/motion/gesture behavior that must remain unchanged;
    define manual/native regression evidence for each migration slice
```

Initial deliverable is a reviewed `V1 UX-Preserving Backend Migration Roadmap`,
not a source refactor. It must identify API/schema decisions that require user
approval before implementation (auth policy, SQL migrations, production
credentials, ESB signature/security, data migration, costs, and deployment).

## Plugin and skill status

Installed through `agy` on 2026-07-23:

- Superpowers: planning, parallel dispatch, TDD, debugging, verification, and
  worktree-oriented skills.
- Caveman: Cavecrew agents plus planning/review/commit/stats skills.

They are installed under `/Users/f/.gemini/config/plugins/`, but a fresh Codex
session/environment reload is needed before they appear in the session skill
catalog. Neither plugin exposes an MCP server.

## Working rules

- Preserve V1 UX and avoid a big-bang rewrite.
- Use vertical slices and backward-compatible seams.
- Firebase SDK/native modules live only in infrastructure adapters.
- Keep business logic out of UI and React context.
- Do not access SQL/Firestore directly from UI.
- Do not change production, credentials, schema, auth policy, ESB integration,
  or external services without explicit approval.
- Commit only completed, validated, scoped work. Keep separate cleanup,
  architecture, and feature changes separate.
