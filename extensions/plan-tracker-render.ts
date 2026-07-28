// Shared plan-tracker TUI widget renderer, used by both the plan_tracker
// tool (extensions/plan-tracker.ts) and the /superpowers tasks command
// (extensions/workflow-monitor.ts) so there is a single source of truth
// for the widget's appearance.

import type { Theme } from "@mariozechner/pi-coding-agent";
import type { Task } from "./plan-tracker-state";

export function renderPlanTrackerWidget(tasks: Task[], theme: Theme): string {
  if (tasks.length === 0) return "";

  const complete = tasks.filter((t) => t.status === "complete").length;
  const icons = tasks
    .map((t) => {
      switch (t.status) {
        case "complete":
          return theme.fg("success", "✓");
        case "in_progress":
          return theme.fg("warning", "→");
        default:
          return theme.fg("dim", "○");
      }
    })
    .join("");

  // Find current task (first in_progress, or first pending)
  const current = tasks.find((t) => t.status === "in_progress") ?? tasks.find((t) => t.status === "pending");
  const currentName = current ? `  ${current.name}` : "";

  return `${theme.fg("muted", "Tasks:")} ${icons} ${theme.fg("muted", `(${complete}/${tasks.length})`)}${currentName}`;
}
