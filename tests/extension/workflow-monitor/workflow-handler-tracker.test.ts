import { beforeEach, describe, expect, test } from "vitest";
import { createWorkflowHandler, type WorkflowHandler } from "../../../extensions/workflow-monitor/workflow-handler";

describe("WorkflowHandler workflow-tracker integration", () => {
  let handler: WorkflowHandler;

  beforeEach(() => {
    handler = createWorkflowHandler();
  });

  test("advanceWorkflowTo(plan) activates plan phase", () => {
    handler.advanceWorkflowTo("plan");
    expect(handler.getWorkflowState()?.currentPhase).toBe("plan");
  });

  test("advanceWorkflowTo(execute) auto-completes the prior active phase", () => {
    handler.advanceWorkflowTo("plan");
    handler.advanceWorkflowTo("execute");

    const state = handler.getWorkflowState()!;
    expect(state.currentPhase).toBe("execute");
    expect(state.phases.plan).toBe("complete");
  });
});
