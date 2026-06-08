# Feature Specification: FIFA Tournament Reset & Reconfiguration

**Feature Branch**: `004-fifa-tournament-reset`  
**Created**: 2026-05-21  
**Status**: Draft (future MVP — not scheduled for immediate implementation)  
**Input**: User description: "A future mvp not to implement now but later: (1) Clean up all existing data except user profiles; (2) Remove legacy/migration references for a brand-new game; (3) Data-reset scripts for match/ledger and related data; (4) Map new matches from FIFA schedule source files without schema changes; (5) Reorganize admin into meaningful tabs; (6) Stage-based configurable scoring per provided matrix."

## Clarifications

### Session 2026-05-21

- Q: How should match-winner scoring work when the actual result is a draw (participants previously picked home/away only)? → A: Add **Draw** as a third pick option on **all** matches; correct draw predictions use the stage scoring matrix; incorrect team picks are scored as incorrect per stage rules.
- Q: How far should legacy cleanup (migration tables, alias staging, legacy_points, migration routes) go? → A: **Full removal** — drop legacy tables/columns and delete migration-related code paths in the same release as the reset.
- Q: How should user-visible branding change after reset? → A: **Tournament-specific, non-FIFA trademark** — e.g. “World Cup 2026 Predictions” in primary nav/headings; no FIFA logos or wordmarks in UI copy.
- Q: How should season-long tournament bonus questions be scored after reset? → A: **Unchanged flat model** — each tournament bonus slot keeps its own configurable correct/incorrect points (default +2 / 0), independent of the match stage matrix; admin UI remains clear and editable.
- Q: Who may execute the production data reset? → A: **Operators only** — documented SQL/runbook scripts run outside the app (staging first, then production); no in-app reset control.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fresh tournament without losing accounts (Priority: P1)

As an organizer preparing a new competition season, I want all prior match, prediction, scoring, and configuration data removed while participant accounts remain, so returning users keep their login and display identity but start from a clean slate.

**Why this priority**: Without a trustworthy reset, a new tournament cannot launch without corrupting standings or mixing old picks with new fixtures.

**Independent Test**: Run the approved data-reset procedure on a staging copy with seeded users and game data; verify accounts still sign in with the same identity, and all match-related records, predictions, ledger entries, and bonus/tournament content are gone.

**Acceptance Scenarios**:

1. **Given** a database with users, matches, predictions, points history, and bonus/tournament content, **When** the organizer runs the official reset procedure, **Then** every user profile record needed for authentication and display remains, and all competition data tables are empty or reset per the procedure checklist.
2. **Given** a reset has completed, **When** a participant signs in, **Then** they see no prior match predictions, history rows, or standings from the previous competition unless explicitly marked as archival (out of scope).
3. **Given** a reset has completed, **When** an organizer views standings, **Then** all participants show zero (or equivalent baseline) competition points until new matches are scored.

---

### User Story 2 - Load FIFA schedule into existing match model (Priority: P1)

As an organizer, I want the full FIFA World Cup fixture list loaded from the provided schedule source files into the existing match structure, so participants can predict on the correct teams, venues, stages, and kickoff times without a database redesign.

**Why this priority**: Match data is the foundation for predictions and stage-based scoring; it must be complete and accurate before any user-facing season opens.

**Independent Test**: Import transformed schedule data from the FIFA source files; confirm match count, ordering, team names, stage labels, and kickoff times align with the source files, and each fixture is uniquely identifiable for predictions.

**Acceptance Scenarios**:

1. **Given** authoritative FIFA schedule files (matches, teams, stages, host cities), **When** the organizer runs the schedule import transform, **Then** all fixtures appear as schedulable matches with home/away teams, kickoff time, and stage metadata mapped to existing fields (e.g., external identifier, knockout stage).
2. **Given** group-stage and knockout fixtures in the source files, **When** import completes, **Then** each match is associated with the correct tournament stage for scoring purposes.
3. **Given** a duplicate import attempt, **When** the same external fixture key is supplied again, **Then** the system updates in place rather than creating duplicate playable matches.

---

### User Story 3 - Admin works in clear, task-focused areas (Priority: P2)

As an admin, I want the administration area organized into tabs such as match predictions (results and scoring actions), tournament settings, bonus points settings, and scoring configuration, so I can complete routine tasks without scrolling through unrelated controls.

**Why this priority**: Current admin layout mixes many concerns on one page; a new season increases operational frequency and error risk.

