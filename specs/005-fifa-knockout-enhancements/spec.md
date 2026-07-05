# Feature Specification: FIFA Knockout Enhancements

**Feature Branch**: `005-fifa-knockout-enhancements`  
**Created**: 2026-07-05  
**Status**: Draft  
**Input**: User description: "Four new features: (1) Tournament Forecast tab with three bracket-aware knockout questions, aggregate stats with admin visibility toggle; (2) Auto-update future match team names from official fixtures when admin records winners; (3) AI-generated bonus questions for odd-numbered matches with flat 3-point scoring and no penalties; (4) Hide regular match community predictions from non-admin members until kickoff."

**Depends on**: FIFA tournament foundation from `specs/004-fifa-tournament-reset/` (fixture import, knockout stages, admin tabs, stage-based match scoring) and existing tournament/bonus prediction patterns from MVP2/MVP3.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Tournament Forecast predictions (Priority: P1)

As a participant, I want a dedicated **Tournament Forecast** tab where I predict the four semi-finalists, the two finalists, and the tournament winner using choices that respect the official knockout bracket, so my long-range picks stay realistic and I can revise them until the quarter-finals begin.

**Why this priority**: This is the headline knockout engagement feature; it defines a new prediction surface distinct from per-match picks and season bonus questions.

**Independent Test**: Open the Tournament Forecast tab before quarter-final kickoff; select four semi-finalists with bracket constraints enforced; narrow to two finalists and one winner from prior selections; confirm saves persist and edits are blocked after the quarter-final lock instant.

**Acceptance Scenarios**:

1. **Given** the participant is on the Tournament Forecast tab before the quarter-final lock, **When** they select four teams as semi-finalists, **Then** each selection must be a team still eligible in the knockout bracket, and the product prevents selecting two teams that could not both reach the semi-finals under bracket pairing rules (e.g., selecting one team automatically hides its same-side Round of 16 opponent).
2. **Given** the participant has saved four semi-finalists, **When** they choose two finalists, **Then** only teams from their semi-finalist set are available, and the product enforces that the two finalists could meet in the final under bracket structure (one from each semi-final half of the draw).
3. **Given** the participant has saved two finalists, **When** they choose the winner, **Then** the winner must be one of those two finalists.
4. **Given** one or more Round of 16 matches have a recorded result, **When** the participant opens or edits semi-finalist picks, **Then** eliminated teams are no longer selectable and any saved pick containing an eliminated team is flagged for correction before save.
5. **Given** current time is at or after the scheduled kickoff of the first quarter-final match, **When** a participant attempts to create or change Tournament Forecast answers, **Then** the product prevents edits and shows a clear locked message.
6. **Given** the participant saved valid forecast answers before lock, **When** they return after lock, **Then** their answers remain visible read-only.

---

### User Story 2 — Hide regular match predictions until kickoff (Priority: P1)

As a participant, I should not see other members’ regular match predictions before kickoff, so early picks are not spoiled; as an admin, I need to review all submissions at any time for operational oversight.

**Why this priority**: Directly affects fairness and trust for the core per-match prediction experience during the live tournament.

**Independent Test**: Two regular participants submit picks on the same open match; before kickoff one cannot see the other’s pick on the community list while an admin can; after kickoff both can see all submitted picks.

**Acceptance Scenarios**:

1. **Given** a match has not reached kickoff and at least one participant has submitted a match-winner prediction, **When** a regular (non-admin) member opens the community prediction view for that match, **Then** they see only their own submission or a message that community picks unlock at kickoff—not other participants’ picks.
2. **Given** the same match before kickoff, **When** an admin opens the community prediction view, **Then** they see all submitted picks with participant display names.
3. **Given** a match has reached kickoff, **When** any signed-in member opens the community prediction view, **Then** they see all participants who submitted before that match’s prediction lock, consistent with existing community-list rules.
4. **Given** a regular member views aggregate or list surfaces other than the per-match community list (e.g., leaderboard, personal history), **When** before kickoff, **Then** other members’ unrevealed match picks are not exposed through those surfaces either.

