import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { loadAgentsFromDir } from "../../../extensions/subagent/agents";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-agents-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeAgent(dir: string, name: string, content: string) {
  fs.writeFileSync(path.join(dir, `${name}.md`), content, "utf-8");
}

describe("agent frontmatter extensions parsing", () => {
  test("agent with a single extension path is parsed correctly", () => {
    writeAgent(
      tmpDir,
      "my-agent",
      `---
name: my-agent
description: A test agent
extensions: ../extensions/some-extension.ts
---
You are a test agent.
`,
    );

    const agents = loadAgentsFromDir(tmpDir, "user");
    expect(agents).toHaveLength(1);
    expect(agents[0].extensions).toEqual(["../extensions/some-extension.ts"]);
  });

  test("agent with multiple extension paths (comma-separated) is parsed correctly", () => {
    writeAgent(
      tmpDir,
      "multi-ext-agent",
      `---
name: multi-ext-agent
description: Agent with multiple extensions
extensions: ../extensions/ext-a.ts, ../extensions/ext-b.ts
---
You are a multi-extension agent.
`,
    );

    const agents = loadAgentsFromDir(tmpDir, "project");
    expect(agents).toHaveLength(1);
    expect(agents[0].extensions).toEqual(["../extensions/ext-a.ts", "../extensions/ext-b.ts"]);
  });

  test("agent without extensions field has undefined extensions", () => {
    writeAgent(
      tmpDir,
      "no-ext-agent",
      `---
name: no-ext-agent
description: Agent without extensions
---
You are an agent with no extensions.
`,
    );

    const agents = loadAgentsFromDir(tmpDir, "user");
    expect(agents).toHaveLength(1);
    expect(agents[0].extensions).toBeUndefined();
  });

  test("agent with empty extensions field has undefined extensions", () => {
    writeAgent(
      tmpDir,
      "empty-ext-agent",
      `---
name: empty-ext-agent
description: Agent with empty extensions field
extensions: 
---
You are an agent with an empty extensions field.
`,
    );

    const agents = loadAgentsFromDir(tmpDir, "user");
    expect(agents).toHaveLength(1);
    // Empty / whitespace-only value should yield undefined (empty array filtered out)
    expect(agents[0].extensions).toBeUndefined();
  });

  test("extensions with extra whitespace around paths are trimmed", () => {
    writeAgent(
      tmpDir,
      "whitespace-agent",
      `---
name: whitespace-agent
description: Agent with whitespace in extensions
extensions:  ../extensions/ext-a.ts ,  ../extensions/ext-b.ts 
---
You are a trimmed agent.
`,
    );

    const agents = loadAgentsFromDir(tmpDir, "user");
    expect(agents).toHaveLength(1);
    expect(agents[0].extensions).toEqual(["../extensions/ext-a.ts", "../extensions/ext-b.ts"]);
  });

  test("agent with numeric timeout frontmatter field populates AgentConfig.timeout", () => {
    writeAgent(
      tmpDir,
      "timed-agent",
      `---
name: timed-agent
description: Agent with a timeout
timeout: 120000
---
You are a timed agent.
`,
    );

    const agents = loadAgentsFromDir(tmpDir, "user");
    expect(agents).toHaveLength(1);
    expect(agents[0].timeout).toBe(120000);
  });

  test("agent without timeout field has undefined timeout", () => {
    writeAgent(
      tmpDir,
      "no-timeout-agent",
      `---
name: no-timeout-agent
description: Agent without timeout
---
You are an untimed agent.
`,
    );

    const agents = loadAgentsFromDir(tmpDir, "user");
    expect(agents).toHaveLength(1);
    expect(agents[0].timeout).toBeUndefined();
  });

  test("agent with non-numeric timeout field has undefined timeout (ignored, not crashed)", () => {
    writeAgent(
      tmpDir,
      "bad-timeout-agent",
      `---
name: bad-timeout-agent
description: Agent with bad timeout
timeout: not-a-number
---
You are a badly-timed agent.
`,
    );

    const agents = loadAgentsFromDir(tmpDir, "user");
    expect(agents).toHaveLength(1);
    expect(agents[0].timeout).toBeUndefined();
  });

  test("agent with a model frontmatter field populates AgentConfig.model", () => {
    writeAgent(
      tmpDir,
      "modeled-agent",
      `---
name: modeled-agent
description: Agent with a model
model: claude-sonnet-4-5
---
You are a modeled agent.
`,
    );

    const agents = loadAgentsFromDir(tmpDir, "user");
    expect(agents).toHaveLength(1);
    expect(agents[0].model).toBe("claude-sonnet-4-5");
  });

  test("agent without model field has undefined model", () => {
    writeAgent(
      tmpDir,
      "no-model-agent",
      `---
name: no-model-agent
description: Agent without a model
---
You are an unmodeled agent.
`,
    );

    const agents = loadAgentsFromDir(tmpDir, "user");
    expect(agents).toHaveLength(1);
    expect(agents[0].model).toBeUndefined();
  });
});
