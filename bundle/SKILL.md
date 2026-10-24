---
name: cat-pstack
slug: cat-pstack
version: 0.15.32
displayName: "cat-pstack"
summary: "cat-pstack, Lauren Tan's (poteto) agent workflow, ported to WorkBuddy: 58 skills (poteto-mode, playbooks, principles, review and verification tools) in one install."
description: "Use when the user wants pstack or poteto-mode on WorkBuddy, asks which pstack skill or playbook fits a task, how to set up pstack, or a /cat-pstack:<name> or /<name> pstack command is not visible. Entry point and index for the 58 bundled pstack skills."
tags: [cat-pstack, pstack, poteto, workbuddy, workflow, agent-skills, code-review, verification]
license: MIT
homepage: https://github.com/qzyfl/cat-pstack
---

# cat-pstack for WorkBuddy

pstack is poteto's agent style packaged as skills: concise, detailed replies, deliberate subagents, unslopped prose, simple code, and verified work. `/poteto-mode` matches a task to a playbook, copies the playbook's steps into the todo list, and runs the other skills as the steps need them. This bundle is the community WorkBuddy port of pstack 0.15.32.

## What is installed

All 58 pstack skills sit next to this file in `skills/<name>/SKILL.md`. WorkBuddy discovers them as their own skills, so each one is a slash command under its bare name, such as `/poteto-mode`. This bundle is not the plugin, so there is no `cat-pstack:` prefix.

The skill text uses the plugin form `/cat-pstack:<name>`. When a skill says `/cat-pstack:<name>`, use `/<name>`. When it says `cat-pstack:poteto-agent` or `cat-pstack:comment-sicko`, see "Missing compared with the full plugin" below.

## Start

1. `/setup-pstack`: pick which WorkBuddy models pstack uses per role and the reasoning effort. It writes `~/.workbuddy/pstack-models.md`. You can skip it. Subagents then inherit the current model.
2. `/poteto-mode <task>`: the main entry point.
3. `/poteto-help <question>`: guidance on setup and on picking a skill, playbook, or principle.

If a command is not in the list, read `skills/<name>/SKILL.md` in this folder and follow it. Do the same when one skill tells you to run another.

## Paths

This folder is the `<plugin>` root that the skills mean. It holds `skills/`, `docs/`, `agents/`, `LICENSE.md`, and `NOTICE.md`. Read `docs/harness/workbuddy.md` before you follow a skill that asks for it. It maps Cursor tools, subagents, models, and paths to WorkBuddy. The user guide is `docs/guide/README.md`.

## Skills

### Start here

- `/setup-pstack`: Configure which WorkBuddy models pstack uses per role and at what reasoning effort.
- `/poteto-mode`: poteto's agent style for concise, detailed responses, deliberate subagents, unslopped prose, simple code, and verified work.
- `/poteto-help`: Guides users through pstack setup, /poteto-mode, and picking the skill, playbook, or principle for a task.

### Principles (one-rule skills poteto-mode cites; you rarely invoke them directly)