---

### User Story 3 — Automatic knockout team propagation (Priority: P2)

As an admin, when I record a match winner, I want the winner automatically placed into the correct future knockout fixture and fixture metadata kept aligned with the official schedule, so I do not manually re-type advancing teams or chase schedule changes.

**Why this priority**: Knockout operations are error-prone without automation; accurate team names unlock valid predictions and scoring.

**Independent Test**: Record a Round of 16 winner; verify the corresponding quarter-final slot updates to show that team; run an official schedule sync and confirm match numbers and kickoff times update without breaking fixture identity.

**Acceptance Scenarios**:

1. **Given** a knockout match with a recorded winner, **When** the admin saves the result, **Then** the product updates the designated next-round match slot(s) for that winner using the official bracket progression map.
2. **Given** a future knockout match whose participant was updated by propagation, **When** a participant views that match, **Then** they see the current team name(s), not placeholder labels, where the advancing team is known.
3. **Given** authoritative official fixture data is available for match numbers and kickoff times, **When** an admin triggers a schedule sync (or the product runs its agreed sync workflow), **Then** future matches reflect updated times and numbering from the official source without creating duplicate fixtures.
4. **Given** a propagation or sync conflict (e.g., a slot already has a different team from a prior manual edit), **When** the update runs, **Then** the product surfaces the conflict clearly to the admin rather than silently overwriting without notice.

---

### User Story 4 — AI bonus questions on odd-numbered matches (Priority: P2)

As a participant, I want engaging bonus questions on selected upcoming matches; as an admin, I want sensible AI-drafted questions attached to odd-numbered fixtures from the current point forward, scored simply at three points with no penalty for wrong answers.

**Why this priority**: Adds variety and engagement for remaining fixtures without complex stage-weighted bonus scoring.

**Independent Test**: Identify the next odd-numbered match without a bonus; confirm a generated question appears; submit correct and incorrect answers after the match is scored and verify ledger shows +3 or 0 only.

**Acceptance Scenarios**:

1. **Given** an odd-numbered match from the deployment cutoff forward that has no bonus prompt yet, **When** the match becomes available for predictions, **Then** the product attaches a bonus question with answer options appropriate to that fixture (teams, stage, or match context).
2. **Given** a generated bonus question, **When** an admin reviews it before lock, **Then** they can edit wording, adjust options, disable it, or replace it with a manually authored question.
3. **Given** a participant answers the bonus and the admin records the official correct answer, **When** scoring runs, **Then** a correct bonus earns exactly 3 points and an incorrect bonus earns 0 points regardless of tournament stage.
4. **Given** an even-numbered match, **When** no admin manually adds a bonus, **Then** no automatic AI bonus is required for that match under this feature’s scope.

---

### User Story 5 — Tournament Forecast community statistics (Priority: P3)

As a participant or admin, I want to see aggregate Tournament Forecast statistics in a separate area, controlled by an admin visibility toggle, so the community can optionally compare long-range picks without exposing individual answers before the organizer chooses.

**Why this priority**: Builds social engagement around forecast picks but is secondary to submitting one’s own forecast.

**Independent Test**: Toggle visibility off—only admin sees aggregate stats; toggle on—all signed-in members see the same aggregates; individual user identities are not required in the default aggregate view.

**Acceptance Scenarios**:

1. **Given** the Tournament Forecast visibility toggle is **off** (default), **When** a regular member navigates to forecast statistics, **Then** they cannot access the aggregate view (hidden navigation or access-denied message).
2. **Given** the toggle is **off**, **When** an admin opens forecast statistics, **Then** they see aggregate distributions (e.g., share of participants picking each team as semi-finalist, finalist, or winner).
3. **Given** the admin sets the toggle to **on**, **When** any signed-in member opens forecast statistics, **Then** they see the same aggregate distributions without needing admin role.
4. **Given** at least ten participants have submitted forecasts, **When** an authorized viewer opens statistics, **Then** counts and percentages reflect all saved forecasts as of the latest refresh, without revealing which participant chose which team unless a separate drill-down is explicitly in scope (out of scope: named individual forecast leaderboard in v1).