**Independent Test**: An admin user opens each tab and completes one representative task (enter a match result, change tournament lock, create a bonus prompt, adjust stage points) without using controls from another tab.

**Acceptance Scenarios**:

1. **Given** an admin opens the administration area, **When** the page loads, **Then** primary navigation uses clearly labeled tabs: Match Predictions (or equivalent), Tournament Settings, Bonus Points Settings, and Scoring Configuration.
2. **Given** an admin is on the Scoring Configuration tab, **When** they adjust points for a tournament stage, **Then** changes apply to future scoring runs and are not mixed with match-result entry controls.
3. **Given** an admin is on the Match Predictions tab, **When** they record winners and trigger scoring, **Then** they can do so without navigating tournament-wide bonus configuration screens.
4. **Given** an admin is on Bonus Points Settings or Scoring Configuration, **When** they adjust points for a season-long tournament bonus slot, **Then** they can set per-slot correct/incorrect values (defaults +2 / 0) without editing the match stage matrix.

---

### User Story 4 - Stage-based points with penalties (Priority: P2)

As an admin, I want points for correct and incorrect match-winner predictions to depend on the tournament stage, with values editable before and during the season, so knockout rounds reward risk appropriately while group play stays forgiving.

**Why this priority**: The product moves from a single flat match-winner points model to FIFA-style stage weighting; incorrect picks in later rounds should cost points.

**Independent Test**: Configure stage points in admin, score sample matches at group, Round of 32, and Final stages with correct and incorrect predictions, and verify ledger deltas match the configured matrix.

**Acceptance Scenarios**:

1. **Given** default stage scoring is seeded, **When** an admin opens Scoring Configuration, **Then** they see each tournament stage with separate correct-winner and incorrect-prediction point values matching the agreed defaults (see Requirements).
2. **Given** a group-stage match with a recorded actual winner, **When** scoring runs for a user who predicted the winner correctly, **Then** they gain 2 points; when they predicted incorrectly, **Then** they gain 0 points (no penalty).
3. **Given** a Final match with a recorded winner, **When** scoring runs for a correct prediction, **Then** the user gains 20 points; for an incorrect prediction, **Then** they lose 10 points.
4. **Given** an admin changes Round of 16 incorrect-prediction penalty from −2 to −1, **When** subsequent scoring runs, **Then** only matches scored after the change use −1; prior ledger entries remain unchanged unless an explicit rescore workflow is invoked (out of scope unless added later).
5. **Given** a match where the admin records the actual result as **Draw**, **When** a participant predicted Draw, **Then** they receive the stage’s correct-prediction points; **When** they predicted Home or Away, **Then** they receive the stage’s incorrect-prediction points (0 in group stage, penalties in knockout stages per matrix).

---

### User Story 5 - No legacy or migration UX (Priority: P3)

As a participant, I want the product to behave as a new game only—without welcome messages, alias linking, or migration flows from a prior season—so the experience is not confusing after the organizational reset.

**Why this priority**: Legacy affordances imply data continuity the business has explicitly ended.

**Independent Test**: Browse all participant and admin surfaces; confirm no copy, navigation, or workflows reference prior-season import, alias claim, or migration.

**Acceptance Scenarios**:

1. **Given** a signed-in user with no prior-season import, **When** they land on the home or matches view, **Then** no banner or copy references imported scores from a previous competition year.
2. **Given** an admin account, **When** they browse administration, **Then** no tools exist for legacy alias mapping, one-time migration, or staging of old predictions.
3. **Given** the codebase and operator documentation after this feature ships, **When** onboarding a new environment, **Then** instructions describe only the FIFA schedule import and reset scripts—not IPL-specific migration paths.
4. **Given** the release is deployed, **When** an operator inspects the database schema and application routes, **Then** legacy migration tables/columns and migration API routes are absent (not merely empty).

---

### Edge Cases

