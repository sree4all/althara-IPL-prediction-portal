# Feature Specification: IPL Prediction Portal — MVP2

**Feature Branch**: `002-ipl-prediction-mvp2`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "MVP2 — (1) Add full IPL 2026 match schedule with onboarding help; (2) UI to submit predictions persisted to the system, with bonus questions configurable per match or tournament-wide, manageable by an Admin role via UI; (3) prediction records extended for bonus answers and five tournament-level prediction questions; (4) user view of past predictions and corresponding points; (5) per-match prediction list visible to participants (all users’ picks for that match); (6) one-time migration of historical predictions from legacy name-based data via email mapping or alias selection at registration to match future sign-ups."

**Depends on**: MVP1 baseline (authenticated users, match grid, core match-winner prediction, UTC lock rules, leaderboard foundation) as implemented or planned in `specs/001-ipl-prediction-portal/`.

## Clarifications

### Session 2026-04-12

- Q: How does MVP2 relate to MVP1? → A: MVP2 **extends** the portal with full schedule surfacing, bonus and tournament-question prediction structures, admin configuration, personal history with points, per-match public pick lists, and migration/alias linking—described in product terms without prescribing implementation stack in this document.
- Q: When may participants change their five tournament-level answers, and when do those answers lock? → A: There is a single **tournament answers lock** instant in **GMT/UTC**, configurable by **Admin**. Until that instant, each participant may create or revise **all five** tournament answers together as often as allowed by the UI. **After** that instant, tournament answers are **immutable** for that season. If Admin does not set a lock time, the product default is the **scheduled start** of the **first IPL 2026 league match** in the imported schedule (UTC).
- Q: On the per-match community list, should people who did not submit a pick appear? → A: **No** — the list includes **only** participants who submitted a valid match-level pick for that match **before** that match’s lock; non-participants are omitted (not shown as “no pick”).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Full IPL 2026 schedule and onboarding (Priority: P1)

A signed-in participant opens the app and sees the **complete IPL 2026 fixture list** (or the portion released by the league) with enough context to understand **what to predict and when deadlines apply**, without hunting external spreadsheets.

**Why this priority**: Without schedule completeness and orientation, later prediction features feel incomplete and drop-off increases.

**Independent Test**: Review schedule-only mode (or dedicated screen) shows all planned fixtures with dates/times in the agreed timezone presentation and links or tips for “how predictions work.”

**Acceptance Scenarios**:

1. **Given** the season schedule is loaded in the product, **When** the user opens the schedule experience, **Then** they see all matches currently provisioned for IPL 2026 with clear ordering (e.g., by round or date).
2. **Given** a first-time or returning user, **When** they use onboarding help (short copy, tooltips, or a guided panel), **Then** they understand lock timing (relative to match start), what counts as a valid pick, and where bonuses and tournament questions live.

---

### User Story 2 — Extended prediction capture (match, bonuses, tournament questions) (Priority: P1)

A participant submits their **match winner**, **optional or required bonus answers** depending on admin rules, and **up to five tournament-level prediction answers** in one coherent flow; submissions respect existing **lock rules** for match-level picks and any defined rules for when tournament questions can change.

**Why this priority**: Core product value is capturing structured predictions in the database for scoring.

**Independent Test**: Complete a prediction session with sample data and verify stored records reflect match pick, per-match bonus responses, and five tournament answers as separate logical fields.

**Acceptance Scenarios**:

1. **Given** an open match, **When** the user saves, **Then** the match winner (and per-match bonus if enabled for that match) is stored and the user receives confirmation consistent with MVP1 messaging patterns.
2. **Given** tournament questions are active, **When** the user answers the five tournament-level questions, **Then** those answers are stored once per participant (or as defined by product rules) and appear on their history view.
3. **Given** admin has disabled a bonus type, **When** the user views the form, **Then** the disabled bonus is not shown or is read-only with explanation.
4. **Given** current time is **before** the tournament answers lock, **When** the user changes any of the five tournament answers and saves, **Then** the new values are stored and visible in history.
5. **Given** current time is **after** the tournament answers lock, **When** the user attempts to edit tournament answers, **Then** the product prevents edits and surfaces an appropriate message.

---

### User Story 3 — Admin configuration of bonuses and tournament questions (Priority: P2)

A user with an **Admin** role opens an administration area and **adjusts whether bonus prompts apply per match or at tournament level**, turns specific prompts on or off, and manages the **five tournament prediction prompts** (wording and active state) **without code changes**.

