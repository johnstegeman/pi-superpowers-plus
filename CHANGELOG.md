# Changelog

All notable changes to pi-superpowers-plus are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

_No changes yet._

---

## [0.6.0] — 2026-07-29

### Summary

Unified `/superpowers` user command for inspecting and controlling workflow state, subsuming `/workflow-next` and `/workflow-reset`. The plan-tracker migrates to `appendEntry` persistence so slash-command task mutations are durable across session restore/fork.

### Added

- **`/superpowers` command** — unified user command for workflow state:
  - `/superpowers` — full status dashboard (workflow stage, tasks, TDD phase, debug state, verification).
  - `/superpowers tasks [list|add|remove|complete|reset|rewind]` — manipulate plan-tracker tasks directly (mutations persist via `plan_tracker_state` appendEntry).
  - `/superpowers stage [show|<phase>|reset]` — view or advance the workflow stage in place (non-session-spawning counterpart to `/workflow-next`).
  - `/superpowers reset` — reset all workflow state (workflow + TDD + debug + verification + tasks).
  - (`/superpowers query` is not implemented; tracked as future work.)
- **`plan_tracker` tool: `add`/`remove`/`rewind` actions** — the tool can now append a task, remove a task by index, and rewind a task + all later tasks to `pending` (in addition to the existing init/update/status/clear).
- **`plan-tracker-state.ts` shared module** — the single source of truth for the task list, imported by both the `plan_tracker` tool and the `/superpowers tasks` command. Exports mutators + `persistTasks` (appendEntry) + `reconstructTasksFromBranch` (with legacy tool-result-details fallback).
- **`plan-tracker-render.ts`** — shared TUI widget renderer used by both the tool and the command.
- **`resetWorkflowOnly()` handler method** — resets the workflow tracker only (distinct from `resetState`, which resets the monitors too); used by `/superpowers stage reset`.

### Changed

