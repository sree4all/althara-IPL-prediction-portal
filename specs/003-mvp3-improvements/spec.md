# Feature Specification: MVP3 IPL Portal Improvements

**Feature Branch**: `003-mvp3-improvements`  
**Created**: 2026-04-20  
**Status**: Draft  
**Input**: User description: "MVP3 Improvements needed: (1) History sorted by match id M1, M2… natural order not string order; (2) Bonus question answers as dropdown options in admin and on Matches; (3) Tournament tab renamed to reflect tournament-level bonus questions; tournament answers use admin-editable dropdown options; questions can stay hidden until a date or until admin reveals; (4) Leaderboard: legacy vs current columns replaced by a single current-style points column per new design; (5) New tab showing prediction status per match for upcoming matches when predictions exist."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read match history in fixture order (Priority: P1)

As a participant, I want my History list ordered the same way the match schedule runs (e.g., match 2 before match 10), so I can scan results in a predictable order without confusing “M10” appearing next to “M1”.

**Why this priority**: History is used constantly; incorrect ordering undermines trust and makes review tedious.

**Independent Test**: Populate several matches with identifiers M1…M12 (including two-digit numbers). Open History and confirm order follows numeric match sequence, not alphabetical text order.

**Acceptance Scenarios**:

1. **Given** completed and pending predictions across matches M1, M2, M10, **When** the participant opens History, **Then** rows appear in natural match-number order (M2 before M10).
2. **Given** matches without a parseable match label, **When** History is shown, **Then** those items still appear in a consistent fallback order defined by the product (e.g., by scheduled time).

---

### User Story 2 - Clear leaderboard points (Priority: P2)

As a participant or organizer, I want the leaderboard to show a single, meaningful points total aligned with the current product design, without separate “legacy” and “current” columns that no longer reflect how scoring works.

**Why this priority**: The leaderboard is the primary standings view; misleading labels reduce clarity for everyone.

**Independent Test**: Open the leaderboard with seeded users and confirm one points column uses terminology that matches the unified scoring story (no redundant legacy/current split unless a separate archival view is explicitly out of scope).

**Acceptance Scenarios**:

1. **Given** users with points recorded under the unified model, **When** a visitor opens the leaderboard, **Then** each row shows one primary points figure with labels that match the agreed naming in this spec (no unexplained dual columns).
2. **Given** a user who only has historical import totals, **When** they appear on the leaderboard, **Then** the display still follows the same single-column convention (exact mapping of old totals is covered under assumptions).

---

### User Story 3 - Upcoming prediction status at a glance (Priority: P3)

As a participant, I want a dedicated place to see, for each upcoming match, whether I have already submitted a prediction (and ideally what I picked where appropriate), so I do not miss deadlines or duplicate effort.

**Why this priority**: Reduces missed picks and support questions before lock times.

**Independent Test**: With several scheduled matches, some with and some without a saved prediction, open the new tab and verify status reflects reality for the signed-in user.

**Acceptance Scenarios**:

1. **Given** an upcoming match with no prediction saved, **When** the participant opens the new tab, **Then** that match shows as not yet predicted (or equivalent clear state).
2. **Given** an upcoming match with a saved prediction, **When** the participant opens the new tab, **Then** the match shows as predicted and displays the agreed level of detail (e.g., winner pick visible, or “submitted” only—per assumptions).
3. **Given** a match that has already started or locked, **When** the participant views this tab, **Then** the product rules define whether it appears here or only in History (see Edge Cases).

---

### User Story 4 - Bonus picks from administrator-defined options (Priority: P4)

As an administrator, I want to define the allowed answers for match bonus questions; as a participant, I want to choose from those options on the match screen so answers are consistent and easy to score.

**Why this priority**: Improves data quality and aligns admin configuration with participant entry.

**Independent Test**: Admin creates or edits option lists for a match bonus prompt; participant opens the match flow and selects only from those options; invalid free-text entry is not possible where dropdowns apply.

**Acceptance Scenarios**:

1. **Given** a match-scoped bonus question with a configured option list, **When** a participant submits picks, **Then** the bonus answer is one of the allowed options.
2. **Given** an admin adds a new option before lock, **When** participants refresh the match experience, **Then** they can select the new option where rules allow changes before lock.

---

### User Story 5 - Tournament-level bonus questions: naming, options, and visibility (Priority: P5)

As a participant, I understand that the tournament area covers season-long bonus questions (not the same as per-match bonuses). I answer using dropdown options that admins maintain. Some questions may be hidden until a configured date or until an administrator explicitly reveals them.

**Why this priority**: Reduces confusion between match bonuses and season bonuses and supports staged reveals for the season narrative.

**Independent Test**: Rename or reposition the tournament entry so users recognize season-long bonuses; configure options and a reveal rule; verify participants only see questions when rules say they should.

**Acceptance Scenarios**:

