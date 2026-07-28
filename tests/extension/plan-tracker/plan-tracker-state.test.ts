import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  addTask,
  clearTasks,
  getTasks,
  initTasks,
  PLAN_TRACKER_STATE_ENTRY_TYPE,
  persistTasks,
  reconstructTasksFromBranch,
  removeTask,
  rewindTask,
  setTasks,
  updateTask,
} from "../../../extensions/plan-tracker-state";

describe("plan-tracker-state", () => {
  beforeEach(() => {
    clearTasks();
  });

  test("initTasks sets tasks to pending in order", () => {
    initTasks(["a", "b", "c"]);
    const tasks = getTasks();
    expect(tasks).toHaveLength(3);
    expect(tasks).toEqual([
      { name: "a", status: "pending" },
      { name: "b", status: "pending" },
      { name: "c", status: "pending" },
    ]);
  });

  test("updateTask updates only the target task", () => {
    initTasks(["a", "b", "c"]);
    updateTask(1, "complete");
    const tasks = getTasks();
    expect(tasks[0].status).toBe("pending");
    expect(tasks[1].status).toBe("complete");
    expect(tasks[2].status).toBe("pending");
  });

  test("updateTask out of range throws", () => {
    initTasks(["a", "b", "c"]);
    expect(() => updateTask(5, "complete")).toThrow(/out of range/);
  });

  test("updateTask with no plan active throws", () => {
    expect(() => updateTask(0, "complete")).toThrow(/no plan active/);
  });

  test("addTask appends a pending task", () => {
    initTasks(["a", "b"]);
    addTask("d");
    const tasks = getTasks();
    expect(tasks).toHaveLength(3);
    expect(tasks[2]).toEqual({ name: "d", status: "pending" });
  });

  test("addTask trims whitespace", () => {
    initTasks([]);
    addTask("  trimmed  ");
    expect(getTasks()[0].name).toBe("trimmed");
  });

  test("addTask with empty name throws", () => {
    expect(() => addTask("")).toThrow(/task name required/);
    expect(() => addTask("   ")).toThrow(/task name required/);
  });

  test("removeTask removes and reindexes", () => {
    initTasks(["a", "b", "c"]);
    removeTask(0);
    const tasks = getTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks[0].name).toBe("b");
    expect(tasks[1].name).toBe("c");
  });

  test("removeTask out of range throws", () => {
    initTasks(["a", "b", "c"]);
    expect(() => removeTask(5)).toThrow(/out of range/);
  });

  test("removeTask with no plan active throws", () => {
    expect(() => removeTask(0)).toThrow(/no plan active/);
  });

  test("rewindTask resets from index onward to pending", () => {
    initTasks(["a", "b", "c", "d"]);
    updateTask(0, "complete");
    updateTask(1, "complete");
    updateTask(2, "in_progress");
    rewindTask(1);
    const tasks = getTasks();
    expect(tasks[0].status).toBe("complete");
    expect(tasks[1].status).toBe("pending");
    expect(tasks[2].status).toBe("pending");
    expect(tasks[3].status).toBe("pending");
  });

  test("rewindTask out of range throws", () => {
    initTasks(["a", "b", "c"]);
    expect(() => rewindTask(5)).toThrow(/out of range/);
  });

  test("rewindTask with no plan active throws", () => {
    expect(() => rewindTask(0)).toThrow(/no plan active/);
  });

  test("clearTasks empties the list", () => {
    initTasks(["a", "b"]);
    clearTasks();
    expect(getTasks()).toEqual([]);
  });

  test("setTasks replaces the list and getTasks returns copies", () => {
    setTasks([{ name: "x", status: "complete" }]);
    const tasks = getTasks();
    expect(tasks).toEqual([{ name: "x", status: "complete" }]);
    tasks.push({ name: "y", status: "pending" });
    expect(getTasks()).toEqual([{ name: "x", status: "complete" }]);
  });

  test("getTasks returns copies of task objects", () => {
    initTasks(["a"]);
    const tasks = getTasks();
    tasks[0].status = "complete";
    expect(getTasks()[0].status).toBe("pending");
  });

  test("persistTasks calls pi.appendEntry with the current task list", () => {
    initTasks(["a", "b"]);
    updateTask(0, "complete");
    const pi = { appendEntry: vi.fn() } as any;
    persistTasks(pi);
    expect(pi.appendEntry).toHaveBeenCalledTimes(1);
    expect(pi.appendEntry).toHaveBeenCalledWith(PLAN_TRACKER_STATE_ENTRY_TYPE, [
      { name: "a", status: "complete" },
      { name: "b", status: "pending" },
    ]);
  });

  describe("reconstructTasksFromBranch", () => {
    test("uses plan_tracker_state custom entry when present", () => {
      const ctx = {
        sessionManager: {
          getBranch: () => [
            {
              type: "custom",
              customType: "plan_tracker_state",
              data: [{ name: "x", status: "complete" }],
            },
          ],
        },
      } as any;
      const result = reconstructTasksFromBranch(ctx);
      expect(result).toEqual([{ name: "x", status: "complete" }]);
      expect(getTasks()).toEqual([{ name: "x", status: "complete" }]);
    });

    test("falls back to legacy plan_tracker tool-result details", () => {
      const ctx = {
        sessionManager: {
          getBranch: () => [
            {
              type: "message",
              message: {
                role: "toolResult",
                toolName: "plan_tracker",
                details: {
                  action: "init",
                  tasks: [{ name: "legacy", status: "pending" }],
                },
              },
            },
          ],
        },
      } as any;
      const result = reconstructTasksFromBranch(ctx);
      expect(result).toEqual([{ name: "legacy", status: "pending" }]);
    });

    test("returns empty when neither entry type is present", () => {
      const ctx = {
        sessionManager: {
          getBranch: () => [],
        },
      } as any;
      const result = reconstructTasksFromBranch(ctx);
      expect(result).toEqual([]);
    });

    test("prefers plan_tracker_state entry over legacy when both present", () => {
      const ctx = {
        sessionManager: {
          getBranch: () => [
            {
              type: "message",
              message: {
                role: "toolResult",
                toolName: "plan_tracker",
                details: {
                  action: "init",
                  tasks: [{ name: "legacy", status: "pending" }],
                },
              },
            },
            {
              type: "custom",
              customType: "plan_tracker_state",
              data: [{ name: "new", status: "complete" }],
            },
          ],
        },
      } as any;
      const result = reconstructTasksFromBranch(ctx);
      expect(result).toEqual([{ name: "new", status: "complete" }]);
    });
  });
});
