# Remove Boundary "What Next?" Transition Prompts — Design

## Problem

The workflow-monitor extension has two distinct kinds of multiple-choice prompts:

- **Kind A — boundary "What next?" prompts.** Fired from the `agent_end` handler in
  `extensions/workflow-monitor.ts` via `computeBoundaryToPrompt` (in `workflow-tracker.ts`) +
  `getTransitionPrompt` (in `workflow-transitions.ts`). Five variants: *"Design committed. What
  next?"*, *"Plan ready. What next?"*, *"Execution complete. What next?"*, *"Verification passed.
  What next?"*, *"Review complete. What next?"* — each a blocking `ctx.ui.select` modal with
  options Next step / Fresh session / Skip / Discuss.
- **Kind B — skip-confirmation / completion gates.** *"Phase X is unresolved. What would you like
  to do?"* prompts, fired only when a phase command or a ship action (`git commit`/`push`/`gh pr
  create`) would jump past a phase still in `pending` status.

Kind A fires spontaneously on every `agent_end`, independent of what the user or agent was just
doing. Two problems observed in practice:

1. **False premise.** It fired with *"Design committed. What next?"* when no design had been
   committed — `computeBoundaryToPrompt` only checks `phases.brainstorm === "complete" &&
   !prompted.brainstorm`, and stale/reconstructed state can leave `brainstorm` marked `complete`
   without a design ever having been written this session.
2. **UX collision.** Even when correct, it's a blocking modal that pops on top of whatever the
   agent just said in chat — e.g. interrupting the agent's own clarifying question with an
   unrelated "what next?" prompt.

Kind B does not share these problems: it only fires in response to an explicit user action
(typing a phase command, or running a ship command), never spontaneously mid-conversation.

## Decision

Remove **Kind A only**. The skills already drive phase-to-phase transitions on their own
(`brainstorming` → invokes `writing-plans`; `writing-plans` offers the execution choice;
`subagent-driven-development`/`executing-plans` → invoke `finishing-a-development-branch`), and
manual control remains available via `/brainstorm`…`/finish`, `/superpowers stage <phase>`, and
`/workflow-next`. The tracker keeps tracking phase state and displaying the widget — it stops
proactively prompting.

Keep Kind B (skip-confirmation / completion gates) and the non-blocking editor pre-fills
(`/execute`'s two-execution-options text, the finish-phase reminder) — none of these fire
spontaneously, and they're separate guardrail/nudge features not part of this problem.

## Scope

### Removed

- `agent_end` handler block in `extensions/workflow-monitor.ts` (~lines 640-691) that calls
  `computeBoundaryToPrompt` → `getTransitionPrompt` → `ctx.ui.select`.
- `extensions/workflow-monitor/workflow-transitions.ts` — deleted entirely (only consumer is the
  removed `agent_end` block).
- `computeBoundaryToPrompt` and the `TransitionBoundary` type in
  `extensions/workflow-monitor/workflow-tracker.ts` — deleted.
- `prompted: Record<Phase, boolean>` field on `WorkflowTrackerState`, `markPrompted` (tracker) /
  `markWorkflowPrompted` (handler interface + impl), and its slot in the persisted-state
  snapshot/reconstruction path in `workflow-handler.ts`. Confirmed via grep this field's only
  consumer is `computeBoundaryToPrompt` — safe to remove alongside it rather than leave dormant.
- The `boundaryToPhase` map in `workflow-monitor.ts` (only used by the removed block).

### Kept unchanged

- Skip-confirmation gates: the `selectValue` prompts for unresolved-phase jumps (single and
  multi-phase variants) and `promptCompletionGate` for ship actions.
- `/execute` editor pre-fill (two execution options), finish-phase reminder pre-fill.
- All TDD/debug/verification monitor behavior — unrelated to this change.

## Completion marking (verified, no change needed)

Traced against current code: forward-phase-command marking already works correctly and does not
depend on Kind A.

- `WorkflowTracker.advanceTo(nextPhase)` auto-completes the *current active* phase whenever the
  target phase is later in `WORKFLOW_PHASES` order: if you're in `brainstorm` (active) and type
  `/plan`, `advanceTo("plan")` sees `brainstorm` active + forward progress and marks it
  `complete` before activating `plan`.
- If a later phase is entered without ever visiting an earlier one, the earlier phase remains
  `pending` (never falsely `complete`) — and the (kept) skip-confirmation gate correctly flags it
  as unresolved, offering Do-phase-now / Skip / Cancel.
- `verify` has an independent auto-complete path (unaffected by this change): it flips to
  `complete` when a passing test-command result is observed while `verify` is the active phase.

Because Kind A's removal means nothing else marks earlier phases complete besides this
forward-advance behavior, a regression test locking in "active phase auto-completes on explicit
forward phase-command" is added as part of this work (see Testing).

## Testing

- **Delete:** `tests/extension/workflow-monitor/transition-prompt.test.ts`,
  `tests/extension/workflow-monitor/workflow-transitions.test.ts`.
- **Update:** `workflow-handler-tracker.test.ts`, `workflow-tracker.test.ts`,
  `state-persistence.test.ts` — remove `prompted`/`markPrompted`/boundary-related assertions.
- **Add:** a regression test asserting that an explicit forward phase-command (e.g. `/plan` while
  `brainstorm` is active) marks the earlier phase `complete`, per the Completion Marking section
  above.
- Full suite (`npm test`) must pass with 0 failures before this work is considered done.

## Docs

- `README.md` — rewrite the "Workflow Tracker" section (currently documents the 4-option boundary
  prompt) to describe tracking + widget only, no proactive prompting. Reword the `/workflow-next`
  deprecation note — it currently frames `/workflow-next`/`/superpowers stage` as "subsuming" the
  boundary-prompt behavior; after this change they're just the manual hand-off/stage-set tools,
  not a replacement for an auto-prompt.
- `docs/workflow-phases.md` — remove the boundary-prompt-options paragraph under "Boundary
  prompts and skipping"; keep the skip-confirmation-gate description.
- `docs/oversight-model.md` — check for Kind-A-specific wording and adjust if present (the
  document is largely about TDD/debug/practice violations, which are unaffected).
- `CHANGELOG.md` — add an `[Unreleased]` entry describing the removal and rationale.

## Out of scope

- Any change to Kind B (skip-confirmation / completion gates).
- Any change to TDD, debug, or verification monitors.
- Investigating the exact historical trigger of the stale `brainstorm: complete` state that
  caused the false-premise firing observed in practice — removing Kind A makes the question moot
  (there's no longer a prompt that can fire on it), so no further root-cause work is planned here.
