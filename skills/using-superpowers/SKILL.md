---
name: using-superpowers
description: Use when starting any conversation — how to find and invoke relevant skills, with rationalizations for skipping them
---

# Using Superpowers

## The Rule

Invoke relevant or requested skills before acting on a task. If it turns out wrong for the situation, you don't have to use it.

Then announce "Using [skill] to [purpose]" and follow the skill exactly. If it has a checklist, create a todo per item.

## Working Directory

Always work in the user's current working directory — the project the user opened or `cd`'d into. Never `cd` into or run commands against the directory where a skill file lives (the installed package directory). When a skill says "explore project context" or "check recent commits," it means the user's project, not the skill's install location. The skill's path appears in the prompt only so you can resolve relative file references inside the skill — it is not a working directory.

## Skill Priority

When multiple skills apply, process skills come first — they set the approach, then implementation skills (frontend-design, etc.) carry it out. Brainstorming and systematic-debugging are Superpowers' most common process skills, but the rule holds for any of them.

- "Let's build X" → `/brainstorm` first (loads the brainstorming skill), then implementation skills.
- "Fix this bug" → `/skill:systematic-debugging` first, then domain skills.

## Red Flags

These thoughts mean STOP—you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Check for relevant skills before acting on the task. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read current version. |
| "This doesn't count as a task" | Action = task. Check for skills. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check for skills before starting the task. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |
| "I know what that means" | Knowing the concept ≠ using the skill. Invoke it. |
| "The skill prompt shows a path — I should cd there" | That's the skill's install location, not the user's project. Stay in the user's working directory. |

## Platform Adaptation

If your harness is Pi, read its reference file for special instructions:

- Pi: `references/pi-tools.md`

## User Instructions

User instructions (CLAUDE.md, AGENTS.md, GEMINI.md, etc, direct requests) take precedence over skills, which in turn override default behavior. Only skip skill workflows or instructions when your human partner has explicitly told you to.