- **Plan-tracker persistence migrated to `appendEntry`** — task state now persists via `pi.appendEntry("plan_tracker_state", tasks)` (mirroring the workflow-monitor's `superpowers_state` pattern), making slash-command task mutations durable across session restore/fork. The `plan_tracker` tool's existing tool-result `details` are preserved for backward compatibility; old sessions reconstruct from legacy `details` until a new mutation appends a `plan_tracker_state` entry.
- **`plan-tracker.ts` refactored** to a thin wrapper over the shared `plan-tracker-state` module (removed duplicate state/types/reconstruction).
- **Package version** bumped to `0.6.0`.

### Deprecated

- **`/workflow-next`** — subsumed by `/superpowers stage <phase>` (still works; deprecation notice in its description).
- **`/workflow-reset`** — subsumed by `/superpowers reset` (still works; deprecation notice in its description). Removal is a future change.

---

## [0.5.0] — 2026-07-28

### Summary

Synced skill content with the original [`obra/superpowers`](https://github.com/obra/superpowers) @ v6.2.0 (commit `3dcbd5c`), with deliberate fork adaptations. Adds a new skill (`using-superpowers`), reworks Subagent-Driven Development to upstream's unified-reviewer model, and ports substantive content into all remaining skills. Driven by the gap analysis in `docs/upstream-sync-analysis.md`.

### Added

- **`using-superpowers` skill** — the bootstrap/meta skill for skill-invocation discipline (Red Flags rationalization table, Skill Priority, User Instructions precedence). Ported Option B trimmed: drops the aggressive "invoke before ANY response" mandate + `<EXTREMELY-IMPORTANT>`/`<SUBAGENT-STOP>` blocks to keep context clean and align with the roadmap's command-driven direction. Includes a pi-specific `references/pi-tools.md` mapping skill actions to the fork's bundled `subagent`/`plan_tracker` tools. Skill count 12 → 13.
- **Reworked Subagent-Driven Development** — replaces the fork's two-stage spec-then-quality review with upstream's model: unified `task-reviewer` (spec + quality in one pass), scoped `re-review` for fix rounds, 5-round fix loop with breaker + adjudication, plan-scoped progress ledger (compaction-survival), context-hygiene scripts (`sdd-workspace`/`task-brief`/`review-package`), pre-flight plan-conflict scan, and a Global Constraints lens for reviewers. Fork adaptations: `subagent({agent, task})` dispatch shape, model selection stripped (deferred to a future change), `plan_tracker` kept alongside the ledger, and the end-of-plan user checkpoint preserved.
- **SDD helper scripts** — `scripts/sdd-workspace` (per-plan git-ignored scratch dir), `scripts/task-brief` (extract one task's text to a file), `scripts/review-package` (commit list + diff to a file). Adapted the `sdd-workspace` comment to drop a Claude-specific rationale.
- **`task-reviewer-prompt.md` + `re-review-prompt.md`** — unified task reviewer and scoped re-reviewer prompt templates, adapted to the fork's `subagent({agent, task})` dispatch form.
- **`writing-good-tests.md`** — replaces `testing-anti-patterns.md` with upstream's two-principle rewrite: Name the Break (derive expectations independently, no change detectors, behavior not text) + Exercise the Real Thing (mock earns no assertions, mock at the right level, mirror real data) + a Mutation Check. The `tdd-anti-patterns` `workflow_reference` topic is repointed to this file (topic name kept for backward compatibility).
- **brainstorming process enforcement** — HARD-GATE (no implementation skill/code until design approved), "Anti-Pattern: This Is Too Simple To Need A Design" callout, 8-item Checklist, Process Flow graphviz, Spec Self-Review, and a User Review Gate between spec and plan. Drops visual-companion + elements-of-style references (fork lacks those assets).
- **using-git-worktrees restructured model** — Step 0 (detect existing isolation via `GIT_DIR`/`GIT_COMMON` + submodule guard), Step 1a (native worktree tools, preferred) / Step 1b (git worktree fallback), sandbox fallback, and a Common Rationalizations table replacing the old Common Mistakes/Red Flags/Example Workflow guard sections.
- **finishing-a-development-branch reworked model** — 6-step process with the worktree-path-capture fix (Step 2 captures `WORKTREE_PATH` before Step 5 changes directory, so Step 6 cleanup can use it), forge-agnostic PR creation (detect remote platform, no hardcoded `gh`), discard only on explicit typed `discard` confirmation, and a Common Rationalizations table.
- **writing-plans structural improvements** — Task Right-Sizing section, Global Constraints header in the plan template, per-task Interfaces blocks (Consumes/Produces), checkbox (`- [ ]`) step syntax, 4-backtick nested fences, and a Self-Review section. Drops the stale "created by brainstorming skill" line (replaced with "at execution time via `/skill:using-git-worktrees`").
- **`[DIFF_FILE]` placeholder in `code-reviewer.md`** — optional placeholder for a pre-generated review package path, resolving the contract gap where the SDD final-review dispatches the template "passing the printed package path" but the template had no placeholder for it. Inline `git diff` fallback preserved for ad-hoc reviews.
- **Upstream-sync documentation** — the gap analysis (`docs/upstream-sync-analysis.md`) plus per-tier design specs and implementation plans under `docs/superpowers/{specs,plans}/`.

### Changed

- **Subagent dispatch shape** — all skills/prompt templates now use the fork's `subagent({ agent, task })` form instead of upstream's `Subagent (general-purpose):` template. No `Subagent (general-purpose):` references remain in `skills/`.
- **Skill references** — all `superpowers:X` syntax converted to `/skill:X` (fork convention). No `superpowers:` references remain in `skills/`.
- **`agents/spec-reviewer.md` → `agents/task-reviewer.md`** — renamed to match the unified task-reviewer role (spec + quality in one pass). Read-only tool set unchanged. README Bundled Agents table + directory tree updated.
- **`pi-tools.md` dispatch ref** — the mapping table now references the fork's `subagent({ agent, task })` form instead of upstream's `Subagent (general-purpose):` template.
- **`implementer-prompt.md`** — replaced with upstream's richer version: report-file contract (write full report to a file, return a <15-line status), structured TDD evidence (RED/GREEN), "When You're in Over Your Head" escalation, and code-organization guidance.
- **`requesting-code-review` + `code-reviewer.md`** — adopted upstream's Common Rationalizations table (review-guards) and context-isolation principle.
- **`dispatching-parallel-agents`** — adopted the context-isolation principle (agents never inherit session context) and converted dispatch examples to `subagent({ agent, task })`.
- **`systematic-debugging`** — dropped the overview filler line, added a Phase 4 `/skill:verification-before-completion` cross-ref.
- **README + ROADMAP** — skill count references bumped 12 → 13 (3 README spots + 1 ROADMAP spot) and the directory-tree markdown-file count 24 → 26.
- **Package version** bumped to `0.5.0`.

### Fixed

- **`find-polluter.sh`** — accepts `./`-prefixed test patterns and matches top-level test files (patterns like `src/**/*.test.ts` no longer skip `src/top.test.ts`). Verbatim port of two upstream bug fixes.
- **`root-cause-tracing.md`** — anonymized an example path (`/Users/jesse/project/...` → `~/project/...`) for privacy/portability.

### Removed

- **`spec-reviewer-prompt.md` + `code-quality-reviewer-prompt.md`** — superseded by the unified `task-reviewer-prompt.md` + `re-review-prompt.md`.
- **`agents/spec-reviewer.md`** — role subsumed by `agents/task-reviewer.md`.
- **`testing-anti-patterns.md`** — replaced by `writing-good-tests.md`.
- **Recap / social-proof sections** — dropped carryover sections the original trimmed, consistent with the fork's own philosophy: "The Bottom Line" (receiving-code-review, verification-before-completion), "Remember" (writing-plans), "Why This Matters" (verification-before-completion). Rationalization tables and red-flags/checklists (the fork's "grew" content) are preserved.
- **Dangling `superpowers:writing-skills` cross-reference** — removed from `writing-good-tests.md` (the `writing-skills` skill is not ported to this fork).

### Deliberate fork choices (not adopted from upstream)

- **executing-plans keeps batch-with-checkpoints** — the fork frames executing-plans as the checkpointed alternative to SDD's continuous execution; removing batching would contradict the fork's own writing-plans/SDD framing.
- **Brainstorming visual companion not ported** (Tier 3) — the fork lacks `visual-companion.md`.
- **Per-role model selection deferred** — the SDD rework keeps one model across all 5 fix rounds; a separate "pick the best model for each phase" change can come later.
- **`writing-skills` meta-skill not ported** — it's a skill-authoring guide, low priority for end-users.

---

## [0.4.0] — 2026-02-20

### Changed

- **Specs/plans path convention** — Design/spec documents now live in `docs/superpowers/specs/` and implementation plans in `docs/superpowers/plans/` (previously both under `docs/plans/`). Skills (`brainstorming`, `writing-plans`), the workflow tracker, thinking-phase write enforcement, and user-facing docs all point at the new locations. Existing artifacts under `docs/plans/` are not moved.
- **Strict per-phase write boundaries** — During **Brainstorm**, writes are restricted to `docs/superpowers/specs/` only; during **Plan**, to `docs/superpowers/plans/` only. Previously any file under `docs/plans/` was allowed during either thinking phase. Cross-directory writes during a thinking phase now trigger a process violation.
- **Directory-based artifact detection** — The workflow tracker now detects phase artifacts by directory (`docs/superpowers/specs/` → brainstorm, `docs/superpowers/plans/` → plan) instead of by filename suffix.

### Fixed

- **Plan artifacts going undetected** — The previous `*-implementation.md` suffix rule did not match the `YYYY-MM-DD-<feature>.md` naming that `writing-plans` instructs agents to use, so most plan writes were never recorded as artifacts and the workflow phase did not advance. Directory-based detection resolves this.

### Removed

- **`tdd-guard` extension** — TDD enforcement is now handled via runtime warnings in `workflow-monitor` and three-scenario TDD instructions embedded in agent profiles and skill text. Agent profiles no longer need `extensions: ../extensions/tdd-guard.ts` in their frontmatter.

---

## [0.3.0] — 2026-02-18

### Summary

Hardening and skill boundary enforcement. Security fixes, resilient subagent lifecycle, and fixes for three behavioral gaps where the agent ignores skill boundaries.

### Security

- **Environment variable filtering** — subagent spawn now uses an allowlist instead of `{ ...process.env }`. Only safe vars (PATH, HOME, SHELL, NODE_*, PI_*, etc.) are forwarded. Secrets like API keys, database URLs, and cloud credentials are no longer leaked to subagent processes.
- **`PI_SUBAGENT_ENV_PASSTHROUGH`** — escape hatch for users who need to forward specific vars (comma-separated names).
- **CWD validation** — subagent spawn now validates the working directory exists before spawning, returning a clear error instead of a cryptic ENOENT.

### Added

- **Configurable subagent timeout** (`PI_SUBAGENT_TIMEOUT_MS`, default 10 min) — absolute timeout that kills subagents regardless of activity. Agent definitions can override via `timeout` field.
- **Cancellation propagation** — active subagent processes are tracked and killed (SIGTERM → SIGKILL) when the parent session exits.
- **Concurrent subagent cap** (`PI_SUBAGENT_CONCURRENCY`, default 6) — semaphore-based limit on parallel subagent spawns. When the cap is hit, new invocations queue until a slot opens.

### Fixed

- **SDD orchestrator codes on subagent failure** — Promoted subagent failure handling from buried bullet points to a gated section with hard rules. Explicit: the orchestrator does NOT write code, only dispatches subagents. 2 failed attempts = stop and escalate to user.
- **Review subagents apply fixes** — Added explicit read-only `## Boundaries` sections to `code-reviewer.md` and `spec-reviewer-prompt.md`. Reviewers produce written reports — they never touch code.
- **SDD auto-finishes without asking** — Added user checkpoint after all tasks complete. Orchestrator must summarize results and wait for user confirmation before dispatching final review or starting the finishing skill.
- Silent catch blocks in workflow-monitor now log warnings via `log.warn` instead of silently swallowing failures (state file read/write errors).

### Changed

- **Package version** bumped to `0.3.0`.

---

## [0.2.0-alpha.1] — 2026-02-13

### Summary

First-class subagent support. Skills now dispatch implementation and review work via a bundled `subagent` tool instead of shell commands. Four default agent definitions ship with the package. The workflow monitor and TDD enforcement both received important correctness fixes.

### Added

- **Subagent extension** (`extensions/subagent/`) — vendored from pi's example extension. Registers a `subagent` tool that spawns isolated pi subprocesses for implementation and review tasks. Supports single-agent and parallel (multi-task) modes.
- **Agent definitions** (`agents/`) — four bundled agent profiles:
  - `implementer` — strict TDD implementation with the tdd-guard extension
  - `worker` — general-purpose task execution
  - `code-reviewer` — production readiness review (read-only)
  - `spec-reviewer` — plan/spec compliance verification (read-only)
- **Agent frontmatter `extensions` field** — agent `.md` files can declare extensions (e.g. `extensions: ../extensions/tdd-guard.ts`), which are resolved and passed as `--extension` flags to the subprocess.
- **TDD guard extension** (`extensions/tdd-guard.ts`) — lightweight TDD enforcement designed for subagents. Blocks production file writes until a passing test run is observed. Tracks violations via `PI_TDD_GUARD_VIOLATIONS_FILE` env var. Exits after 3 consecutive blocked writes.
- **Structured subagent results** — single-agent mode returns `filesChanged`, `testsRan`, `tddViolations`, `agent`, `task`, and `status` fields in tool result details.
- **Shared test helpers** (`tests/extension/workflow-monitor/test-helpers.ts`) — `createFakePi()`, `getSingleHandler()`, `getHandlers()` extracted and shared across all workflow-monitor test files.
- **`parseSkillName()` utility** (`extensions/workflow-monitor/workflow-tracker.ts`) — centralized `/skill:name` and `<skill name="...">` extraction, replacing duplicated regexes.

### Fixed

- **Input event text field** — Workflow monitor now reads `event.text` (primary) with fallback to `event.input` for skill detection in user input. Previously only checked `event.input`, missing skills delivered via the `text` field.
- **Completion gate phase scoping** — Interactive commit/push/PR prompts now only fire during execute+ phases. Previously they could fire during brainstorm/plan, interrupting early-phase work (e.g. committing a design doc).
- **docs/plans allowlist path traversal** — The brainstorm/plan write allowlist now resolves paths against `process.cwd()` and requires the resolved path to be under `${cwd}/docs/plans/`. Previously, an absolute path like `/tmp/evil/docs/plans/attack.ts` would pass the substring check.
- **TDD guard pass/fail semantics** — The tdd-guard extension now requires a *passing* test result (exit code 0) to unlock production writes. Previously, any test command execution — including failures — would unlock writes.

### Changed

- **Skills updated for subagent dispatch** — `subagent-driven-development`, `dispatching-parallel-agents`, and `requesting-code-review` skills now show `subagent()` tool call examples instead of `pi -p` shell commands.
- **Package version** bumped to `0.2.0-alpha.1`.
- **`package.json` `files`** now includes `agents/` directory.
- **`package.json` `pi.extensions`** now includes `extensions/subagent/index.ts`.

### Internal

- Deduplicated ~180 lines of test helper boilerplate across 6 workflow-monitor test files.
- Added 8 new test files (67 new tests) covering subagent discovery, frontmatter extensions, structured results, tdd-guard behavior, completion gate phasing, path traversal, and input event handling.
- Total test count: **29 files, 251 tests**.

---

## [0.1.0-alpha.3] — 2026-02-12

### Summary

Warning escalation guardrails, branch safety, workflow tracking with phase boundaries, and the initial release of active enforcement extensions.

### Added

- Workflow Monitor extension with TDD, debug, and verification enforcement
- Plan Tracker extension with TUI widget
- 12 workflow skills ported and trimmed from pi-superpowers
- Branch safety notices (current branch on first tool result, confirm-branch on first write)
- Workflow phase tracking with boundary prompts and `/workflow-next` command
- Warning escalation: soft → hard block → user override
- `workflow_reference` tool for on-demand TDD/debug reference content

---

## [0.1.0-alpha.1] — 2026-02-10

Initial alpha release. Skills only, no extensions.
