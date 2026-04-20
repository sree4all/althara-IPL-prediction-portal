# Feature Specification: IPL Prediction Web App (Althara 2026)

**Feature Branch**: `001-ipl-prediction-portal`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "Convert the Althara IPL Predictions 2026 spreadsheet into a serverless, automated web app with zero maintenance hosting cost; GMT/UTC time standard; 30-minute submission lock before match start; upsert predictions until lock; Supabase-style data model and auth; CSV migration from Google Sheet; mobile-first UI; post-login syncing and welcome messaging; defined error and success copy."

**Source reference**: [Althara IPL Predictions 2026 spreadsheet](https://docs.google.com/spreadsheets/d/1P58RxCVKwderQf30vy-KXtuzWsEtggwUaeDY58885_M/edit?usp=sharing) (matches, timings in GMT, team codes, results, and bonus-related columns as exported to CSV).

## Clarifications

### Session 2026-04-12

- Q: How should the product handle the shift from legacy spreadsheet tally identity (participants identified primarily by **name** in the tally UI) to authenticated accounts in the new app? → A: Transition must be **seamless**: migration carries each participant’s **tally display name** into their profile for public/leaderboard display; linking imported scores and profiles to sign-in uses **email** as the stable account key; the leaderboard and the member’s own row must remain recognizable as the same people and naming style as the old tally (avoid generic or misleading labels drawn only from the sign-in provider), while authentication itself remains email/Google-based.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in and see continuity (Priority: P1)

A returning participant opens the app, signs in with email or Google, and immediately understands whether their history from the prior spreadsheet-based season was found. They see a short “syncing” state first, then either a welcome-back message with confirmation of imported legacy scores or a neutral entry into the app if no prior row matched their email. Because the legacy tally identified people by **name**, the experience must not feel like a reset: once matched, they see the **same familiar display name** they expect from the tally on their profile and leaderboard context.

**Why this priority**: Trust and orientation reduce abandonment; this is the first impression after authentication.

**Independent Test**: Sign in with an email present in migrated data and verify the welcome-back message; sign in with a new email and verify no false import claim.

**Acceptance Scenarios**:

1. **Given** a user whose email matches migrated CSV data, **When** they complete sign-in, **Then** they see a syncing state followed by: “Welcome back! We've successfully imported your scores from the 2025 season.”
2. **Given** a user with no matching migrated row, **When** they complete sign-in, **Then** they are not shown the imported-scores welcome message.
3. **Given** any signed-in user, **When** the app finishes initial post-login checks, **Then** they can navigate to matches and leaderboard without repeating sign-in.
4. **Given** a user matched to migrated data that includes a legacy tally name, **When** they view their identity on leaderboard-related surfaces in the app, **Then** the default visible participant name matches that imported tally name (not an unrelated default from the sign-in provider).

---

### User Story 2 - View upcoming matches and lock state (Priority: P1)

A signed-in user opens the match grid, sees upcoming IPL fixtures with home and away sides, and can tell at a glance which matches still accept predictions versus which are locked based solely on GMT start time and the 30-minute rule.

**Why this priority**: Without clear lock visibility, users will submit invalid picks or miss deadlines.

**Independent Test**: Compare displayed lock state against “current UTC time vs. match start minus 30 minutes” for sample fixtures.

**Acceptance Scenarios**:

1. **Given** a match whose start in GMT is more than 30 minutes away, **When** the user views the grid, **Then** inputs for that match are enabled and no lock badge is shown (or an equivalent clear “open” state).
2. **Given** a match where current UTC time is strictly after 30 minutes before GMT start (`current_time > match_start_utc - 30 minutes`), **When** the user views the grid, **Then** the match shows a “LOCKED” badge (or equivalent) and inputs are disabled.
3. **Given** completed or otherwise non-submittable matches, **When** the user views the grid, **Then** presentation matches product rules (e.g., no open submission where not allowed).

---

### User Story 3 - Save or revise a prediction until lock (Priority: P1)

A signed-in user selects a predicted winner (and optional bonus selection when offered) for an open match and saves. They can change that choice any number of times until the lock moment; after lock, the saved pick cannot change.

**Why this priority**: Core product value is recording and revising predictions fairly until the published cutoff.

**Independent Test**: Save once, save again before lock (expect update messaging), attempt after lock (expect rejection with late message).

**Acceptance Scenarios**:

1. **Given** an open match, **When** the user chooses teams/options and uses “Save Prediction”, **Then** the system records one row per user per match and shows a success confirmation: “Prediction recorded for [Match]!” where `[Match]` reflects the fixture label shown in the UI.
2. **Given** the user already has a prediction for that match and it is still open, **When** they save a different choice, **Then** the existing entry is updated (no duplicate row) and the user sees: “We've updated your existing prediction with your new choice. Good luck!”
3. **Given** the lock window has started, **When** the user attempts to submit or change a prediction, **Then** the system rejects the action and shows: “Sorry! The deadline for this match was 30 minutes before start time (GMT). This match is now locked.”

---

### User Story 4 - Leaderboard visibility (Priority: P2)

A signed-in user views a leaderboard that ranks participants using stored profile fields for legacy totals, current-season points, and rank, so they can compare standing during the season.

**Why this priority**: Motivation and transparency; secondary to submitting picks.

**Independent Test**: Verify ordering and displayed totals match stored values after known test data loads.

**Acceptance Scenarios**:

1. **Given** populated profiles, **When** the user opens the leaderboard, **Then** they see participants with a **public display name** (initialized from the legacy tally name when migrated), legacy points, current points, and rank according to defined ordering rules for the screen.
2. **Given** the user’s own row, **When** they view the leaderboard, **Then** they can identify their entry among others using the same style of **name-based labeling** they knew from the tally, except where disambiguation is required for duplicate names (see Edge Cases).

---

### User Story 5 - Operator data seeding from CSV (Priority: P2)

An operator runs a controlled import from CSV exports of the legacy “Predictions” and “Settings” (or equivalent) tabs to populate or refresh matches, settings, and user-linked legacy points without manual re-keying.

**Why this priority**: One-time and periodic migration from the sheet is required for continuity and admin efficiency.

**Independent Test**: Import sample CSVs and verify matches and user legacy points align with source rows keyed by email.

**Acceptance Scenarios**:

1. **Given** exported CSVs from the spreadsheet, **When** the seeding utility runs with valid files, **Then** matches and related fields load in UTC, and user legacy points attach to profiles by email match, with each profile carrying the **participant name** column from the tally where present for display continuity.
2. **Given** a user email that exists in CSV, **When** that user signs in, **Then** their legacy points reflect the imported value used for leaderboard legacy totals and their **default display name** reflects the imported tally name when available.

---

### Edge Cases

- Current UTC time exactly equals “30 minutes before start” (`current_time == match_start_utc - 30 minutes`): submission is still allowed because lock applies only when `current_time > match_start_utc - 30 minutes` (strict inequality).
- User has multiple browser tabs and submits twice near lock: last valid write before lock wins; after lock, all writes fail with the late message.
- Imported CSV row has ambiguous or duplicate emails: define deterministic behavior (skip, merge, or fail row) in planning; default assumption is deterministic validation errors surfaced to the operator during seeding.
- Match result or bonus outcome is special (e.g., abandoned): product displays status and scoring behavior follow Althara rules already used in the sheet season (documented in assumptions).
- User changes device: same account sees the same prediction state after sync.
- **Legacy duplicate display names**: Two different participants shared the same tally name; after migration they remain distinct accounts (different emails). The product MUST NOT merge their scores; leaderboard presentation may need a disambiguation rule (e.g., subtle suffix or secondary label) determined in planning so names stay fair and recognizable.
- **Provider display name vs tally name**: If the OAuth provider supplies a different casual name than the tally, the **imported tally name** still wins for default public display when migration data exists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST use a single canonical time basis for all scheduling, locks, and stored timestamps: GMT/UTC (no local-only storage for business logic).
- **FR-002**: For each match, the system MUST store home side, away side, scheduled start instant in UTC, eventual winner (when known), and a lifecycle status distinguishing upcoming, live/completed, or other states needed for the season.
- **FR-003**: For each user and match pair, the system MUST store at most one prediction record, including predicted winner, optional bonus selection when applicable, and last-updated instant in UTC.
- **FR-004**: The system MUST enforce submission lock: if current UTC time is strictly after (match start UTC minus 30 minutes), the user MUST NOT create or update a prediction for that match.
- **FR-005**: The system MUST support upsert semantics for predictions: creating a new pick when none exists, or updating the existing row when the user changes their choice before lock, without duplicate rows for the same user and match.
- **FR-006**: The system MUST authenticate users via email and Google sign-in pathways.
- **FR-007**: The system MUST maintain a participant profile suitable for leaderboard display, including **public display name** (initialized from the **legacy tally name** when migration provides it), legacy points carried from migration, current-season points, and rank position as computed for display.
- **FR-008**: For accounts linked to migrated CSV rows that include a participant name, the **default public display name** in the app MUST be that **tally name**, not an unrelated default derived only from the sign-in provider, so participants and friends recognize the same labels as the pre-app tally.
- **FR-009**: The system MUST bind migrated legacy points and profile metadata to the authenticated user using **email** as the primary join key, while preserving **name-based familiarity** for all public standings as described in FR-007 and FR-008.
- **FR-010**: The product MUST provide a post-login “Syncing History” state before showing primary navigation content.
- **FR-011**: The product MUST show the exact welcome-back sentence when migrated data matches the signed-in user’s email: “Welcome back! We've successfully imported your scores from the 2025 season.”
- **FR-012**: On successful first save for a match, the product MUST show a success toast using: “Prediction recorded for [Match]!”
- **FR-013**: When an upsert updates an existing pre-lock prediction, the product MUST show: “We've updated your existing prediction with your new choice. Good luck!”
- **FR-014**: On late submission attempts, the product MUST show: “Sorry! The deadline for this match was 30 minutes before start time (GMT). This match is now locked.”
- **FR-015**: The match grid MUST be usable on small screens first (layout and touch targets appropriate for phones), then scale up for larger viewports.
- **FR-016**: Operators MUST be able to run a documented seeding flow that ingests CSV exports from the legacy Google Sheet tabs (“Predictions”, “Settings”) into the app’s data, matching users by email for legacy points and importing **participant display names** from the tally so digital profiles mirror the name column participants are used to seeing.
- **FR-017**: The deployed solution MUST stay within agreed free-tier usage limits for hosting and managed data so ongoing running cost remains zero at projected participant volume (exact caps left to planning against provider limits).

### Key Entities *(include if feature involves data)*

- **Match**: A scheduled IPL fixture with two competing sides, UTC start instant, display label, outcome fields when finalized, and status for UX and eligibility.
- **Prediction**: A signed-in participant’s pick for one match (winner and optional bonus), unique per user per match, with last change time in UTC and immutability after lock.
- **Profile**: Participant-facing identity for the leaderboard: **public display name** (sourced from the legacy tally name when migrated), stable **account identity** via authenticated email, numeric legacy points from migration, current-season points, and rank for presentation.
- **Import batch** *(operator-facing)*: A record of a CSV seeding run sufficient to audit what was loaded and any rejected rows (detailed shape for planning).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability tests, at least 90% of participants correctly identify whether a given match is open or locked without coaching, when presented with the grid and current time context.
- **SC-002**: For trials with scripted clocks, lock enforcement matches the UTC rule with zero false “open” submissions after the cutoff in 100% of cases tested.
- **SC-003**: At least 95% of sign-ins complete the post-login flow (syncing to ready state) in under 10 seconds under normal conditions, or the UI surfaces a clear continuation path if slower.
- **SC-004**: Migration rehearsal: for a sample CSV, 100% of valid email-matched legacy point rows appear correctly on the leaderboard after import (for rows not rejected by validation), and migrated participants see **tally-consistent display names** on list views in spot checks.
- **SC-005**: Participant-reported confusion about “lost” scores drops compared to spreadsheet-only operation (baseline to be captured qualitatively in the first sprint review).

## Assumptions

- Scoring rules for the 2026 season (including bonus picks and abnormal results such as abandoned matches) follow the Althara IPL Predictions rules already used alongside the 2026 sheet; the app reflects outcomes once operators or automated jobs record results.
- “Legacy points” correspond to the prior season totals held in the exported sheet data; “current points” update as the 2026 season progresses per those rules.
- The product may rely on a managed authentication and database stack chosen in planning, provided FR-001–FR-009 and cost constraints are met; specifics are intentionally left to the implementation plan.
- Participants have internet access and a modern mobile browser; push notifications are out of scope unless added later.
- English UI copy as specified is sufficient for MVP1.
- Legacy tally exports used for seeding include **email** and **participant name** columns sufficient to join accounts and preserve display naming; rows that cannot be joined by email require an explicit operational decision (see open clarification if unresolved in planning).

## Out of Scope *(MVP1)*

- Native mobile apps.
- Paid tiers, custom domains, or non-zero hosting budget (unless explicitly approved later).
- Real-time in-match trading or live odds integrations beyond IPL match outcome and defined bonus dimensions.