- `/principle-attack-the-premise`: Write the premise down and test it directly before you write another fix that assumes it.
- `/principle-boundary-discipline`: Concentrate guards at system boundaries (CLI, config, network, external APIs); trust internal types and keep business logic in pure functions.
- `/principle-build-the-lever`: Build the tool that does it or proves it (codemod, script, generator, or a skill your subagents follow) instead of working by hand.
- `/principle-encode-lessons-in-structure`: Encode the rule as a lint, metadata flag, runtime check, or script instead of more text.
- `/principle-exhaust-the-design-space`: Build 2-3 competing prototypes and compare side by side before committing.
- `/principle-experience-first`: Choose user delight over implementation convenience; ship fewer polished features over more rough ones.
- `/principle-explain-the-number`: Find what limits it, and rule out that it measured something other than the work you think.
- `/principle-fix-root-causes`: Trace each symptom back to the first place the system went wrong and fix it there.
- `/principle-foundational-thinking`: Get the data structures right so downstream code becomes obvious.
- `/principle-guard-the-context-window`: Route bulk to subagents; keep summaries in the main thread, not raw payloads.
- `/principle-laziness-protocol`: Bias toward deletion and the smallest change that solves the problem.
- `/principle-make-operations-idempotent`: Converge to the same end state regardless of partial prior runs.
- `/principle-migrate-callers-then-delete-legacy-apis`: Migrate callers and delete the old API in the same wave instead of preserving compatibility layers.
- `/principle-minimize-reader-load`: Count layers between question and answer, and hidden state in the reader's head; collapse one-caller wrappers and shrink mutable scope.
- `/principle-model-the-domain`: Apply when writing stateful logic, or when code branches a lot or repeats a shape assumption across files.
- `/principle-never-block-on-the-human`: Apply when tempted to ask 'should I do X?' on reversible work.
- `/principle-outcome-oriented-execution`: Converge on the target architecture; don't preserve smooth intermediate states with throwaway compatibility code.
- `/principle-prove-it-works`: Verify against the real artifact (run the feature, read the actual value, inspect the diff), not a proxy, self-report, or 'it compiles.'
- `/principle-redesign-from-first-principles`: Apply when integrating a new requirement into an existing design.
- `/principle-separate-before-serializing-shared-state`: Eliminate the sharing first; serialize structurally only when one shared writer is a real invariant.
- `/principle-sequence-verifiable-units`: Break work into small units that each end in a verifiable state, check each before the next, and order delivery so the sequence proves itself to a reviewer.
- `/principle-subtract-before-you-add`: Remove dead code, redundant validators, and stub references first, then build on the simpler base.
- `/principle-test-behavior-not-implementation`: Assert what the code's users can observe, so that the test fails when that behavior breaks and keeps passing when only the internals change.
- `/principle-type-system-discipline`: Make illegal states unrepresentable, brand semantic primitives, parse external data at boundaries, exhaust variants, derive from authoritative schemas.

### Workflow skills

