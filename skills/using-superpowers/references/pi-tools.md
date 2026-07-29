# Pi Tool Prerequisites

Skills speak in actions ("dispatch a subagent", "create a task", "read a file"). On Pi these resolve to tools provided by two companion packages — **installed separately**, not bundled with this package.

## Required packages

```bash
pi install npm:@tintinweb/pi-subagents
pi install npm:@tintinweb/pi-tasks
```

| Action skills request | Package | Tool |
| --- | --- | --- |
| Dispatch a subagent (`Agent({ subagent_type, prompt, description, ... })`) | [`@tintinweb/pi-subagents`](https://github.com/tintinweb/pi-subagents) | `Agent`, `get_subagent_result`, `steer_subagent` |
| Task tracking (`TaskCreate`, `TaskUpdate`, `TaskList`, ...) | [`@tintinweb/pi-tasks`](https://github.com/tintinweb/pi-tasks) | `TaskCreate`, `TaskUpdate`, `TaskList`, `TaskGet`, `TaskOutput`, `TaskStop`, `TaskExecute` |

There is **no fallback** if these packages aren't installed — skills reference the tools directly. For each tool's full parameter schema, see the package's own README (linked above); skills show the concrete call shapes you'll use day to day.
