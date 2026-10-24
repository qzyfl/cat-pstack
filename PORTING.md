# cat-pstack — porting pstack to WorkBuddy

`cat-pstack` is a fork of [`pstack-pro/pstack-workbuddy`](https://github.com/pstack-pro/pstack-workbuddy)
(`aabc358`), which in turn ports [`cursor/plugins` → `pstack/`](https://github.com/cursor/plugins/tree/main/pstack).
The fork exists because the upstream port shipped four defects and dropped one subsystem;
§[Fixes over the upstream port](#fixes-over-the-upstream-port) lists every one, with the
check that now prevents it from returning.

This file is the adaptation record. Skill and agent bodies stay in English. Regenerate them with `node scripts/port.mjs`; do not hand-edit `skills/`, `agents/`, `docs/guide/`, or `LICENSE`.

WorkBuddy's plugin format is documented on Tencent's CodeBuddy docs site (https://www.workbuddy.cn/docs/cli/plugins-reference), which is the source of the format this port follows.

## Upstream pin

| | |
| --- | --- |
| Source | <https://github.com/cursor/plugins> `pstack/` |
| Commit | `e73df471cd4bd918367e99f3dd9c51bd53ddf5f0` |
| Commit time | 2026-10-23T15:56:09-07:00 |
| Plugin version | 0.15.32 (from upstream `.cursor-plugin/plugin.json`) |
| Skills | 58 |
| Agents | 2 (`poteto-agent`, `comment-sicko`) |

Recorded in `UPSTREAM.json`. Upstream's host adapter is `docs/harness/claude-code.md`. This port does not ship that file. It ships `docs/harness/workbuddy.md` and injects it on `SessionStart`.

Layout cues came from [pstack-claude](https://github.com/pstack-pro/pstack-claude) and [pstack-pi](https://github.com/pstack-pro/pstack-pi): a manifest, a marketplace file, Node hooks, `overrides/`, and `UPSTREAM.json`. Tool names in the skill text are rewritten to `Agent`, `AskUserQuestion`, and `Bash`.

## Fixes over the upstream port

Forked from `pstack-pro/pstack-workbuddy` @ `aabc358`. Four defects and one omission, all
reproduced before fixing and all covered by `scripts/validate.mjs` afterwards.

### 1. Two conflicting `subagent_type` values in one sentence

`port.mjs` swapped `` `readonly: true` `` → `` `subagent_type: "Explore"` `` unconditionally, but
three of the five upstream sentences that carry `readonly` already contain a `subagent_type:`
clause. The result was self-contradictory instruction text:

```text
Every spawn is an Agent subagent with `subagent_type: general-purpose` and `subagent_type: "Explore"`.
```

Hit files: `skills/how/SKILL.md`, `skills/interrogate/SKILL.md`, and two lines in
`skills/reflect/SKILL.md` (the last two produced a duplicated `general-purpose` instead).
`how` runs on every nontrivial change and `interrogate` is the multi-model review entry point,
so both are load-bearing.

**Fix:** four whole-sentence rewrites, ordered *before* the generic `generalPurpose` swap and
before the blanket `readonly:` fallbacks. Each keeps the upstream intent:

| File | Upstream | Now | Why |
| --- | --- | --- | --- |
| `how` | `generalPurpose` + `readonly: true` | `Explore` | Explore is strictly read-only |
| `interrogate` | `generalPurpose` + `readonly: true` | `Explore` | reviewers must not write |
| `reflect` (×2) | `generalPurpose` + `readonly: false` | `general-purpose` | reviewers need MCP, which Explore lacks |

The replacement text deliberately avoids the literal `` `readonly: `` string, so the later
fallback rules cannot match it a second time. That double-match was a real intermediate bug.

**Guard:** `validate.mjs` fails on any single line carrying more than one distinct
`subagent_type` value.

### 2. The benny automation pack was dropped entirely

Upstream ships `automations/benny/` — 12 files, ~1,528 lines: a Slack issue-triage automation
and a reproduce-and-fix automation, plus their setup skill, references, and templates. The
port copied only `skills/`, `agents/`, and `docs/guide/`, so the whole pack vanished silently.

**Fix:** `port.mjs` now copies `automations/benny`, runs the same text transforms over it, and
preserves a hand-written `automations/benny/WORKBUDDY.md` across regeneration. `bundle.mjs`
includes `automations` in `COPY_DIRS`.

`WORKBUDDY.md` is new and states the capability matrix honestly: WorkBuddy has scheduled
automations (the replacement for Cursor Automations) but no Slack event webhook, so the trigger
degrades to polling. It also lists the four things to prove on a harmless test report before
enabling either automation.

**Guard:** `validate.mjs` fails if the pack or any of its seven key files is missing.

### 3. Renamed to `cat-pstack`

The plugin is `cat-pstack` and every command is `/cat-pstack:<skill>`. 191 namespace
references across 26 files, plus the hooks, the two manifests, and the validator.

`port.mjs` now derives the name from two constants (`PLUGIN_NAME`, `UPSTREAM_PLUGIN_NAME`);
renaming again is a one-line change rather than another 191-reference sweep.

**Guard:** `validate.mjs` fails on any stale `/pstack:` prefix, and checks that both
`plugin.json` and `marketplace.json` agree on `cat-pstack`.

### 4. `validate.mjs` hard-coded the old plugin name

`plugin.name !== "pstack"` and a `"pstack"` literal in the marketplace bump meant the validator
could never pass after the rename, and would have masked real failures.

**Fix:** both now compare against `PLUGIN_NAME`.

### Correcting my own earlier claim

An earlier analysis of this repository reported `disable-model-invocation` on 56 of 58 skills,
implying the port lost a policy flag. That was a counting error on my side: the port matches
upstream exactly at **57 of 58** (only `setup-pstack` is model-invocable). No fix was needed.

## What the script does

`node scripts/port.mjs [path/to/plugins/pstack]` copies `skills/`, `agents/`, and `docs/guide/` from the checkout, then:

1. Rewrites Cursor tool names, paths, and feature sentences that have a WorkBuddy equivalent.
2. Prefixes skill slash commands with `cat-pstack:` so they match plugin namespacing. The sticky hook still accepts a bare `/poteto-mode`, for a manual copy.
3. Drops skill frontmatter keys the manifest format does not use: `icon`, `color`, `paths`, `mode`, `reminder`. Forces `name` to the directory name.
4. When `paths:` was removed, adds one body line telling the model to apply the skill on `.ts` / `.tsx` edits. That is `typescript-best-practices`.
5. Maps agent `is_background:` to `background: true`.
6. Appends a "Sticky mode on WorkBuddy" section to `skills/poteto-mode/SKILL.md`.
7. Injects a short WorkBuddy note under the first heading of any file that still names a Cursor-only model, product, or feature.
8. Replaces the Cursor transcript slug block in `skills/poteto-mode/scripts/worktree-audit.sh` with an empty search. `LAST_CHAT` stays `-`. No session directory under the home folder was confirmed.
9. Copies `overrides/` on top. Today that is only `skills/setup-pstack/SKILL.md`.
10. Replaces `LICENSE` with upstream's MIT text (Copyright (c) 2026 Lauren Tan) and writes `UPSTREAM.json`. The plugin `version` is set from that pin.

`node scripts/validate.mjs` checks frontmatter, unique names, hard leftovers, the license pin, the hooks, and that the forbidden product name appears only in this file.

## Frontmatter

Skill fields this port keeps: `name`, `description`, `allowed-tools`, `disable-model-invocation`, `user-invocable`, `context`, `agent`, `model`, `hooks`, `disable`.

Agent fields: `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, `isolation`. Plugin agents do not carry `hooks`, `mcpServers`, or `permissionMode`. Neither shipped agent uses those.

The manifest is `.workbuddy-plugin/plugin.json`. The marketplace file is `.workbuddy-plugin/marketplace.json` with `source: "./"`. `category` is `development`. It is not `interaction`.

## Replacements

| Cursor | WorkBuddy |
| --- | --- |
| `Task` | `Agent` |
| `AskQuestion` | `AskUserQuestion` |
| `generalPurpose` | `general-purpose` |
| `readonly: true` | `subagent_type: "Explore"` |
| `readonly: false` | `subagent_type: "general-purpose"` |
| `environment: "cloud"` | `isolation: "worktree"` (a local git worktree, not a cloud machine) |
| `environment: "local"` | omit `isolation` |
| `cloud_base_branch` | tell the worker which branch to check out |
| `subagent_type: "poteto-agent"` | `cat-pstack:poteto-agent` |
| `subagent_type: "comment-sicko"` | `cat-pstack:comment-sicko` |
| `Shell` in the tool list sentence | `Bash` |
| Open a todolist | `TaskCreate`, with an in-reply list if that tool is absent |
| `~/.cursor/rules/pstack-models.mdc` | `~/.workbuddy/pstack-models.md` |
| `~/.cursor/skills/`, `.cursor/skills/` | `~/.workbuddy/skills/`, `.workbuddy/skills/` |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `~/.workbuddy/plugins/`, `.workbuddy-plugin/plugin.json` |
| Transcript slug `~/.cursor/projects/<slug>/agent-transcripts/` | the hook's `transcript_path` only. Do not invent a directory. |
| `/add-plugin pstack` | `/plugin marketplace add` then `/plugin install`, or copy skills into `~/.workbuddy/skills/` |
| Custom Mode, Option+Enter, Alt+Enter | plugin sticky hook, documented in the skill |
| Built-in `create-skill` | authoring-a-skill playbook |
| Built-in babysit | Babysit playbook |
| `/loop` | finish-condition loop |
| Cursor cloud agents / dashboard | worktree subagents; reattach by PR and branch |
| `cursor-team-kit` `/deslop` | review the diff, then `/cat-pstack:no-comments` |
| `control-ui` / `control-cli` | a project `verify-*` skill when one exists |
| Resume / message / queue on an Agent id | spawn a fresh agent and paste the prior report |
| Cursor Plan Mode / Projects | the built-in plan interaction mode if the user already turned it on. This plugin does not switch it. |

A sentence that still needs a Cursor-only product says so and tells the model to skip that step in one line.

## setup-pstack

The override writes `~/.workbuddy/pstack-models.md`. The owner's WorkBuddy 5.8.3 install (`/Applications/WorkBuddy.app`, tag `5.8.3-wb.41334564`) has no `~/.workbuddy/rules/` directory. Published pages for this app do not describe a rules directory under `~/.workbuddy` that auto-loads. `~/.workbuddy/memory/<user-id>_memory.md` is personal memory, not a role table. The `SessionStart` hook injects the model file. That is the always-on mechanism.

Detection order:

1. `~/.workbuddy/models.json`. Use string `id` fields on a top-level `models` array, or on a bare array. `name` is a display label. Do not copy `apiKey` or other secrets. A public teardown of an older desktop build shows product model entries shaped this way (`id`, `name`, separate `reasoning.effort`). The owner's file was not in this workspace, so the skill stays defensive.
2. Agent tool schema ids in the session, intersected with those `id` values when both exist.
3. A paste from the model picker.

Effort is a separate `# effort` line (`max`, `xhigh`, `high`, `medium`). It is not baked into the model id. There is no `-fast` suffix. `inherit` and `auto` mean omit Agent `model`.

## Sticky /poteto-mode

WorkBuddy has no Custom Mode and no Option+Enter binding.

`hooks/hooks.json` registers two command hooks. The command placeholder is `${CLAUDE_PLUGIN_ROOT}`, which the plugin loader substitutes with the plugin directory at load time. The scripts also resolve the plugin root from their own file path.

- `UserPromptSubmit` runs `hooks/sticky-poteto.mjs`. A prompt that **starts with** `/cat-pstack:poteto-mode` or `/poteto-mode` sets that `session_id` on. `/cat-pstack:poteto-help` does not. Later prompts get the skill body until `/cat-pstack:poteto-mode off` or `exit poteto-mode`.
- `SessionStart` runs `hooks/session-start.mjs`. It injects `docs/harness/workbuddy.md`, `~/.workbuddy/pstack-models.md` when that file exists, `transcript_path`, and a one-line reminder if that session is still on.

State is `${WORKBUDDY_PLUGIN_DATA}/sticky-sessions.json` when that variable is set, otherwise `~/.workbuddy/plugins/data/pstack/sticky-sessions.json`. Rows older than 14 days are dropped. Hook stdout is `{ "continue": true, "hookSpecificOutput": { "hookEventName", "additionalContext" } }`.

The skill body cap inside the sticky hook is 24,000 characters. `skills/poteto-mode/SKILL.md` is about 22 KB, so the current text is not truncated. A manual copy into `~/.workbuddy/skills/` does not load `hooks/hooks.json`.

Output styles only change tone. A plugin `settings.json` `agent` would replace the main thread for every session. A project memory file would cover casual turns. None of those is a per-chat mode.

## Interaction-mode fragments (experimental, untested)

Do not install this. It is not part of the plugin.

On the owner's Mac, built-in plugins `interactionmode-craft`, `interactionmode-ask`, `interactionmode-plan`, `interactionmode-expert`, and `interactionmode-quick` use `.workbuddy-plugin/plugin.json` with `category: "interaction"`. `interactionmode-expert` is only that manifest plus `fragments/` (`agent-loop.md`, `current-mode.md`, `interaction.md`, `result-presentation.md`, `task-management.md`, `tool-use.md`). Those modes are ask / plan / craft / expert (and quick). They are the app's own behavior fragments, composed on top of a welcome-mode template.

The loader exercised in the loader check composes those fragments only when the marketplace name is `workbuddy-builtin` and the plugin name starts with `interactionmode-`. A third-party marketplace is ignored. If more than one of those built-in mode plugins is enabled, composition is skipped entirely. Shipping a `fragments/` directory with `category: "interaction"` from this repo would not register a poteto mode, and enabling an extra built-in mode plugin can disable composition of the real ones.

No public WorkBuddy page found for this port says a third-party plugin may add an interaction mode. Hooks stay the default. Hands-on testing in WorkBuddy 5.8.3 would be required before anyone tries a fragment plugin, and that test should be on a copy of the app, not this package.

## Intentionally kept Cursor words

`scripts/validate.mjs` allows these only in files that also carry the WorkBuddy note. Counts are files. Re-run the validator for the current numbers. They are names the note tells the model not to call: Cursor model slugs, `-fast`, `/loop`, Bugbot, Custom Mode, `cursor-team-kit`, `cloud_base_branch`, `agent-transcripts`, `update_state`, `SendToUser`, and `api2.cursor.sh`.

Hard failures: leftover `AskQuestion`, `generalPurpose`, a `.cursor/` path, `pstack-models.mdc`, `/add-plugin`, `is_background`, `Option+Enter`, `Alt+Enter`, and `environment: "cloud"` or `"local"`. A line that says the feature does not exist is allowed. A `codebuddy` string anywhere except this file is a failure.

## Verified without the desktop app

- `node scripts/validate.mjs`.
- Hook fixtures: help does not stick, `/cat-pstack:poteto-mode` sticks, a later turn re-injects, another `session_id` stays off, `off` clears, bare `/poteto-mode` sticks. The model file is read from `~/.workbuddy/pstack-models.md`.
- `node scripts/bundle.mjs` writes `dist/pstack-<version>.zip` with `SKILL.md` at the zip root and each skill at `skills/<name>/SKILL.md`. The build fails when the file count passes 200, the zip or its uncompressed size passes 10MB, the version is not SemVer, or the SkillHub slug is not `pstack`.
- SkillHub upload allows only `.md`, `.txt`, `.json`, `.ts`, `.mjs`, `.js`, `.sh`, `.py`, `.yaml`, and `.yml`. The zip ships `LICENSE.md`, `NOTICE.md`, `skills/poteto-mode/scripts/watch-pr/watch-pr.ts` (the bun launcher, same bytes), and `skills/show-me-your-work/references/decision-log-template.txt` (same bytes as the `.tsv`). It omits guide images, `skills/poteto-mode/scripts/bun.lock` (bun recreates it), and `skills/statechart/scripts/test/` (fixtures, including `.mmd`). Bundled `docs/guide/*.md` copies drop image tags. Repo files keep their original names. Skill bodies are not edited.

## Verified on WorkBuddy 5.8.3

- A wrapper installed at `~/.workbuddy/skills/<wrapper>/` discovers nested skills at `<wrapper>/skills/<name>/SKILL.md`. Each nested skill is invocable on its own. The same files placed at `<wrapper>/<name>/SKILL.md` are not discovered.
- A bundle built in that shape was installed. `/setup-pstack` and `/poteto-mode` ran. SkillHub slug for this package is `pstack`, and the unzip directory is `~/.workbuddy/skills/pstack/`.

## Not verified in WorkBuddy

- Adding this GitHub repo or a zip from the desktop plugin screen. The owner's `known_marketplaces.json` stores markets as `directory` or `zip`. The in-app button labels were not clicked.
- Whether a copied skill shows up before restart. `~/.workbuddy/.skill-list-cache.json` exists. An existing skill such as `grill-me` also has `_skillhub_meta.json`. This port does not write that file. It is unknown whether a hand-copied skill needs it.
- Plugin commands `/cat-pstack:poteto-mode` and `/cat-pstack:setup-pstack` inside the app, the sticky hook, and whether setup wrote `~/.workbuddy/pstack-models.md` from the owner's `models.json`. The bundle commands `/poteto-mode` and `/setup-pstack` did run. The written model file was not inspected.
- Whether `session_id` stays stable across resume. Sticky state is keyed by that id.
- `TaskCreate`, `EnterWorktree`, and `AskUserQuestion` on the desktop. Those names are carried as the tool names the skills already use. They were not called against the app.
- Plugin `hooks/hooks.json` actually running under WorkBuddy 5.8.3. The hook command relies on the loader substituting `${CLAUDE_PLUGIN_ROOT}`.

## Loader check

The install check used the CodeBuddy CLI `@tencent-ai/codebuddy-code@2.174.0` on Linux, because that is the loader which accepts `.workbuddy-plugin/`. There was no WorkBuddy.app and no login.

`plugin validate` accepted `.workbuddy-plugin/marketplace.json` and `.workbuddy-plugin/plugin.json`. `plugin marketplace add` of this directory (type `directory`, name `pstack-workbuddy`) plus `plugin install pstack@pstack-workbuddy --scope user` enabled version 0.15.32. A headless `codebuddy --plugin-dir /workspace -p ping` then loaded the plugin before stopping. The log line for the installed plugin was `2 agent(s), 0 command(s), 58 skill(s), 2 hook(s)`, and `active plugins refreshed: 2 enabled, errors=0` (the second enabled plugin is the same tree passed via `--plugin-dir`, which the log counted as 4 hooks). Both `hooks/sticky-poteto.mjs` and `hooks/session-start.mjs` were spawned with `${CLAUDE_PLUGIN_ROOT}` already replaced by an absolute path. SessionStart returned additional context. Stdout stopped at `Authentication required`, so no model turn ran.

That CLI writes its plugin cache under its own home (`~/.codebuddy/plugins/cache/pstack-workbuddy/pstack/0.15.32` in this run). That is the CLI's data directory, not the WorkBuddy desktop install path `~/.workbuddy/plugins/cache/<marketplace>/<name>/<version>/`.