- Reset procedure run while users are actively submitting predictions: procedure must be run only during a communicated maintenance window; partial state after failure must be documented in runbook (rollback or re-run).
- Production reset MUST NOT be triggerable from the admin UI; only operators with database access run approved scripts after staging validation.
- Schedule source file row references unknown team or city identifier: import rejects or skips row with explicit error listing row identifier; no silent partial schedule.
- Knockout fixture with placeholder teams in source data: matches remain scheduled but may block winner scoring until teams are known; admin can update team names without changing fixture identity.
- Participant points would go negative after incorrect knockout prediction: system allows negative totals unless a future floor rule is added (assumption: no floor in v1 of this feature).
- Third Place Playoff incorrect prediction: uses same penalty band as Quarter-Finals (−3) unless admin overrides via configuration.
- Random bonus questions: default +2 / 0; admin can configure per prompt; scoring respects prompt-level configuration when set, otherwise stage defaults for match-winner only.
- Rescoring a match after stage point config changed: unchanged historical ledger unless explicit rescore is requested (document as operator limitation).
- Actual result recorded as **Draw**: participants who picked Draw are scored as correct; participants who picked Home or Away are scored as incorrect (knockout incorrect penalties apply where configured).
- Knockout matches that cannot end in a draw under tournament rules: **Draw** remains available as a prediction option, but operators should only record Home/Away winners unless competition rules allow extra time/penalties to be represented separately (product does not model ET/penalties as separate results).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an operator-approved data-reset procedure that deletes or truncates all competition-related data (matches, predictions, points history, bonus prompts and answers, tournament questions and answers, import batches) while preserving user profile records (identity, role, display name, authentication linkage).
- **FR-002**: System MUST reset competition point balances on profiles to a single **current points** baseline of zero as part of the reset procedure, without deleting the profile row; legacy-only columns are removed per FR-003a rather than retained.
- **FR-003**: System MUST remove all user-facing and admin-facing legacy migration features, including welcome/import copy, alias claim flows, and migration administration tools, and MUST delete migration-related application routes and modules in the same release.
- **FR-003a**: System MUST drop legacy database artifacts in the same release, including but not limited to: legacy alias tables, legacy prediction staging tables, and legacy point columns on profiles—after data reset and operator sign-off on staging.
- **FR-004**: System MUST remove operator documentation that describes legacy IPL migration; replacement documentation MUST describe reset plus FIFA schedule import only.
- **FR-005**: System MUST ship documented, reviewable data-reset scripts suitable for execution by **operators only** (outside the application) in controlled environments—staging validation required before production—with an ordered checklist of tables/collections affected; the product MUST NOT expose an in-app control that performs production data reset.
- **FR-006**: System MUST import the full FIFA fixture set from the provided schedule source files (matches, teams, tournament stages, host cities) by transforming into the existing match model—no structural schema change required for this feature.
- **FR-007**: Transform MUST map fixture identity to a stable external key, team names from team reference data, kickoff timestamps from source kickoff fields, and stage classification from tournament stage reference data (including knockout stage labels used for scoring).
- **FR-008**: Administration UI MUST be reorganized into tabbed sections at minimum: Match Predictions (match results, per-match scoring actions), Tournament Settings (season lock, maintenance, season-wide visibility), Bonus Points Settings (match and season bonus prompts/options), and Scoring Configuration (stage matrix and random-bonus defaults).
- **FR-009**: Scoring Configuration MUST allow admins to view and update, per tournament stage, points awarded for a correct match-winner prediction and points deducted (or zero) for an incorrect match-winner prediction.
- **FR-010**: Default stage scoring MUST initialize to: Group Stage — correct +2, incorrect 0; Round of 32 — correct +3, incorrect −1; Round of 16 — correct +5, incorrect −2; Quarter-Finals — correct +8, incorrect −3; Semi-Finals — correct +12, incorrect −4; Third Place Playoff — correct +8, incorrect −3; Final — correct +20, incorrect −10.
- **FR-011**: Random bonus questions MUST default to +2 for correct and 0 for incorrect, with per-question overrides configurable by admins without changing the stage matrix defaults.
- **FR-011a**: Season-long tournament bonus questions MUST use a **separate flat scoring model**: each active slot has its own configurable correct and incorrect point values (default +2 / 0), independent of the match-winner stage matrix; admins MUST edit these values from Bonus Points Settings or Scoring Configuration with clear per-slot labels.
- **FR-012**: Match-winner scoring MUST determine applicable stage from match metadata (e.g., knockout stage / stage identifier) and apply the configured matrix row when writing points history.
- **FR-012a**: Participants MUST be able to predict **Home**, **Away**, or **Draw** for every match before lock time.
- **FR-012b**: Admins MUST be able to record the actual match result as **Home**, **Away**, or **Draw** when entering results for scoring.
- **FR-012c**: When the actual result is **Draw**, participants who predicted Draw MUST receive the stage’s correct-prediction points; participants who predicted Home or Away MUST receive the stage’s incorrect-prediction points (including knockout penalties where applicable).
- **FR-013**: System MUST continue to support existing tournament-wide bonus questions and match-level bonus prompts after reset, configured fresh by admins post-import (no automatic carryover of old question text).
- **FR-014**: Feature delivery MUST be scheduled as a future MVP; implementation MUST NOT be assumed complete until this spec is planned and explicitly prioritized after current MVP work.
- **FR-015**: User-visible copy MUST replace IPL-specific branding with tournament-specific labels (e.g. “World Cup 2026 Predictions”) in navigation, page titles, and primary headings; MUST NOT use FIFA trademarks, logos, or official FIFA wordmarks in the product UI.