---

### Edge Cases

- Participant’s saved semi-finalist set includes a team eliminated in Round of 16 before they edit: product blocks save until invalid teams are replaced; read-only view after quarter-final lock may show stale invalid picks with a clear “locked with invalid selections” label rather than silently deleting history.
- Bracket logic when Round of 16 is partially complete: only teams still alive in the bracket appear; bye or placeholder teams in unfinished group-to-knockout slots follow the same eligibility rules as confirmed teams once known.
- Quarter-final lock uses the **earliest scheduled kickoff** among quarter-final fixtures in the official schedule; if that match is rescheduled via official sync, the lock instant moves accordingly.
- Tournament Forecast statistics with fewer than a small minimum number of submissions (assumption: fewer than 3): show counts but suppress percentage breakdowns or show “insufficient data” to avoid de-anonymizing participants.
- AI-generated bonus content that is nonsensical or off-topic: admin can disable or replace; product applies basic content guardrails (no offensive language, must reference match-relevant entities).
- Schedule sync changes kickoff to an earlier time that has already passed: treat as immediately locked for new predictions per existing lock rules; notify admin of the schedule change.
- Admin records winner for a match whose next-round slot is shared by two possible paths (e.g., before both prior matches complete): only update slots when the bracket path is unambiguous, or update the specific slot tied to that match’s bracket position.
- Hide-until-kickoff rule applies to **regular match** community visibility only; Tournament Forecast individual answers remain private to each participant until statistics toggle and aggregate rules say otherwise (aggregates never expose single-user picks when below minimum threshold).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST provide a **Tournament Forecast** tab separate from per-match prediction and from existing season bonus question areas.
- **FR-002**: The Tournament Forecast tab MUST include exactly three linked prediction prompts: (a) four semi-finalists, (b) two finalists chosen from the semi-finalist set, (c) one winner chosen from the finalist set.
- **FR-003**: Semi-finalist selection MUST enforce official knockout **bracket pairing rules** so mutually exclusive same-side Round of 16 opponents cannot both be selected (selecting one hides or disables the other).
- **FR-004**: As Round of 16 results are recorded, the product MUST remove eliminated teams from semi-finalist eligibility and require correction before saving if a participant’s draft contains eliminated teams.
- **FR-005**: Finalist selection MUST enforce bracket feasibility (two teams that could both reach the final given the draw) and MUST be limited to the participant’s saved semi-finalist picks.
- **FR-006**: Winner selection MUST be limited to the participant’s saved finalist picks.
- **FR-007**: Tournament Forecast answers MUST remain editable until the scheduled kickoff of the **first quarter-final match** (Round of 8); after that instant they MUST be immutable for the season.
- **FR-008**: The product MUST provide a **Tournament Forecast statistics** view showing aggregate pick distributions for semi-finalists, finalists, and winner.
- **FR-009**: An admin-controlled toggle MUST govern whether Tournament Forecast statistics are visible to all signed-in members; **default is off** (admin-only).
- **FR-010**: When the toggle is off, only users with admin role MAY access Tournament Forecast statistics; when on, all signed-in members MAY access them.
- **FR-011**: For regular (non-admin) members, community match prediction lists MUST NOT display other participants’ picks for a match until that match’s scheduled kickoff time.
- **FR-012**: Admin users MUST be able to view all submitted regular match predictions at any time before or after kickoff.
- **FR-013**: After kickoff, community match prediction visibility for regular members MUST follow existing rules (show all pre-lock submitters).
- **FR-014**: When an admin records a knockout match winner, the product MUST automatically assign that team to the correct next-round fixture slot(s) per the official bracket map.
- **FR-015**: The product MUST support refreshing future fixture **match numbers** and **kickoff times** from the authoritative official schedule source keyed by stable fixture identity, without duplicating fixtures.
- **FR-016**: For every **odd-numbered** match from the agreed deployment cutoff forward, the product MUST ensure a bonus question exists by the time participants can submit predictions, using AI-generated draft content that is sensible for that fixture.
- **FR-017**: Admins MUST be able to edit, disable, or replace AI-generated bonus questions before the match prediction lock.
- **FR-018**: Bonus questions created under this feature MUST award **3 points** for a correct answer and **0 points** for an incorrect answer, with **no negative points**, independent of knockout stage.
- **FR-019**: The product MUST NOT expose other members’ unrevealed regular match picks through leaderboard, history, or other surfaces before kickoff (except the viewing user’s own picks and admin views).