1. **Given** the tournament section uses the new naming, **When** a new user navigates the app, **Then** they can distinguish tournament-level bonus questions from match-level prediction and bonuses.
2. **Given** a tournament question with a list of allowed answers, **When** a participant submits, **Then** the answer is restricted to admin-defined options.
3. **Given** a question configured to remain hidden until a specific date/time, **When** a participant views the tournament area before that time, **Then** the question is not shown (or shows as locked—per chosen behavior in Edge Cases).
4. **Given** an administrator chooses to reveal a question early, **When** they perform the reveal action, **Then** participants can see and answer the question according to any existing lock rules for submission.

---

### Edge Cases

- History ordering when two matches share the same display key or lack keys: fallback ordering must remain deterministic (e.g., kickoff time).
- Upcoming tab: whether completed matches, abandoned matches, or locked-but-unscored matches appear—default: focus on **not yet started** or **still editable** per lock rules; document in implementation planning if ambiguous.
- Tournament visibility: if both a **reveal date** and **manual reveal** exist, define precedence (default: manual reveal overrides hiding; date still applies if no manual action).
- Dropdown option lists empty: admin must be prompted to add options before participants can submit (or question stays disabled).
- Leaderboard: if legacy totals must still exist for audit, they may live in a non-primary place (export, detail) rather than the main table—assumption below.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST present participant History ordered by natural match sequence derived from match identifiers (e.g., M1, M2, … M10) rather than plain alphabetic sort of labels.
- **FR-002**: Administrators MUST be able to define, edit, and add allowed answer options for match bonus questions that use structured choices.
- **FR-003**: Participants MUST select match bonus answers from those allowed options (dropdown or equivalent single-choice control) wherever the product uses structured bonus questions for matches.
- **FR-004**: The tournament section MUST use user-facing naming that communicates “season- / tournament-level bonus questions” distinct from per-match predictions and bonuses.
- **FR-005**: Administrators MUST be able to define, edit, and add allowed answer options for each tournament bonus question that uses structured choices.
- **FR-006**: Participants MUST select tournament answers from administrator-defined options for those questions.
- **FR-007**: The product MUST support hiding tournament bonus questions until at least one of: a configured reveal timestamp, or an explicit administrator “reveal” action (exact precedence documented in planning).
- **FR-008**: The leaderboard MUST not present separate “legacy” and “current” columns as the primary points presentation; it MUST reflect the unified “current design” single primary points column and labeling agreed for MVP3.
- **FR-009**: The product MUST provide a new tab (or equivalent primary navigation destination) listing upcoming matches and showing each signed-in user’s prediction status (submitted vs not) for those matches, when predictions are tracked for that match.
- **FR-010**: Where an upcoming match has a stored prediction, the status view SHOULD show enough information for the participant to confirm coverage without opening every match detail (minimum: submitted vs not; optional: summary of pick per product rules).

### Key Entities *(include if feature involves data)*

- **Match identifier / order key**: Logical sequence used for sorting (from human-readable match id or schedule position).
- **Structured answer option set**: A set of allowed values attached to a bonus prompt (match-scoped or tournament-scoped), maintained by admins.
- **Reveal rule**: Controls visibility of a tournament bonus question—time-based, admin-triggered, or combined—with clear precedence.
- **Prediction status snapshot**: Per upcoming match, whether the user has submitted required picks before lock.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability review, participants correctly interpret the tournament area as season-long bonus questions (target: ≥90% in a small moderated session or survey of 5+ users).
- **SC-002**: For a schedule with at least 12 labeled matches (including M9 and M10), zero instances of “M10” appearing before “M2” in History due to sort order (100% correct natural ordering in acceptance tests).
- **SC-003**: 100% of submitted match and tournament bonus answers (where dropdowns apply) validate against administrator-defined option lists in automated or manual test passes.
- **SC-004**: Participants report reduced confusion about standings labels (qualitative: replace dual-column confusion with single primary column in stakeholder sign-off).
- **SC-005**: On the upcoming prediction-status view, displayed status matches the underlying saved predictions in 100% of sampled test accounts.

## Assumptions

- “Natural order” for matches is derived from the numeric part of standard match keys (M#) when present; otherwise kickoff time is the fallback ordering key.
- Legacy spreadsheet totals, if retained for reference, are not shown as a second competing column on the main leaderboard; they may be omitted or surfaced elsewhere outside this MVP3 scope unless stakeholders expand scope.
- Match bonus dropdowns apply to prompts configured as “structured choice”; free-text bonuses remain possible only if explicitly kept as a separate prompt type (default: new/edited prompts use structured options).
- The new “prediction status” tab focuses on upcoming editable fixtures; exact inclusion rules for “in progress” matches follow existing lock policy from prior releases.
- Administrators are a small trusted group; option list abuse (offensive entries) is out of scope beyond normal admin tooling.
