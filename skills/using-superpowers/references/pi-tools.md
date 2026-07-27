# Pi Tool Mapping

Skills speak in actions ("dispatch a subagent", "create a todo", "read a file"). On Pi these resolve to the tools below.

| Action skills request | Pi equivalent |
| --- | --- |
| Dispatch a subagent (`Subagent (general-purpose):` template) | Use the `subagent` tool (bundled with this package) — single, parallel, and chain modes |
| Task tracking ("create a todo", "mark complete") | Use the `plan_tracker` tool (bundled with this package) — init/update/status/clear actions |

## Subagents

This package registers a `subagent` tool that spawns a separate `pi` process per invocation with an isolated context window. It supports single-agent, parallel, and chain dispatch. Use it to delegate implementation and review work to specialized agents (see the agent definitions in `agents/`).

## Task lists

This package registers a `plan_tracker` tool for task progress: `init` (set task list), `update` (change task status), `status` (show current state), and `clear` (remove plan). Use it for the per-task todos described in skills. For lightweight tracking outside a formal plan, a repo-local `TODO.md` also works.