- `/architect`: Sketch types, signatures, and module structure before code, then stay in the loop while implementation fills in.
- `/arena`: Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it.
- `/automate-me`: Drafts or revises a personal -mode skill via create-skill + unslop, optionally pulling fresh evidence from recent transcripts.
- `/benchmark-checklist`: Vet a perf measurement (limiter, tuning, limits, errors, repeatability, relevance, and whether the work happened) before you report or act on it.
- `/blast-radius`: Find what a change could break somewhere else before it ships, beyond the diff, and prove the one fact it's safe because of by running real code instead of writing it up.
- `/bro`: Restate the last message in plain human language, with no jargon.
- `/correct`: Find the mistakes agents keep repeating in this repo and make each one impossible.
- `/create-formal-verification-skill`: Generate a project-local skill that formally verifies the code where a bug costs the most and tests reach the least, in any language, with whichever verification tool...
- `/create-verification-skill`: Generate a project-local verification skill that drives your app the way a user does — any language, framework, or platform.
- `/figure-it-out`: Design an auditable playbook when no narrower one fits: a large migration, an ambitious multi-part change, or work a human reviews after stepping away.
- `/how`: Explains subsystem architecture, runtime flow, onboarding mental models.
- `/in-your-own-words`: Restate in your own words what you think the user's goals are and what problem they're trying to solve.
- `/interrogate`: Multiple LLM reviewers challenge changes from independent angles.
- `/ketchup`: Catch the user up on what changed in this chat since their last message, in plain words and small visuals.
- `/ketchup-video`: Catch the user up like /ketchup, with a short silent video of slides for what happened and the waiting calls as text under it.
- `/maintain-formal-verification-skill`: Bring a project's formal verification back in line with the code after the code changes: find the commits that touched verified code, update the model, harness, or pro...
- `/maintain-verification-skill`: Periodic pass that keeps a project's verification skill and feature map honest: parallel source readers per feature, one live session driving every feature, at most on...
- `/make-bot-ui`: Use when building a custom UI (page, dashboard, buttons) that should wake a Grok Bot over a webhook, when the user must provide a webhook sender key, or when exposing...
- `/no-comments`: Spawn Comment Sicko, fix accepted findings, and offer encodings for claimed constraints.
- `/recall`: Reconstruct your recent working context from your own chat history, live state, and the shared record (user reports, prior fixes, incidents), then hand back a tight cu...
- `/reflect`: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill.
- `/sharpen`: Make a task deeper, not bigger, then rewrite the prompt.
- `/show-me-your-work`: Keep a reviewable decision trail for long-running or unattended work: a TSV log with one row per decision (what, why, evidence, result).
- `/statechart`: Draw how any system moves between states, such as a product flow, a protocol, or a service, as a Mermaid statechart from a TLA+ model.
- `/swarm`: Fan out N parallel workers, drain them, and return one report.
- `/tdd`: Use only when the user explicitly asks for TDD, a failing test, or a regression test, OR when the bug has an obvious cheap local test target.
- `/teach`: Explain a body of work plainly so a person actually understands it.
- `/technical-writing`: Layered technical-writing standard: Diátaxis structure, Google developer style sentences, STE instruction rules, Global English syntax.
- `/typescript-best-practices`: TypeScript best practices.
- `/unslop`: Cut AI tells from any writing.
- `/why`: Discovers available MCPs and queries each evidence category (source control, issue tracker, long-form docs, real-time chat, infrastructure observability, error trackin...

## Missing compared with the full plugin

- The plugin's hooks are not loaded from a skill install. `/poteto-mode` does not stay on across turns, so invoke it again on each new task. The `SessionStart` hook that injects `~/.workbuddy/pstack-models.md` is also absent. Read that file yourself when a skill needs a model role.
- The plugin agents `poteto-agent` and `comment-sicko` are not registered. Their definitions are in `agents/` as reference docs. When a skill asks for `subagent_type: "cat-pstack:poteto-agent"` or `"cat-pstack:comment-sicko"`, spawn a `general-purpose` Agent. Paste the body of `agents/poteto-agent.md` or `agents/comment-sicko.md` into its prompt, along with the absolute path of `skills/poteto-mode/SKILL.md` in this folder. Say that you substituted the agent.

For sticky mode and the real agents, install the plugin. Add the marketplace `pstack-pro/pstack-workbuddy` as a git repo, then install `pstack@pstack-workbuddy`:

```text
/plugin marketplace add pstack-pro/pstack-workbuddy
/plugin install pstack@pstack-workbuddy
```

## SkillHub packaging notes

SkillHub only accepts `.md`, `.txt`, `.json`, `.ts`, `.mjs`, `.js`, `.sh`, `.py`, `.yaml`, and `.yml`. This zip drops or renames anything else. The repo copies keep the original names.

- The license text is `LICENSE.md`. The port notice is `NOTICE.md`.
- Guide pictures are left out, and the bundled guide pages do not reference them.
- `skills/poteto-mode/scripts/bun.lock` is left out. bun recreates it.
- `skills/statechart/scripts/test/` is left out. Those files are test fixtures, including `.mmd` charts, and are not needed at runtime.
- `skills/show-me-your-work/references/decision-log-template.tsv` ships as `skills/show-me-your-work/references/decision-log-template.txt` with the same content. When a skill says to copy `references/decision-log-template.tsv`, copy that `.txt` file.
- When a skill says to run `scripts/watch-pr/watch-pr`, run `bun skills/poteto-mode/scripts/watch-pr/watch-pr.ts` with the same arguments.

## Credits

pstack is by Lauren Tan (poteto), upstream at https://github.com/cursor/plugins/tree/main/pstack. The skill, agent, and guide text is Copyright (c) 2026 Lauren Tan and is used under the MIT license in `LICENSE.md`. The WorkBuddy port is by pstack-pro (https://github.com/pstack-pro/pstack-workbuddy). See `NOTICE.md`. This bundle is not affiliated with Cursor or Tencent.
