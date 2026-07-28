import { beforeEach, describe, expect, test, vi } from "vitest";
import { clearTasks } from "../../../extensions/plan-tracker-state";
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

  test("no args renders a status dashboard via setEditorText", async () => {
    const { commands } = setup();
    const ctx = makeCtx();

    const handler = commands.get("superpowers");
    expect(handler).toBeDefined();
    await handler!("", ctx);

    expect(ctx.ui.setEditorText).toHaveBeenCalledTimes(1);
    const text = ctx.ui.setEditorText.mock.calls[0][0] as string;

    // Tasks section (empty plan)
    expect(text).toMatch(/no plan active/i);
    // TDD section
    expect(text).toMatch(/tdd.*idle/i);
    // Debug section
    expect(text).toMatch(/debug.*inactive/i);
    // Verification section
    expect(text).toMatch(/verification/i);
  });

  test("stage show renders the phase strip via setEditorText", async () => {
    const { commands } = setup();
    const ctx = makeCtx();

    const handler = commands.get("superpowers");
    await handler!("stage show", ctx);

    expect(ctx.ui.setEditorText).toHaveBeenCalledTimes(1);
    const text = ctx.ui.setEditorText.mock.calls[0][0] as string;
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