### Key Entities *(include if feature involves data)*

- **Tournament Forecast answer set**: Per participant, per season; stores four semi-finalist team selections, two finalist selections, and one winner; tracks lock state relative to quarter-final kickoff.
- **Knockout bracket map**: Logical mapping from each knockout fixture to its winner’s next fixture slot and same-side exclusion groups for Round of 16 pairing—derived from official schedule/bracket data, not user-editable.
- **Forecast visibility setting**: Season-level admin flag (default hidden) controlling whether aggregate forecast statistics are public to all members.
- **Fixture sync record**: Association between stable fixture identity and official match number, kickoff time, and participant team names as last synced from the authoritative schedule source.
- **AI bonus prompt**: Match-scoped bonus question with generated text and options, editable by admin, scored at flat +3 / 0.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of test participants can complete all three Tournament Forecast selections in under 5 minutes on first attempt without selecting an bracket-invalid combination.
- **SC-002**: Within 1 minute of an admin recording a knockout winner, the correct next-round fixture displays the advancing team name in 100% of bracket-unambiguous test cases.
- **SC-003**: After official schedule refresh, 100% of future fixtures retain stable identity while reflecting updated kickoff times where the source changed.
- **SC-004**: For odd-numbered matches from the cutoff forward, 100% have an active bonus question available before participant lock in acceptance testing.
- **SC-005**: Scoring verification shows bonus questions from this feature never apply negative points (0% incorrect answers with negative ledger deltas).
- **SC-006**: In pre-kickoff testing, 0% of regular-member sessions expose another participant’s match pick on community views; post-kickoff, 100% of pre-lock submitters appear for authorized viewers.
- **SC-007**: Admin toggle change for forecast statistics takes effect for test users on next page load without redeploy.
- **SC-008**: At least 80% of pilot users report the Tournament Forecast tab is “clear” or easier in a brief feedback prompt (qualitative survey after release).

## Assumptions

- **Quarter-final lock**: “Round of 8” means the quarter-final stage (eight teams remaining); lock instant is the earliest quarter-final kickoff in the official schedule.
- **Bracket source**: Official FIFA World Cup 2026 knockout bracket structure from imported fixture data is the single source of truth for pairing and propagation rules.
- **Existing tournament bonus questions**: This feature’s Tournament Forecast tab is additive; existing season-long bonus questions (if still active) remain in their current area unless a later consolidation is requested.
- **Forecast scoring**: Individual forecast answers may be scored in a future phase; this spec requires capture, lock, and aggregate statistics. If scoring is enabled in the same release, it uses admin-configurable flat points per forecast slot (similar to existing tournament bonus slots), not stage-based penalties.
- **AI bonus cutoff**: “From here on” means odd-numbered matches with match numbers strictly greater than the highest match number that already has a participant-visible bonus at deployment time, plus all subsequent odd-numbered fixtures.
- **AI content workflow**: Generated questions are auto-attached; admin review is optional but recommended; disabling a generated question leaves the match without a bonus unless the admin adds one manually.
- **Schedule sync trigger**: Admin-initiated sync from Tournament Settings (or equivalent) is sufficient for v1; unattended polling is out of scope unless added during planning.
- **Community list scope**: Hide-until-kickoff applies to match-winner community lists, not to Tournament Forecast aggregates governed by FR-009/FR-010.
- **Minimum aggregate threshold**: Forecast statistics suppress percentages when fewer than three forecasts exist, showing counts only or an insufficient-data message.
- **Depends on 004**: Knockout stages, admin tab organization, and FIFA fixture import from the FIFA reset feature are available before this feature ships.
