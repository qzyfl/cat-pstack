# pstack on WorkBuddy

pstack skills were written for Cursor. This port rewrites the names that have a WorkBuddy equivalent. Where a line still uses a Cursor name, apply this file and say what you did. `<plugin>` is the directory that contains `skills/` and this file. Never pass a field or value the tool schema rejects.

Plugin commands are `/cat-pstack:<skill>`. A manual copy into `~/.workbuddy/skills/` registers `/<skill>` with no prefix. The skill text uses the plugin form.

## Tools

| Cursor | WorkBuddy |
| --- | --- |
| `Task` | `Agent`. Several `Agent` calls in one message run in parallel. `run_in_background: true` is an Agent parameter when the tool schema lists it. |
| `AskQuestion` | `AskUserQuestion`. |
| Open a todolist | `TaskCreate` and `TaskUpdate` when those tools exist. If they are absent, keep the list in the reply and update it at each phase. |
| Run another pstack skill | Read `<plugin>/skills/<name>/SKILL.md`, or invoke `/cat-pstack:<name>` (plugin install) or `/<name>` (manual copy). |
| `Shell` | `Bash`. |
| `Grep`, `Glob`, `Read`, `Edit`, `Write` | Same names. |

## Subagents

| Cursor | WorkBuddy |
| --- | --- |
| `subagent_type: generalPurpose` | `general-purpose`. It can edit files. |
| `poteto-agent`, `comment-sicko` | `cat-pstack:poteto-agent`, `cat-pstack:comment-sicko` when the plugin is installed. Manual copies use the names without the prefix. |
| `readonly: true` | `subagent_type: "Explore"`. Explore is strictly read-only. When the worker needs MCP, use `general-purpose` and tell it not to edit, then check `git status`. |
| `readonly: false` / agent mode | `general-purpose`. |
| `environment: "cloud"` | `isolation: "worktree"` on a plugin agent, or `EnterWorktree` when that tool exists. This is a local git worktree, not a Cursor cloud machine. |
| `environment: "local"` | Omit `isolation`. There is no `environment` field. |
| `cloud_base_branch` | There is no such parameter. Tell the worker which branch to check out. |
| `resume` / message / queue on an Agent id | Not available. Spawn a fresh `Agent` and paste the prior report and branch. Do not invent a resume parameter. |
| `file_attachments` | List the paths in the brief. |
| `background: true` on an agent file | Same effect as the caller passing `run_in_background: true` when the schema accepts it. |
| Plugin agent `permissionMode`, `hooks`, `mcpServers` | Do not add them. |

Built-in subagent names include `general-purpose`, `Explore`, and `Plan`. Omit `model` to inherit the parent. There is no `-fast` suffix. `effort`, when the schema accepts it, is separate from the model id: `minimal`, `low`, `medium`, `high`, `xhigh`, `max`.

WorkBuddy's ask interaction mode is a read-only product mode. It is not a `subagent_type`. Do not pass `ask` as a subagent name.

## Models

Cursor compound slugs such as `claude-opus-5-5-xhigh`, `grok-4.7-xhigh-fast`, `cursor-grok-*`, and `composer-*` are not WorkBuddy model ids. Do not pass them.

Read the role line in `~/.workbuddy/pstack-models.md`. `/cat-pstack:setup-pstack` writes that file. The `SessionStart` hook injects it. WorkBuddy does not auto-load a rules directory for this file. If the file or the line is missing, omit `model` and say which role had no line.

`inherit` and `auto` in that file mean omit `model`. A panel line is a list. One subagent runs per entry. `arena cross-judge pool` picks one entry whose model family differs from the parent when it can.

The `# effort` line is the budget. It is separate from the model id. The ladder is `max` > `xhigh` > `high` > `medium` > `low` > `minimal`. Raise or lower `effort` by one step the way the skill says to raise or lower the Cursor effort token. There is no fast mode. When a skill says "use fast", keep the role's model and say there is no `-fast` tier.

Confirmed ids come from `~/.workbuddy/models.json` (`id` fields only) or from the Agent tool schema in this session. Never write a slug you have not seen there, or in a paste from the model picker.

## Paths

| Cursor | WorkBuddy |
| --- | --- |
| `~/.cursor/rules/pstack-models.mdc` | `~/.workbuddy/pstack-models.md`, injected by the session hook. |
| `.cursor/skills/`, `~/.cursor/skills/` | `~/.workbuddy/skills/`. A project copy can live in `.workbuddy/skills/` when the app reads the project. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `~/.workbuddy/plugins/`, `.workbuddy-plugin/plugin.json`. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | Use the hook's `transcript_path` when it is in context. Do not invent a slug. Do not read another workspace's sessions. |
| User memory | `~/.workbuddy/memory/` holds a per-user memory file. Do not write the model table there. |

## Sticky /poteto-mode

WorkBuddy has no Custom Mode, and no Option+Enter or Alt+Enter binding that pins a skill.

The plugin's `UserPromptSubmit` hook is the stand-in. A prompt that starts with `/cat-pstack:poteto-mode` or `/poteto-mode` turns the mode on for that `session_id`. Later prompts in the session get the skill injected again until `/cat-pstack:poteto-mode off` or `exit poteto-mode`. `SessionStart` repeats a short reminder if that session is still on.

Built-in interaction modes (ask, plan, craft, expert) are not a third-party mode slot. Do not add a `fragments/` directory or a `category` of `interaction` to imitate them.

A manual skill copy does not load `hooks/hooks.json`. Re-invoke the skill on the next task.

## No WorkBuddy equivalent

When a step needs one of these, write one line, `Skipped on WorkBuddy: <step>. <reason>.`, then continue. Do not invent the feature. Do not stop the whole task.

| Cursor | What to do |
| --- | --- |
| Custom Mode, Option+Enter, Alt+Enter, "Use as Mode" | The sticky hook above, or re-invoke the skill. |
| `/loop` | No such command. The Autonomous run playbook is the finish-condition loop. |
| `/add-plugin` | `/plugin marketplace add` then `/plugin install`, or copy `skills/` into `~/.workbuddy/skills/`. See the README. |
| Bugbot, agentic security review | No Bugbot product. Triage existing review threads with the forge command the step names. Skip a step that starts, waits for, or configures Bugbot. |
| Cursor Automations, `update_state` routines, `api2.cursor.sh` webhooks, `SendToUser` secret-request | Skip. |
| Cursor cloud agents and the cloud dashboard | `isolation: "worktree"` or `EnterWorktree` when that tool exists. Skip dashboard status and "runs while the laptop is closed". |
| `cursor-team-kit` (`/deslop`, `control-cli`, `control-ui`) | No such plugin. For `/deslop`, review the diff yourself and run `/cat-pstack:no-comments`. For control skills, use a project `verify-*` skill if one exists. |
| Built-in `create-skill` and built-in babysit | Use the authoring-a-skill playbook, and the Babysit playbook. |
| Cursor Plan Mode / Projects | Use WorkBuddy's built-in plan interaction mode if the user already turned it on. This plugin does not switch it. There is no Cursor Project object. Orchestrate is a local coordinator plus worktree subagents. |
| Built-in PR tool | Use the forge CLI the step names (`gh`, or `origin` when it is installed). |
