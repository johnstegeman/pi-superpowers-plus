import { beforeEach, describe, expect, test, vi } from "vitest";
import { clearTasks, getTasks, initTasks, updateTask } from "../../../extensions/plan-tracker-state";
import workflowMonitorExtension from "../../../extensions/workflow-monitor";

/**
 * Boots the extension and returns a map of { commandName → handler }.
 * Also captures appendedEntries so we can inspect persisted state.
 */
function setup() {
  const commands = new Map<string, (args: string, ctx: any) => Promise<void>>();
  const appendedEntries: Array<{ customType: string; data: any }> = [];

  const fakePi: any = {
    on() {},
    registerTool() {},
    appendEntry(customType: string, data: any) {
      appendedEntries.push({ customType, data });
    },
    registerCommand(name: string, opts: any) {
      commands.set(name, opts.handler);
    },
  };

  workflowMonitorExtension(fakePi);
  return { commands, appendedEntries };
}

function makeCtx() {
  return {
    hasUI: true,
    ui: {
      notify: vi.fn(),
      setWidget: () => {},
      setEditorText: vi.fn(),
    },
  };
}

describe("/superpowers command", () => {
  beforeEach(() => {
    clearTasks();
  });

  test("command is registered with the expected name and description", () => {
    const descriptions = new Map<string, string>();
    const fakePi: any = {
      on() {},
      registerTool() {},
      appendEntry() {},
      registerCommand(name: string, opts: any) {
        descriptions.set(name, opts.description);
      },
    };
    workflowMonitorExtension(fakePi);
    expect(descriptions.has("superpowers")).toBe(true);
    expect(descriptions.get("superpowers")).toMatch(/status|dashboard/i);
  });

  test("no args renders a status dashboard to the chat log via notify (not the input line)", async () => {
    const { commands } = setup();
    const ctx = makeCtx();

    const handler = commands.get("superpowers");
    expect(handler).toBeDefined();
    await handler!("", ctx);

    // The dashboard is read-only status output. It must NOT be dumped into the
    // input editor (where pressing Enter would re-submit it as a user message).
    // It should be emitted to the chat log via notify.
    expect(ctx.ui.setEditorText).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    const [text, level] = ctx.ui.notify.mock.calls[0];
    expect(level).toBe("info");

    // Tasks section (empty plan)
    expect(text).toMatch(/no plan active/i);
    // TDD section
    expect(text).toMatch(/tdd.*idle/i);
    // Debug section
    expect(text).toMatch(/debug.*inactive/i);
    // Verification section
    expect(text).toMatch(/verification/i);
  });

  test("stage show renders the phase strip to the chat log via notify (not the input line)", async () => {
    const { commands } = setup();
    const ctx = makeCtx();

    const handler = commands.get("superpowers");
    await handler!("stage show", ctx);

    expect(ctx.ui.setEditorText).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    const [text, level] = ctx.ui.notify.mock.calls[0];
    expect(level).toBe("info");
    expect(text).toMatch(/brainstorm/i);
  });

  test("stage <phase> advances the workflow, persists, and notifies info", async () => {
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();

    const handler = commands.get("superpowers");
    await handler!("stage execute", ctx);

    const superpowersEntries = appendedEntries.filter((e) => e.customType === "superpowers_state");
    expect(superpowersEntries.length).toBeGreaterThan(0);
    const last = superpowersEntries.at(-1)!;
    expect(last.data.workflow.currentPhase).toBe("execute");

    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    const [msg, level] = ctx.ui.notify.mock.calls[0];
    expect(level).toBe("info");
    expect(msg).toMatch(/stage|execute/i);
  });

  test("stage brainstorm sets currentPhase to brainstorm", async () => {
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();

    const handler = commands.get("superpowers");
    await handler!("stage brainstorm", ctx);

    const superpowersEntries = appendedEntries.filter((e) => e.customType === "superpowers_state");
    const last = superpowersEntries.at(-1)!;
    expect(last.data.workflow.currentPhase).toBe("brainstorm");
    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    expect(ctx.ui.notify.mock.calls[0][1]).toBe("info");
  });

  test("stage <invalid phase> notifies an error and does not persist", async () => {
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();

    const handler = commands.get("superpowers");
    const before = appendedEntries.filter((e) => e.customType === "superpowers_state").length;
    await handler!("stage badphase", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    const [msg, level] = ctx.ui.notify.mock.calls[0];
    expect(level).toBe("error");
    expect(msg).toMatch(/invalid|unknown phase/i);

    const after = appendedEntries.filter((e) => e.customType === "superpowers_state").length;
    expect(after).toBe(before);
  });

  test("stage reset resets the workflow tracker only, persists, and notifies info", async () => {
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();

    const handler = commands.get("superpowers");
    await handler!("stage execute", ctx);
    await handler!("stage reset", ctx);

    const superpowersEntries = appendedEntries.filter((e) => e.customType === "superpowers_state");
    const last = superpowersEntries.at(-1)!;
    expect(last.data.workflow.currentPhase).toBeNull();
    for (const phase of ["brainstorm", "plan", "execute", "verify", "review", "finish"]) {
      expect(last.data.workflow.phases[phase]).toBe("pending");
    }

    expect(ctx.ui.notify).toHaveBeenCalledTimes(2);
    const [msg, level] = ctx.ui.notify.mock.calls[1];
    expect(level).toBe("info");
    expect(msg).toMatch(/reset/i);
  });
});

describe("/superpowers tasks", () => {
  beforeEach(() => {
    clearTasks();
  });

  function planEntries(appendedEntries: Array<{ customType: string; data: any }>) {
    return appendedEntries.filter((e) => e.customType === "plan_tracker_state");
  }

  test("tasks / tasks list renders 'No plan active' to the chat log via notify (not the input line)", async () => {
    const { commands } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("tasks", ctx);
    expect(ctx.ui.setEditorText).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    expect(ctx.ui.notify.mock.calls[0][0]).toMatch(/no plan active/i);

    await handler!("tasks list", ctx);
    expect(ctx.ui.setEditorText).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledTimes(2);
    expect(ctx.ui.notify.mock.calls[1][0]).toMatch(/no plan active/i);
  });

  test("tasks list renders the task list to the chat log via notify (not the input line)", async () => {
    initTasks(["a", "b"]);
    const { commands } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("tasks list", ctx);
    expect(ctx.ui.setEditorText).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    const text = ctx.ui.notify.mock.calls[0][0] as string;
    expect(text).toMatch(/Plan:/);
    expect(text).toMatch(/\[0\]/);
    expect(text).toMatch(/\[1\]/);
  });

  test("tasks add <multi word name> adds a task, persists, and notifies info", async () => {
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("tasks add fix the bug", ctx);

    const names = getTasks().map((t) => t.name);
    expect(names).toContain("fix the bug");

    const entries = planEntries(appendedEntries);
    expect(entries.length).toBeGreaterThan(0);

    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    expect(ctx.ui.notify.mock.calls[0][1]).toBe("info");
  });

  test("tasks add with no name notifies an error and does not persist", async () => {
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("tasks add", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    const [msg, level] = ctx.ui.notify.mock.calls[0];
    expect(level).toBe("error");
    expect(msg).toMatch(/name required|task name/i);
    expect(planEntries(appendedEntries).length).toBe(0);
  });

  test("tasks remove <index> removes a task, persists, and notifies info", async () => {
    initTasks(["a", "b"]);
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("tasks remove 0", ctx);

    const tasks = getTasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0].name).toBe("b");

    expect(planEntries(appendedEntries).length).toBeGreaterThan(0);
    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    expect(ctx.ui.notify.mock.calls[0][1]).toBe("info");
  });

  test("tasks remove <out of range index> notifies an error and does not persist", async () => {
    initTasks(["a", "b"]);
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("tasks remove 5", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    const [msg, level] = ctx.ui.notify.mock.calls[0];
    expect(level).toBe("error");
    expect(msg).toMatch(/out of range|no plan/i);
    expect(planEntries(appendedEntries).length).toBe(0);
  });

  test("tasks complete <index> marks the task complete, persists, and notifies info", async () => {
    initTasks(["a"]);
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("tasks complete 0", ctx);

    expect(getTasks()[0].status).toBe("complete");
    expect(planEntries(appendedEntries).length).toBeGreaterThan(0);
    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    expect(ctx.ui.notify.mock.calls[0][1]).toBe("info");
  });

  test("tasks complete with no index notifies an error and does not persist", async () => {
    initTasks(["a"]);
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("tasks complete", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    expect(ctx.ui.notify.mock.calls[0][1]).toBe("error");
    expect(planEntries(appendedEntries).length).toBe(0);
  });

  test("tasks rewind <index> marks task and later tasks pending, persists, and notifies info", async () => {
    initTasks(["a", "b"]);
    updateTask(0, "complete");
    updateTask(1, "complete");
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("tasks rewind 0", ctx);

    const tasks = getTasks();
    expect(tasks[0].status).toBe("pending");
    expect(tasks[1].status).toBe("pending");

    expect(planEntries(appendedEntries).length).toBeGreaterThan(0);
    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    expect(ctx.ui.notify.mock.calls[0][1]).toBe("info");
  });

  test("tasks reset clears all tasks, persists an empty list, and notifies info", async () => {
    initTasks(["a", "b"]);
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("tasks reset", ctx);

    expect(getTasks().length).toBe(0);
    const entries = planEntries(appendedEntries);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.at(-1)!.data).toEqual([]);
    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    expect(ctx.ui.notify.mock.calls[0][1]).toBe("info");
  });

  test("tasks <unknown subcommand> notifies an error and does not persist", async () => {
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("tasks bogus", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    const [msg, level] = ctx.ui.notify.mock.calls[0];
    expect(level).toBe("error");
    expect(msg).toMatch(/unknown tasks subcommand/i);
    expect(planEntries(appendedEntries).length).toBe(0);
  });
});

describe("/superpowers reset", () => {
  beforeEach(() => {
    clearTasks();
  });

  function superpowersEntries(appendedEntries: Array<{ customType: string; data: any }>) {
    return appendedEntries.filter((e) => e.customType === "superpowers_state");
  }

  function planEntries(appendedEntries: Array<{ customType: string; data: any }>) {
    return appendedEntries.filter((e) => e.customType === "plan_tracker_state");
  }

  test("resets the workflow/TDD/debug/verification monitor state", async () => {
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("stage execute", ctx);
    await handler!("reset", ctx);

    const entries = superpowersEntries(appendedEntries);
    expect(entries.length).toBeGreaterThan(0);
    const last = entries.at(-1)!;

    expect(last.data.workflow.currentPhase).toBeNull();
    for (const phase of ["brainstorm", "plan", "execute", "verify", "review", "finish"]) {
      expect(last.data.workflow.phases[phase]).toBe("pending");
    }
    expect(last.data.tdd.phase).toBe("idle");
    expect(last.data.debug.active).toBe(false);
    expect(last.data.verification.verified).toBe(false);
  });

  test("clears all plan-tracker tasks", async () => {
    initTasks(["a", "b"]);
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("reset", ctx);

    expect(getTasks()).toEqual([]);
    const entries = planEntries(appendedEntries);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.at(-1)!.data).toEqual([]);
  });

  test("appends both a superpowers_state and a plan_tracker_state entry", async () => {
    initTasks(["a"]);
    const { commands, appendedEntries } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("reset", ctx);

    expect(superpowersEntries(appendedEntries).length).toBeGreaterThan(0);
    expect(planEntries(appendedEntries).length).toBeGreaterThan(0);
  });

  test("notifies info with a message mentioning reset", async () => {
    const { commands } = setup();
    const ctx = makeCtx();
    const handler = commands.get("superpowers");

    await handler!("reset", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
    const [msg, level] = ctx.ui.notify.mock.calls[0];
    expect(level).toBe("info");
    expect(msg).toMatch(/reset/i);
  });

  test("clears the workflow_monitor widget", async () => {
    const { commands } = setup();
    const ctx = makeCtx();
    const widgetCalls: Array<[string, unknown]> = [];
    ctx.ui.setWidget = (name: string, render: unknown) => {
      widgetCalls.push([name, render]);
    };
    const handler = commands.get("superpowers");

    await handler!("stage execute", ctx);
    await handler!("reset", ctx);

    const workflowWidgetCalls = widgetCalls.filter(([name]) => name === "workflow_monitor");
    expect(workflowWidgetCalls.length).toBeGreaterThan(0);
    expect(workflowWidgetCalls.at(-1)![1]).toBeUndefined();
  });
});
