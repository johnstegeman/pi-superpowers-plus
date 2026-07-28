// Shared plan-tracker state: the single source of truth for the task list.
// Both the plan_tracker tool (extensions/plan-tracker.ts) and the
// /superpowers tasks command (extensions/workflow-monitor.ts) import this.
// State persists via pi.appendEntry("plan_tracker_state", tasks), mirroring
// the workflow-monitor's superpowers_state pattern. Reconstructed from the
// last plan_tracker_state entry in getBranch() on session events, with a
// legacy tool-result-details fallback for sessions predating the migration.

import type { CustomEntry, ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

export type TaskStatus = "pending" | "in_progress" | "complete";

export interface Task {
  name: string;
  status: TaskStatus;
}

export const PLAN_TRACKER_STATE_ENTRY_TYPE = "plan_tracker_state";

let tasks: Task[] = [];

export function getTasks(): Task[] {
  return tasks.map((t) => ({ ...t }));
}

export function setTasks(next: Task[]): Task[] {
  tasks = next.map((t) => ({ ...t }));
  return getTasks();
}

export function initTasks(names: string[]): Task[] {
  tasks = names.map((name) => ({ name, status: "pending" as TaskStatus }));
  return getTasks();
}

export function updateTask(index: number, status: TaskStatus): Task[] {
  if (tasks.length === 0) throw new Error("no plan active");
  if (index < 0 || index >= tasks.length) throw new Error(`index ${index} out of range (0-${tasks.length - 1})`);
  tasks[index].status = status;
  return getTasks();
}

export function addTask(name: string): Task[] {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("task name required");
  tasks.push({ name: trimmed, status: "pending" });
  return getTasks();
}

export function removeTask(index: number): Task[] {
  if (tasks.length === 0) throw new Error("no plan active");
  if (index < 0 || index >= tasks.length) throw new Error(`index ${index} out of range (0-${tasks.length - 1})`);
  tasks.splice(index, 1);
  return getTasks();
}

export function rewindTask(index: number): Task[] {
  if (tasks.length === 0) throw new Error("no plan active");
  if (index < 0 || index >= tasks.length) throw new Error(`index ${index} out of range (0-${tasks.length - 1})`);
  for (let i = index; i < tasks.length; i++) {
    tasks[i].status = "pending";
  }
  return getTasks();
}

export function clearTasks(): Task[] {
  tasks = [];
  return getTasks();
}

export function persistTasks(pi: ExtensionAPI): void {
  pi.appendEntry(PLAN_TRACKER_STATE_ENTRY_TYPE, getTasks());
}

// Reconstruct from the last plan_tracker_state appendEntry in the branch;
// fall back to legacy plan_tracker tool-result details; fall back to empty.
export function reconstructTasksFromBranch(ctx: ExtensionContext): Task[] {
  const entries = ctx.sessionManager.getBranch();

  // First preference: newest plan_tracker_state custom entry
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "custom" && entry.customType === PLAN_TRACKER_STATE_ENTRY_TYPE) {
      const data = (entry as CustomEntry).data;
      setTasks(Array.isArray(data) ? (data as Task[]) : []);
      return getTasks();
    }
  }

  // Legacy fallback: last plan_tracker tool-result details (pre-migration)
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "message") {
      const msg = entry.message;
      if (msg?.role === "toolResult" && msg.toolName === "plan_tracker") {
        const details = msg.details as { error?: string; tasks?: unknown } | undefined;
        if (details && !details.error && Array.isArray(details.tasks)) {
          setTasks(details.tasks as Task[]);
          return getTasks();
        }
      }
    }
  }

  setTasks([]);
  return getTasks();
}
