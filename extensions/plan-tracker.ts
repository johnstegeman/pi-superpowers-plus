/**
 * Plan Tracker Extension
 *
 * A native pi tool for tracking plan progress.
 * State is stored via the shared plan-tracker-state module (durable,
 * appendEntry-based persistence), with tool-result details kept for
 * backward compat and per-call rendering.
 * Shows a persistent TUI widget above the editor.
 */

import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { type Static, Type } from "@sinclair/typebox";
import { renderPlanTrackerWidget } from "./plan-tracker-render";
import {
  addTask,
  clearTasks,
  getTasks,
  initTasks,
  persistTasks,
  reconstructTasksFromBranch,
  removeTask,
  rewindTask,
  type Task,
  updateTask,
} from "./plan-tracker-state";

interface PlanTrackerDetails {
  action: "init" | "update" | "status" | "clear" | "add" | "remove" | "rewind";
  tasks: Task[];
  error?: string;
}

const PlanTrackerParams = Type.Object({
  action: StringEnum(["init", "update", "status", "clear", "add", "remove", "rewind"] as const, {
    description: "Action to perform",
  }),
  tasks: Type.Optional(
    Type.Array(Type.String(), {
      description: "Task names (for init)",
    }),
  ),
  index: Type.Optional(
    Type.Integer({
      minimum: 0,
      description: "Task index, 0-based (for update/remove/rewind)",
    }),
  ),
  status: Type.Optional(
    StringEnum(["pending", "in_progress", "complete"] as const, {
      description: "New status (for update)",
    }),
  ),
  name: Type.Optional(Type.String({ description: "Task name (for add)" })),
});

export type PlanTrackerInput = Static<typeof PlanTrackerParams>;

function formatStatus(tasks: Task[]): string {
  if (tasks.length === 0) return "No plan active.";

  const complete = tasks.filter((t) => t.status === "complete").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const pending = tasks.filter((t) => t.status === "pending").length;

  const lines: string[] = [];
  lines.push(`Plan: ${complete}/${tasks.length} complete (${inProgress} in progress, ${pending} pending)`);
  lines.push("");
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const icon = t.status === "complete" ? "✓" : t.status === "in_progress" ? "→" : "○";
    lines.push(`  ${icon} [${i}] ${t.name}`);
  }
  return lines.join("\n");
}