**Why this priority**: Operational flexibility for the organiser; avoids redeploys for copy and structure changes.

**Independent Test**: Change a setting as Admin, sign in as a normal participant, confirm UI reflects the change within the same session or after refresh per caching rules.

**Acceptance Scenarios**:

1. **Given** an Admin, **When** they switch a bonus from “match-scoped” to “tournament-scoped” (or equivalent), **Then** participant forms and labels update accordingly for new submissions.
2. **Given** an Admin, **When** they edit tournament question text or deactivate a question, **Then** participants no longer see inactive items, and historical answers remain interpretable (read-only or labeled as prior wording).
3. **Given** a non-admin participant, **When** they attempt to open admin routes, **Then** they are denied access.
4. **Given** an Admin, **When** they set or change the **tournament answers lock** time, **Then** that value is the single source of truth for FR-012 (subject to the unset default in Clarifications).

---

### User Story 4 — Personal prediction history and points (Priority: P2)

A participant views a **history** area listing **past predictions** (match and tournament entries) with **points awarded** where scoring has been applied, so they can audit how their total was built.

**Why this priority**: Trust and engagement; ties directly to transparency of scoring.

**Independent Test**: After known scoring inputs, the user sees rows that match expected points for sample matches and tournament questions.

**Acceptance Scenarios**:

1. **Given** completed matches with recorded results, **When** the user opens history, **Then** they see each relevant prediction with points attributed or “pending” if results incomplete.
2. **Given** tournament question scoring, **When** points are published, **Then** history shows per-question contribution where the rules expose that detail.

---

### User Story 5 — Per-match community prediction list (Priority: P3)

A participant opens a **match detail** view and sees a **list of all participants’ submitted picks** for that match (subject to privacy norms for this community—typically display names and picks, not private contact data).

**Why this priority**: Social proof and fun; secondary to personal submission and history.

**Independent Test**: With multiple test accounts, verify the list shows one row per participant who submitted before lock, with stable display identity.

**Acceptance Scenarios**:

1. **Given** several users have saved pre-lock predictions for a match, **When** a user views the match list, **Then** they see each participant’s display name (or agreed identifier) and predicted winner for that match.
2. **Given** a user did not submit before lock, **When** the list is shown, **Then** they **do not appear** on the community list for that match (non-submitters are omitted entirely).

---

### User Story 6 — One-time migration and identity linking (Priority: P3)

Participants with **legacy spreadsheet rows keyed by name** can **link historical performance** to their account either through **operator-provided email mapping** or by **selecting a recognized alias** from a controlled list during registration or first login, so past points are not lost.

**Why this priority**: Continuity from MVP1 migration theme; can follow core gameplay if schedule slips.

**Independent Test**: Dry-run with anonymized CSV: mapped users see imported historical rows; unmapped users see a clear path to claim or skip.

**Acceptance Scenarios**:

1. **Given** legacy data includes a name with a known email, **When** the user signs in with that email, **Then** their historical predictions or totals attach without duplicate public identities.
2. **Given** ambiguous or duplicate legacy names, **When** the user registers, **Then** they can pick an alias from a dropdown of **unclaimed** legacy names **or** skip and start fresh, with no silent merge of two people into one score.

### Edge Cases

