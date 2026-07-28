import { describe, expect, test, vi } from "vitest";
import workflowMonitorExtension from "../../../extensions/workflow-monitor";

function setup() {
  const inputHandlers: Array<(event: any, ctx: any) => Promise<any>> = [];
  const appended: Array<{ customType: string; data: any }> = [];
  const fakePi: any = {
    on(event: string, handler: any) {
      if (event === "input") inputHandlers.push(handler);
    },
    registerTool() {},
    registerCommand() {},
    appendEntry(ct: string, d: any) {
      appended.push({ customType: ct, data: d });
    },
  };
  workflowMonitorExtension(fakePi);
  return { inputHandlers, appended };
}

function makeCtx() {
  return {
    hasUI: true,
    ui: {
      notify: vi.fn(),
      setEditorText: vi.fn(),
      setWidget: () => {},
      // Auto-skip any unresolved-phase gate prompts so these tests exercise
      // only the command/transform behavior, not the skip-confirmation flow
      // (covered separately in workflow-skip-confirmation.test.ts).
      select: vi.fn(async (_title: string, labels: string[]) => {
        return labels.find((l) => l.toLowerCase().startsWith("skip")) ?? labels[labels.length - 1];
      }),
    },
    sessionManager: { getBranch: () => [] },
  };
}

async function runInput(handlers: Array<any>, event: any, ctx: any) {
  let result: any = { action: "continue" };
  for (const h of handlers) {
    const r = await h(event, ctx);
    if (r) result = r;
  }
  return result;
}

function getPhase(appended: Array<any>): string | null {
  const entries = appended.filter((e) => e.customType === "superpowers_state");
  if (entries.length === 0) return null;
  return entries[entries.length - 1].data.workflow.currentPhase;
}

describe("/brainstorm-style phase commands (input transform)", () => {
  test("/brainstorm transforms to /skill:brainstorming and advances", async () => {
    const { inputHandlers, appended } = setup();
    const result = await runInput(inputHandlers, { text: "/brainstorm", source: "interactive" }, makeCtx());
    expect(result.action).toBe("transform");
    expect(result.text).toBe("/skill:brainstorming");
    expect(getPhase(appended)).toBe("brainstorm");
  });

  test("/plan transforms to /skill:writing-plans and advances", async () => {
    const { inputHandlers, appended } = setup();
    const result = await runInput(inputHandlers, { text: "/plan", source: "interactive" }, makeCtx());
    expect(result.action).toBe("transform");
    expect(result.text).toBe("/skill:writing-plans");
    expect(getPhase(appended)).toBe("plan");
  });

  test("/verify transforms to /skill:verification-before-completion", async () => {
    const { inputHandlers, appended } = setup();
    const result = await runInput(inputHandlers, { text: "/verify", source: "interactive" }, makeCtx());
    expect(result.action).toBe("transform");
    expect(result.text).toBe("/skill:verification-before-completion");
    expect(getPhase(appended)).toBe("verify");
  });

  test("/review transforms to /skill:requesting-code-review", async () => {
    const { inputHandlers, appended } = setup();
    const result = await runInput(inputHandlers, { text: "/review", source: "interactive" }, makeCtx());
    expect(result.action).toBe("transform");
    expect(result.text).toBe("/skill:requesting-code-review");
    expect(getPhase(appended)).toBe("review");
  });

  test("/finish presents the reminder pre-fill (handled, not transform)", async () => {
    const { inputHandlers, appended } = setup();
    const ctx = makeCtx();
    const result = await runInput(inputHandlers, { text: "/finish", source: "interactive" }, ctx);
    expect(result.action).toBe("handled");
    expect(ctx.ui.setEditorText).toHaveBeenCalledWith(
      "Before finishing:\n" +
        "- Does this work require documentation updates? (README, CHANGELOG, API docs, inline docs)\n" +
        "- What was learned during this implementation? (surprises, codebase knowledge, things to do differently)\n\n" +
        "/skill:finishing-a-development-branch",
    );
    expect(getPhase(appended)).toBe("finish");
  });

  test("/execute presents the choice (handled, not transform)", async () => {
    const { inputHandlers, appended } = setup();
    const ctx = makeCtx();
    const result = await runInput(inputHandlers, { text: "/execute", source: "interactive" }, ctx);
    expect(result.action).toBe("handled");
    expect(ctx.ui.setEditorText).toHaveBeenCalledWith(expect.stringContaining("/skill:subagent-driven-development"));
    expect(ctx.ui.setEditorText).toHaveBeenCalledWith(expect.stringContaining("/skill:executing-plans"));
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.any(String), "info");
    expect(getPhase(appended)).toBe("execute");
  });

  test("args are preserved: /brainstorm build a chat app → /skill:brainstorming build a chat app", async () => {
    const { inputHandlers } = setup();
    const result = await runInput(
      inputHandlers,
      { text: "/brainstorm build a chat app", source: "interactive" },
      makeCtx(),
    );
    expect(result.action).toBe("transform");
    expect(result.text).toBe("/skill:brainstorming build a chat app");
  });

  test("direct /skill:writing-plans advances tracker but returns continue (not transform)", async () => {
    const { inputHandlers, appended } = setup();
    const result = await runInput(inputHandlers, { text: "/skill:writing-plans", source: "interactive" }, makeCtx());
    expect(result.action).toBe("continue");
    expect(getPhase(appended)).toBe("plan");
  });

  test("non-command input passes through unchanged", async () => {
    const { inputHandlers, appended } = setup();
    const result = await runInput(inputHandlers, { text: "hello world", source: "interactive" }, makeCtx());
    expect(result.action).toBe("continue");
    expect(getPhase(appended)).toBeNull();
  });

  test("extension-source messages are skipped", async () => {
    const { inputHandlers, appended } = setup();
    const result = await runInput(inputHandlers, { text: "/brainstorm", source: "extension" }, makeCtx());
    expect(result.action).toBe("continue");
    expect(getPhase(appended)).toBeNull();
  });
});
