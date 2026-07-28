# pi-superpowers-plus

![pi-superpowers-plus banner](banner-plus.jpg)

Structured workflow skills for [pi](https://github.com/badlogic/pi-mono).

Your coding agent doesn't just know the rules - it follows them. Skills teach the agent *what* to do (brainstorm before building, write tests before code, verify before claiming done), and a couple of small extensions support that workflow with tooling (task tracking, subagent dispatch).

## What You Get When You Install This

**13 workflow skills** that guide the agent through a structured development process - from brainstorming ideas through shipping code.

**2 extensions** that run silently in the background:
- **Plan Tracker** — tracks task progress with a TUI widget (`plan_tracker` tool).
- **Subagent** — registers a `subagent` tool for dispatching implementation and review work to isolated subprocess agents, with bundled agent definitions and structured results.

There's no runtime enforcement layer watching tool calls — the discipline (TDD, verification before claiming done, branch safety, etc.) lives entirely in the skill instructions the agent reads and follows.

## Install

```bash
pi install git:github.com/johnstegeman/pi-superpowers-plus
```

No configuration required. Skills and extensions activate automatically.

## Support

- Questions / support: https://github.com/johnstegeman/pi-superpowers-plus/discussions
- Bugs: https://github.com/johnstegeman/pi-superpowers-plus/issues/new/choose
- Feature requests: https://github.com/johnstegeman/pi-superpowers-plus/issues/new/choose
- Roadmap: [`ROADMAP.md`](ROADMAP.md)
- Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Upgrading from `pi-superpowers`

If you're currently using [`pi-superpowers`](https://github.com/coctostan/pi-superpowers), `pi-superpowers-plus` is intended as a drop-in upgrade: you keep the same skill names and workflow, with a few pi-specific tools layered on top.

### What stays the same
- The same core workflow skills (e.g. `/skill:brainstorming`, `/skill:writing-plans`, `/skill:executing-plans`, etc.)
- The same "structured workflow" idea and phase order

### What's new in `pi-superpowers-plus`
- **Three-scenario TDD model** — new feature (full TDD), modifying tested code (run existing tests), trivial change (judgment) — applied consistently across skills, agent profiles, and plan templates
- **Subagent dispatch** (`subagent` tool) for delegating implementation/review work to isolated subprocess agents
- **Plan Tracker tool** (`plan_tracker`) for task lists + TUI progress
- Restored inline red flags, rationalizations, and verification checklists in several skills for more self-contained guidance

### Migration
Replace `pi-superpowers` with `pi-superpowers-plus` in your config:

```json
{
  "packages": ["npm:pi-superpowers-plus"]
}
```

Notes:
- If you keep both packages enabled, you may get duplicate/competing skill guidance.

### How the skills differ (leveraging pi)

`pi-superpowers-plus` uses a couple of pi's runtime capabilities alongside skill content:
- **Three-scenario TDD** — skills, agent profiles, and plan templates all use the same model: new feature (full TDD), modifying tested code (run existing tests), trivial change (use judgment).
- The **TUI** shows plan-tracker task progress as a widget.
- Tools like **`plan_tracker`** store execution state outside the prompt.
- Reference material that used to bloat a skill's `SKILL.md` was split into separate reference files in the skill's own directory (e.g. `reference/rationalizations.md`), which the agent reads on demand instead of loading everything up front.

To make this concrete, here's the size of each skill's `SKILL.md` compared to the original [`coctostan/pi-superpowers`](https://github.com/coctostan/pi-superpowers) (approximate KB, at time of writing). Across the shared skills, total `SKILL.md` content went from **67.5KB → 66.5KB**. Skills that shrank moved content into separate reference files loaded on demand; skills that grew restored inline red flags, rationalizations, and verification checklists for self-contained guidance.

| Skill | pi-superpowers (KB) | pi-superpowers-plus (KB) | Change |
|---|---:|---:|---:|
| `brainstorming` | 2.5 | 2.9 | +16% |
| `dispatching-parallel-agents` | 6.2 | 6.1 | -2% |
| `executing-plans` | 2.7 | 3.5 | +30% |
| `finishing-a-development-branch` | 4.3 | 4.4 | +2% |
| `receiving-code-review` | 6.2 | 5.8 | -6% |
| `requesting-code-review` | 2.9 | 3.0 | +3% |
| `subagent-driven-development` | 10.2 | 11.3 | +11% |
| `systematic-debugging` | 9.8 | 7.2 | -27% |
| `test-driven-development` | 9.8 | 8.1 | -17% |
| `using-git-worktrees` | 5.5 | 6.1 | +11% |
| `verification-before-completion` | 4.1 | 4.3 | +5% |
| `writing-plans` | 3.3 | 3.8 | +15% |

## The Workflow

The skills guide the agent through a consistent development cycle:

```
Brainstorm → Plan → Execute → Verify → Review → Finish
```

| Phase | Skill | What Happens |
|-------|-------|--------------|
| **Brainstorm** | `/skill:brainstorming` | Refines your idea into a design document via Socratic dialogue |
| **Plan** | `/skill:writing-plans` | Breaks the design into bite-sized TDD tasks with exact file paths and code |
| **Execute** | `/skill:executing-plans` or `/skill:subagent-driven-development` | Works through tasks in batches with review checkpoints |
| **Verify** | `/skill:verification-before-completion` | Runs tests and proves everything works - evidence before claims |
| **Review** | `/skill:requesting-code-review` | Dispatches a reviewer subagent to catch issues before merge |
| **Finish** | `/skill:finishing-a-development-branch` | Presents merge/PR/keep/discard options and cleans up |

Progress through the workflow is tracked with the `plan_tracker` tool (see below) as the agent works through each phase's checklist; there's no separate phase-tracking widget.

### Supporting Skills

These skills are used within the main workflow as needed:

| Skill | When It's Used |
|-------|---------------|
| `/skill:test-driven-development` | During execution |
| `/skill:systematic-debugging` | When tests fail repeatedly |
| `/skill:using-git-worktrees` | Before execution - creates isolated branch workspace |
| `/skill:dispatching-parallel-agents` | When multiple independent problems need solving concurrently |
| `/skill:receiving-code-review` | When acting on review feedback - prevents blind agreement |

## Extensions

### Plan Tracker

The `plan_tracker` tool stores task state in the session and shows progress in the TUI:

```
Tasks: ✓✓→○○ (2/5)  Task 3: Recovery modes
```

```
plan_tracker({ action: "init", tasks: ["Task 1: Setup", "Task 2: Core", ...] })
plan_tracker({ action: "update", index: 0, status: "complete" })
plan_tracker({ action: "status" })
plan_tracker({ action: "clear" })
```

## How the Skills Work Together

Skills are markdown files the agent reads to learn *what* to do; discipline (TDD, investigating before fixing, verifying before claiming done) is entirely self-enforced by following the skill instructions — there's no runtime monitor watching for violations.

| Agent Behavior | Skill |
|---|---|
| Write test before code | `test-driven-development` (three-scenario) |
| Investigate before fixing | `systematic-debugging` |
| Run tests before claiming done | `verification-before-completion` |
| Follow workflow phases | All skills cross-reference each other |
| Dispatch implementation work | `subagent-driven-development` (uses the `subagent` tool) |
| Review before merge | `requesting-code-review` (dispatches a code-reviewer agent) |

## Subagent Dispatch

A bundled `subagent` tool lets the orchestrating agent spawn isolated subprocess agents for implementation and review tasks. No external dependencies required.

### Bundled Agents

| Agent | Purpose | Tools | Extensions |
|-------|---------|-------|------------|
| `implementer` | Strict TDD implementation | read, write, edit, bash, lsp | — |
| `worker` | General-purpose task execution | read, write, edit, bash, lsp | — |
| `code-reviewer` | Production readiness review | read, bash (read-only) | — |
| `task-reviewer` | Task review: spec compliance + code quality | read, bash (read-only) | — |

Agent definitions live in `agents/*.md` and use YAML frontmatter to declare tools, model, extensions, and a system prompt body.

### Single Agent

```ts
subagent({ agent: "implementer", task: "Implement the retry logic per docs/superpowers/plans/retry-plan.md Task 3" })
```

### Parallel Tasks

```ts
subagent({
  tasks: [
    { agent: "worker", task: "Fix failing test in auth.test.ts" },
    { agent: "worker", task: "Fix failing test in cache.test.ts" },
  ],
})
```

### Structured Results

Single-agent results include:
- `filesChanged` — list of files written/edited
- `testsRan` — whether any test commands were executed
- `status` — `"completed"` or `"failed"`

### Custom Agents

Add `.md` files to an `agents/` directory at your project root. They override bundled agents of the same name. Frontmatter fields:

```yaml
---
name: my-agent
description: What this agent does
tools: read, write, edit, bash
model: claude-sonnet-4-5
extensions: ../extensions/my-guard.ts
---

System prompt body here.
```

## Compared to Superpowers

Based on [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent, ported to pi as [pi-superpowers](https://github.com/coctostan/pi-superpowers), then extended with a few pi-specific tools.

| | [Superpowers](https://github.com/obra/superpowers) | [pi-superpowers](https://github.com/coctostan/pi-superpowers) | **pi-superpowers-plus** |
|---|---|---|---|
| **Platform** | Claude Code | pi | pi |
| **Skills** | 13 workflow skills | Same 13 skills (pi port) | Same 13 skills (three-scenario TDD, restored inline guidance) |
| **TDD discipline** | Skill tells agent the rules | Skill tells agent the rules | Skill tells agent the rules (three-scenario model) |
| **Debug discipline** | Manual discipline | Manual discipline | Manual discipline |
| **Subagent dispatch** | — | — | Bundled `subagent` tool + 4 agent definitions |
| **TDD in subagents** | — | — | Three-scenario TDD instructions in agent profiles + prompt templates |
| **Structured results** | — | — | filesChanged, testsRan per agent |
| **Reference content** | Everything in SKILL.md | Everything in SKILL.md | Inline guidance + separate reference files loaded on demand |
| **Plan tracker** | — | — | `plan_tracker` tool with TUI progress widget |

## Architecture

```
pi-superpowers-plus/
├── agents/                            # Bundled agent definitions (4 agents)
│   ├── implementer.md                 # Strict TDD implementation agent
│   ├── worker.md                      # General-purpose task agent
│   ├── code-reviewer.md               # Production readiness reviewer
│   └── task-reviewer.md               # Task reviewer (spec + code quality)
├── extensions/
│   ├── logging.ts                     # File-based diagnostic logger (10KB truncation, time-based rotation)
│   ├── plan-tracker.ts                # Task tracking tool + TUI widget
│   ├── plan-tracker-state.ts          # Task list state persistence
│   ├── plan-tracker-render.ts         # Shared TUI widget rendering
│   └── subagent/
│       ├── index.ts                   # Subagent tool registration + execution
│       └── agents.ts                  # Agent discovery + frontmatter parsing
├── skills/                           # 13 workflow skills (26 markdown files)
│   ├── using-superpowers/
│   ├── brainstorming/
│   ├── writing-plans/
│   ├── executing-plans/
│   ├── subagent-driven-development/
│   ├── test-driven-development/
│   ├── systematic-debugging/
│   ├── verification-before-completion/
│   ├── requesting-code-review/
│   ├── receiving-code-review/
│   ├── dispatching-parallel-agents/
│   ├── using-git-worktrees/
│   └── finishing-a-development-branch/
└── tests/                            # 100 tests across 14 files
```

## Development

```bash
npm test                    # Run all tests
npx vitest run tests/extension/plan-tracker/plan-tracker-tool.test.ts   # Run one file
```

## Attribution

Skill content adapted from [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent (MIT). This package builds on [pi-superpowers](https://github.com/coctostan/pi-superpowers) with a subagent dispatch tool, a plan-tracker tool, and leaner skill files with reference content split into separate files loaded on demand.

## License

MIT - see [LICENSE](LICENSE) for details.