export default function (pi: ExtensionAPI) {
  const updateWidget = (ctx: import("@mariozechner/pi-coding-agent").ExtensionContext) => {
    if (!ctx.hasUI) return;
    const tasks = getTasks();
    if (tasks.length === 0) {
      ctx.ui.setWidget("plan_tracker", undefined);
    } else {
      ctx.ui.setWidget("plan_tracker", (_tui, theme) => {
        return new Text(renderPlanTrackerWidget(tasks, theme), 0, 0);
      });
    }
  };

  // Reconstruct state + widget on session events
  for (const event of ["session_start", "session_switch", "session_fork", "session_tree"] as const) {
    pi.on(event, async (_event, ctx) => {
      reconstructTasksFromBranch(ctx);
      updateWidget(ctx);
    });
  }

  pi.registerTool({
    name: "plan_tracker",
    label: "Plan Tracker",
    description:
      "Track implementation plan progress. Actions: init (set task list), update (change task status), status (show current state), clear (remove plan), add (append task), remove (delete task by index), rewind (mark task and later tasks pending).",
    parameters: PlanTrackerParams,

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      switch (params.action) {
        case "init": {
          if (!params.tasks || params.tasks.length === 0) {
            return {
              content: [{ type: "text", text: "Error: tasks array required for init" }],
              details: {
                action: "init",
                tasks: getTasks(),
                error: "tasks required",
              } as PlanTrackerDetails,
            };
          }
          initTasks(params.tasks);
          persistTasks(pi);
          updateWidget(ctx);
          const tasks = getTasks();
          return {
            content: [
              {
                type: "text",
                text: `Plan initialized with ${tasks.length} tasks.\n${formatStatus(tasks)}`,
              },
            ],
            details: { action: "init", tasks } as PlanTrackerDetails,
          };
        }

        case "update": {
          if (params.index === undefined || !params.status) {
            return {
              content: [{ type: "text", text: "Error: index and status required for update" }],
              details: {
                action: "update",
                tasks: getTasks(),
                error: "index and status required",
              } as PlanTrackerDetails,
            };
          }
          try {
            updateTask(params.index, params.status);
          } catch (err) {
            return {
              content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
              details: {
                action: "update",
                tasks: getTasks(),
                error: (err as Error).message,
              } as PlanTrackerDetails,
            };
          }
          persistTasks(pi);
          updateWidget(ctx);
          const tasks = getTasks();
          return {
            content: [
              {
                type: "text",
                text: `Task ${params.index} "${tasks[params.index].name}" → ${params.status}\n${formatStatus(tasks)}`,
              },
            ],
            details: { action: "update", tasks } as PlanTrackerDetails,
          };
        }

        case "add": {
          if (!params.name || !params.name.trim()) {
            return {
              content: [{ type: "text", text: "Error: name required for add" }],
              details: {
                action: "add",
                tasks: getTasks(),
                error: "name required",
              } as PlanTrackerDetails,
            };
          }
          try {
            addTask(params.name);
          } catch (err) {
            return {
              content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
              details: {
                action: "add",
                tasks: getTasks(),
                error: (err as Error).message,
              } as PlanTrackerDetails,
            };
          }
          persistTasks(pi);
          updateWidget(ctx);
          const tasks = getTasks();
          return {
            content: [{ type: "text", text: `Task "${params.name}" added.\n${formatStatus(tasks)}` }],
            details: { action: "add", tasks } as PlanTrackerDetails,
          };
        }

        case "remove": {
          if (params.index === undefined) {
            return {
              content: [{ type: "text", text: "Error: index required for remove" }],
              details: {
                action: "remove",
                tasks: getTasks(),
                error: "index required",
              } as PlanTrackerDetails,
            };
          }
          const removedName = getTasks()[params.index]?.name;
          try {
            removeTask(params.index);
          } catch (err) {
            return {
              content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
              details: {
                action: "remove",
                tasks: getTasks(),
                error: (err as Error).message,
              } as PlanTrackerDetails,
            };
          }
          persistTasks(pi);
          updateWidget(ctx);
          const tasks = getTasks();
          return {
            content: [{ type: "text", text: `Task "${removedName}" removed.\n${formatStatus(tasks)}` }],
            details: { action: "remove", tasks } as PlanTrackerDetails,
          };
        }

        case "rewind": {
          if (params.index === undefined) {
            return {
              content: [{ type: "text", text: "Error: index required for rewind" }],
              details: {
                action: "rewind",
                tasks: getTasks(),
                error: "index required",
              } as PlanTrackerDetails,
            };
          }
          try {
            rewindTask(params.index);
          } catch (err) {
            return {
              content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
              details: {
                action: "rewind",
                tasks: getTasks(),
                error: (err as Error).message,
              } as PlanTrackerDetails,
            };
          }
          persistTasks(pi);
          updateWidget(ctx);
          const tasks = getTasks();
          return {
            content: [
              {
                type: "text",
                text: `Rewound to task ${params.index}.\n${formatStatus(tasks)}`,
              },
            ],
            details: { action: "rewind", tasks } as PlanTrackerDetails,
          };
        }

        case "status": {
          return {
            content: [{ type: "text", text: formatStatus(getTasks()) }],
            details: { action: "status", tasks: getTasks() } as PlanTrackerDetails,
          };
        }

        case "clear": {
          const count = getTasks().length;
          clearTasks();
          persistTasks(pi);
          updateWidget(ctx);
          return {
            content: [
              {
                type: "text",
                text: count > 0 ? `Plan cleared (${count} tasks removed).` : "No plan was active.",
              },
            ],
            details: { action: "clear", tasks: [] } as PlanTrackerDetails,
          };
        }

        default:
          return {
            content: [{ type: "text", text: `Unknown action: ${params.action}` }],
            details: {
              action: "status",
              tasks: getTasks(),
              error: `unknown action`,
            } as PlanTrackerDetails,
          };
      }
    },

    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("plan_tracker "));
      text += theme.fg("muted", args.action);
      if (args.action === "update" && args.index !== undefined) {
        text += ` ${theme.fg("accent", `[${args.index}]`)}`;
        if (args.status) text += ` → ${theme.fg("dim", args.status)}`;
      }
      if (args.action === "init" && args.tasks) {
        text += ` ${theme.fg("dim", `(${args.tasks.length} tasks)`)}`;
      }
      if ((args.action === "remove" || args.action === "rewind") && args.index !== undefined) {
        text += ` ${theme.fg("accent", `[${args.index}]`)}`;
      }
      if (args.action === "add" && args.name) {
        text += ` ${theme.fg("dim", args.name)}`;
      }
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as PlanTrackerDetails | undefined;
      if (!details) {
        const text = result.content[0];
        return new Text(text?.type === "text" ? text.text : "", 0, 0);
      }

      if (details.error) {
        return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
      }

      const taskList = details.tasks;
      switch (details.action) {
        case "init":
          return new Text(
            theme.fg("success", "✓ ") + theme.fg("muted", `Plan initialized with ${taskList.length} tasks`),
            0,
            0,
          );
        case "update": {
          const complete = taskList.filter((t) => t.status === "complete").length;
          return new Text(
            theme.fg("success", "✓ ") + theme.fg("muted", `Updated (${complete}/${taskList.length} complete)`),
            0,
            0,
          );
        }
        case "add":
          return new Text(theme.fg("success", "✓ ") + theme.fg("muted", `Task added (${taskList.length} total)`), 0, 0);
        case "remove":
          return new Text(
            theme.fg("success", "✓ ") + theme.fg("muted", `Task removed (${taskList.length} remaining)`),
            0,
            0,
          );
        case "rewind":
          return new Text(theme.fg("success", "✓ ") + theme.fg("muted", "Plan rewound"), 0, 0);
        case "status": {
          if (taskList.length === 0) {
            return new Text(theme.fg("dim", "No plan active"), 0, 0);
          }
          const complete = taskList.filter((t) => t.status === "complete").length;
          let text = theme.fg("muted", `${complete}/${taskList.length} complete`);
          for (const t of taskList) {
            const icon =
              t.status === "complete"
                ? theme.fg("success", "✓")
                : t.status === "in_progress"
                  ? theme.fg("warning", "→")
                  : theme.fg("dim", "○");
            text += `\n${icon} ${theme.fg("muted", t.name)}`;
          }
          return new Text(text, 0, 0);
        }
        case "clear":
          return new Text(theme.fg("success", "✓ ") + theme.fg("muted", "Plan cleared"), 0, 0);
        default:
          return new Text(theme.fg("dim", "Done"), 0, 0);
      }
    },
  });
}