### Key Entities

- **User profile**: Participant or admin identity; preserved across reset; competition points zeroed.
- **Match**: Scheduled fixture with teams, kickoff time, status, winner, stage classification, stable external key.
- **Prediction**: User’s match outcome pick — **Home**, **Away**, or **Draw** — plus structured bonus answers where applicable.
- **Points history entry**: Auditable delta tied to user, source match or bonus, reason, and amount.
- **Tournament stage**: Named phase (Group Stage through Final) driving the scoring matrix row.
- **Scoring configuration**: Per-season match stage matrix (correct/incorrect points), per-slot tournament bonus flat points, and defaults/overrides for random match bonus questions.
- **Bonus prompt**: Admin-defined question (match-scoped or season-scoped) with optional per-prompt point overrides.
- **Tournament question**: Season-long question slots with answers and visibility rules.
- **Schedule source files**: Authoritative FIFA CSV inputs for teams, stages, cities, and matches used only for import transform.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can complete full data reset and FIFA schedule import on a staging environment in under 30 minutes following the runbook, with zero profile deletions.
- **SC-002**: After reset and import, 100% of fixtures in the schedule source files appear as playable matches with correct team pairing and kickoff time when validated against a 10-match sample audit.
- **SC-003**: Admins can locate and update any scoring matrix row within 2 minutes using tabbed navigation (timed usability test with 3 admin tasks).
- **SC-004**: Scoring correctness: for a test harness of one match per stage with known predictions, automated or manual verification shows ledger deltas match configured correct/incorrect values in 100% of cases.
- **SC-005**: Zero participant-facing screens and zero deployable migration code paths reference legacy import or migration after release (verified by route/code audit and UI walkthrough).
- **SC-006**: Post-launch support tickets related to “old season points” or “migration” decrease to near zero within the first month of the new tournament (qualitative ops metric).
- **SC-007**: 100% of primary navigation and page titles use the agreed non-trademark tournament label with zero IPL or FIFA trademark strings in a copy audit checklist.

## Assumptions

- **Implementation timing**: This specification describes a future MVP; current codebase work continues until this feature is explicitly scheduled.
- **Account preservation**: “Keep user profile” means authentication-linked profile rows and display names remain; email and role are unchanged unless manually edited.
- **Point reset**: All competition totals start at zero after reset; legacy point columns are dropped as part of full legacy removal—participants are not owed carryover from the prior IPL season.
- **Schema stability**: Existing match and scoring tables accommodate FIFA data via transform/import only; the **Draw** pick and result option may require minimal validation/constraint updates to prediction and match result fields but not a redesign of the match entity.
- **Season label**: The new competition continues to use the product’s existing season-year convention (e.g., 2026) aligned with schedule source dates; user-visible branding uses tournament-specific non-trademark copy (e.g. “World Cup 2026 Predictions”), not IPL or FIFA official marks.
- **Third Place Playoff**: Incorrect prediction penalty defaults to −3 (same band as Quarter-Finals) as implied by the stakeholder matrix note.
- **Random bonus questions**: Treated as configurable bonus prompts; they do not use knockout penalty rows unless explicitly configured per prompt.
- **Tournament-wide mega bonus**: Season-long question slots are re-created by admins after reset; scoring uses per-slot configurable flat points (default +2 / 0), not the knockout stage matrix; automatic seeding of old question text is out of scope.
- **Maintenance window**: Data reset runs only when predictions are disabled and users are notified; only operators execute reset scripts—never via admin self-service UI.
- **Negative points**: Total user points may go negative after knockout-stage incorrect picks; no minimum floor unless added later.
- **Rescore**: Changing stage points does not retroactively alter already-written history entries without a separate future rescore feature.