- **Admin changes question text** after some users answered: historical submissions remain tied to question version or snapshot per assumptions; no silent overwrite of past answers.
- **Tournament question edits mid-season**: product either freezes wording per season phase or versions questions; default assumption: admin deactivation hides from new picks but keeps old answers visible in history.
- **Lock boundary**: Match-level picks follow MVP1’s strict pre-start lock. **Tournament answers** use a separate **tournament answers lock** instant (UTC), set by Admin with the default described in Clarifications; after lock, tournament answers cannot change.
- **Duplicate display names** on public lists: disambiguate per MVP1 edge-case approach (subtle suffix or secondary label).
- **Migration conflict**: Two users try to claim the same legacy alias—second claimant is blocked with a clear message and operator escalation path.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST present the **full IPL 2026 match schedule** available to the organisers (all fixtures the competition supports in-app), with each fixture showing competing sides and scheduled start time in **GMT/UTC** for internal logic, and user-visible labeling consistent with MVP1.
- **FR-002**: The product MUST provide **onboarding assistance** (inline help, short guide, or first-run panel) explaining prediction locks, match picks, bonuses, and tournament questions.
- **FR-003**: Participants MUST be able to submit and update **match winner** predictions subject to existing lock and upsert rules from MVP1 unless explicitly superseded here.
- **FR-004**: The system MUST support **bonus question responses** as configurable entities that can be scoped **per match** or **tournament-wide**, with at most one active interpretation per prompt type visible to participants at a time per admin configuration.
- **FR-005**: The system MUST support exactly **five tournament-level prediction questions** active for the season (admin may deactivate individual prompts, but the product caps at five simultaneous tournament prompts for MVP2).
- **FR-006**: Users with an **Admin** role MUST be able to manage bonus scope (match vs tournament), activate/deactivate prompts, and edit tournament question wording through a **web-based admin experience** without deploying new application code.
- **FR-007**: The system MUST persist, per participant, **match predictions**, **bonus answers** (as enabled), and **answers to the five tournament questions**, in a way that supports scoring and audit.
- **FR-008**: Participants MUST have a **personal history** view showing past predictions and **points earned** (or explicit pending state) for match and tournament contributions, aligned with published scoring rules.
- **FR-009**: For each match, participants MUST be able to open a **community prediction list** showing **only** participants who **submitted** a match-level pick before that match’s lock, with display name and predicted winner for that match; **no** email or other contact fields; non-submitters MUST NOT appear as rows.
- **FR-010**: The product MUST support **one-time migration** of legacy name-based predictions by **email reconciliation** and/or **alias selection** from an authoritative list of legacy names; duplicate claims MUST be prevented.
- **FR-011**: Non-admin users MUST NOT access admin configuration screens or actions.
- **FR-012**: The product MUST enforce a single **tournament answers lock** instant (UTC) for edits to the five tournament-level questions: participants MAY revise those answers until that instant; afterward answers are read-only for the season. Admin MUST be able to set or adjust this instant via the admin experience; if unset, the product applies the **default lock** defined in Clarifications (first league match start, UTC).

### Key Entities *(include if feature involves data)*

- **Schedule entry / Match** *(extends MVP1)*: Full season coverage; optional link to round or venue if useful for UX (not required for MVP2 scoring).
- **Bonus prompt configuration**: Text, active flag, scope (match vs tournament), ordering, optional attachment to specific matches when match-scoped.
- **Tournament prediction question**: One of up to five slots; text; active flag; participant’s single answer per question per user for the season; edits allowed only **before** the tournament answers lock instant.
- **Extended prediction record**: Logical grouping of match-level pick, bonus responses, and tournament answers with timestamps for updates.
- **Points ledger entry** *(conceptual)*: Attribution of points to a participant for a specific prediction component (match, bonus, tournament question).
- **Legacy alias candidate**: Name string from historical data eligible for claim; linkage state (unclaimed, claimed by user id).
- **Admin actor**: Role with elevated permissions for configuration and for setting the **tournament answers lock** instant.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability tests, ≥85% of new participants complete onboarding help and submit at least one valid match prediction without support contact.
- **SC-002**: Admin users can change bonus scope or tournament question visibility in under 3 minutes and see the effect reflected for test participants on refresh.
- **SC-003**: History view matches manual scorekeeping for a sample of 20 prediction rows with 100% agreement on points where results are final.
- **SC-004**: For a match with N test participants, the community list shows exactly the set of pre-lock submissions (correct count and no duplicates).
- **SC-005**: Migration dry-run: ≥95% of legacy rows with resolvable email or unique alias claims map to exactly one account without collision errors.

## Assumptions

- **Scoring**: Point calculations for bonuses and tournament questions follow the same Althara IPL Predictions rulebook used for the spreadsheet era; exact formulas may live in a companion scoring spec managed by organisers.
- **Tournament questions**: Five questions are **content-managed** by Admin; participants answer each once per season unless the organisers publish a phased rule (MVP2 assumes one answer set per user for the five prompts unless amended).
- **Bonus flexibility**: “Match vs tournament” scope is a **configuration toggle**, not simultaneous duplicate prompts for the same semantic question.
- **Admin role**: Small trusted set; assignment mechanism (invite, DB flag) is an implementation detail.
- **Community list privacy**: Display names only; aligns with MVP1 public leaderboard stance.
- **Lock times**: Match picks use MVP1 UTC lock. **Tournament answers** use the dedicated **tournament answers lock** (UTC), admin-configurable with **default** = start of the first IPL 2026 league match in schedule—see Clarifications and FR-012.

## Out of Scope *(MVP2)*

- Real-time chat, push notifications, or native mobile apps.
- Automated VAR-style dispute resolution for scoring disagreements (operators resolve offline).
- Unlimited tournament questions beyond five simultaneous slots (would be a later release).
