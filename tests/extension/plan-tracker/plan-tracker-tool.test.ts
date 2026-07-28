import { beforeEach, describe, expect, test, vi } from "vitest";
import planTrackerExtension from "../../../extensions/plan-tracker";
import { clearTasks } from "../../../extensions/plan-tracker-state";

interface ToolDefinition {
  execute: (
    toolCallId: string,
    params: any,
    signal: AbortSignal | undefined,
    onUpdate: (() => void) | undefined,
    ctx: any,
  ) => Promise<{ content: { type: string; text: string }[]; details?: any }>;
}

function createFakePi() {
  const tools = new Map<string, ToolDefinition>();
  const appendEntry = vi.fn();
  const fakePi = {
    on() {},
    registerTool(opts: ToolDefinition & { name: string }) {
      tools.set(opts.name, opts);
    },
    appendEntry,
  };
  return { fakePi, tools, appendEntry };
}

const mockCtx = {
  hasUI: false,
  ui: { setWidget: () => {} },
} as any;

describe("plan_tracker tool", () => {
  let tools: Map<string, ToolDefinition>;
  let appendEntry: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearTasks();
    const fake = createFakePi();
    tools = fake.tools;
    appendEntry = fake.appendEntry;
    planTrackerExtension(fake.fakePi as any);
  });

  function tool() {
    const t = tools.get("plan_tracker");
    if (!t) throw new Error("plan_tracker tool not registered");
    return t;
  }

  test("init persists via appendEntry and returns tasks in details", async () => {
    const result = await tool().execute("id1", { action: "init", tasks: ["a", "b"] }, undefined, undefined, mockCtx);

    expect(appendEntry).toHaveBeenCalledWith("plan_tracker_state", [
      { name: "a", status: "pending" },
      { name: "b", status: "pending" },
    ]);
    expect(result.details.tasks).toHaveLength(2);
  });

  test("update persists via appendEntry and updates status", async () => {
    await tool().execute("id1", { action: "init", tasks: ["a", "b"] }, undefined, undefined, mockCtx);
    appendEntry.mockClear();

    const result = await tool().execute(
      "id2",
      { action: "update", index: 0, status: "complete" },
      undefined,
      undefined,
      mockCtx,
    );

    expect(appendEntry).toHaveBeenCalledWith("plan_tracker_state", [
      { name: "a", status: "complete" },
      { name: "b", status: "pending" },
    ]);
    expect(result.details.tasks[0].status).toBe("complete");
  });

  test("add persists via appendEntry and appends a pending task", async () => {
    await tool().execute("id1", { action: "init", tasks: ["a", "b"] }, undefined, undefined, mockCtx);
    appendEntry.mockClear();

    const result = await tool().execute("id2", { action: "add", name: "c" }, undefined, undefined, mockCtx);

    expect(appendEntry).toHaveBeenCalled();
    const tasks = result.details.tasks;
    expect(tasks).toHaveLength(3);
    expect(tasks[2]).toEqual({ name: "c", status: "pending" });
  });

  test("remove persists via appendEntry and removes the task", async () => {
    await tool().execute("id1", { action: "init", tasks: ["a", "b"] }, undefined, undefined, mockCtx);
    appendEntry.mockClear();

    const result = await tool().execute("id2", { action: "remove", index: 0 }, undefined, undefined, mockCtx);

    expect(appendEntry).toHaveBeenCalled();
    const tasks = result.details.tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks.find((t: any) => t.name === "a")).toBeUndefined();
  });

  test("rewind persists via appendEntry and marks tasks pending", async () => {
    await tool().execute("id1", { action: "init", tasks: ["a", "b"] }, undefined, undefined, mockCtx);
    await tool().execute("id2", { action: "update", index: 0, status: "complete" }, undefined, undefined, mockCtx);
    await tool().execute("id3", { action: "update", index: 1, status: "complete" }, undefined, undefined, mockCtx);
    appendEntry.mockClear();

    const result = await tool().execute("id4", { action: "rewind", index: 0 }, undefined, undefined, mockCtx);

    expect(appendEntry).toHaveBeenCalled();
    const tasks = result.details.tasks;
    expect(tasks.every((t: any) => t.status === "pending")).toBe(true);
  });

  test("clear persists via appendEntry with empty list", async () => {
    await tool().execute("id1", { action: "init", tasks: ["a", "b"] }, undefined, undefined, mockCtx);
    appendEntry.mockClear();

    const result = await tool().execute("id2", { action: "clear" }, undefined, undefined, mockCtx);

    expect(appendEntry).toHaveBeenCalledWith("plan_tracker_state", []);
    expect(result.details.tasks).toEqual([]);
  });

  test("status is read-only and does not call appendEntry", async () => {
    await tool().execute("id1", { action: "init", tasks: ["a", "b"] }, undefined, undefined, mockCtx);
    appendEntry.mockClear();

    const result = await tool().execute("id2", { action: "status" }, undefined, undefined, mockCtx);

    expect(appendEntry).not.toHaveBeenCalled();
    expect(result.details.tasks).toHaveLength(2);
  });

  test("update without index returns error and does not persist", async () => {
    await tool().execute("id1", { action: "init", tasks: ["a"] }, undefined, undefined, mockCtx);
    appendEntry.mockClear();

    const result = await tool().execute("id2", { action: "update", status: "complete" }, undefined, undefined, mockCtx);

    expect(result.details.error).toBeTruthy();
    expect(appendEntry).not.toHaveBeenCalled();
  });

  test("add without name returns error and does not persist", async () => {
    await tool().execute("id1", { action: "init", tasks: ["a"] }, undefined, undefined, mockCtx);
    appendEntry.mockClear();

    const result = await tool().execute("id2", { action: "add" }, undefined, undefined, mockCtx);

    expect(result.details.error).toBeTruthy();
    expect(appendEntry).not.toHaveBeenCalled();
  });

  test("remove out of range returns error and does not persist", async () => {
    await tool().execute("id1", { action: "init", tasks: ["a"] }, undefined, undefined, mockCtx);
    appendEntry.mockClear();

    const result = await tool().execute("id2", { action: "remove", index: 5 }, undefined, undefined, mockCtx);

    expect(result.details.error).toBeTruthy();
    expect(appendEntry).not.toHaveBeenCalled();
  });
});
