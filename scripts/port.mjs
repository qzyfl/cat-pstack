#!/usr/bin/env node
// Regenerates skills/, agents/, docs/guide/, and LICENSE from an upstream pstack checkout.
// Usage: node scripts/port.mjs [path/to/plugins/pstack]
// Source: the argument, else $PSTACK_SRC, else a shallow clone of
// https://github.com/cursor/plugins under the OS temp dir.
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UPSTREAM = "https://github.com/cursor/plugins.git";
// Plugin identity. Renaming here is enough: command prefixes, agent
// namespacing, and manifest names all derive from these two constants.
const PLUGIN_NAME = "cat-pstack";
const UPSTREAM_PLUGIN_NAME = "pstack";

function upstreamCheckout() {
	const dir = path.join(os.tmpdir(), "pstack-upstream-plugins");
	if (fs.existsSync(path.join(dir, ".git"))) {
		execFileSync("git", ["-C", dir, "pull", "--ff-only", "--quiet"], { stdio: "inherit" });
	} else {
		execFileSync("git", ["clone", "--depth", "1", "--quiet", UPSTREAM, dir], { stdio: "inherit" });
	}
	return path.join(dir, "pstack");
}

const src = path.resolve(process.argv[2] ?? process.env.PSTACK_SRC ?? upstreamCheckout());
if (!fs.existsSync(path.join(src, "skills", "poteto-mode", "SKILL.md"))) {
	console.error(`not a pstack checkout: ${src}`);
	process.exit(1);
}

const criticalHits = new Map();

function apply(text, from, to, critical = false) {
	const next = typeof from === "string" ? text.split(from).join(to) : text.replace(from, to);
	if (critical) {
		const key = String(from).slice(0, 90);
		criticalHits.set(key, (criticalHits.get(key) || 0) + (next === text ? 0 : 1));
	}
	return next;
}

const NOTE = [
	"> **WorkBuddy.** Read `docs/harness/workbuddy.md` (plugin root) before you follow the rest of this file.",
	"> Cursor compound slugs (`claude-opus-*-xhigh`, `grok-*-xhigh-fast`, `cursor-grok-*`, `composer-*`) are not WorkBuddy model ids. Read `~/.workbuddy/pstack-models.md` and omit `model` when the role line is missing.",
	"> WorkBuddy has no Custom Mode, no `/loop` command, no Bugbot, no cursor-team-kit, and no Cursor Automations or cloud agents. `-fast` is not a model-id suffix. Do not pass a field the Agent tool rejects.",
	"",
].join("\n");

const SOFT = [
	/claude-(?:opus|sonnet|haiku)-\d/i,
	/\bgrok-\d/,
	/\bgpt-5\.\d-sol/,
	/cursor-grok-/,
	/\bcomposer-/,
	/\bBugbot\b/,
	/Custom Mode/,
	/\/loop\b/,
	/cursor-team-kit/,
	/update_state/,
	/api2\.cursor\.sh/,
	/SendToUser/,
	/-fast\b/,
	/\bCursor\b/,
	/cloud_base_branch/,
	/agent-transcripts/,
];

const STICKY = `
## Sticky mode on WorkBuddy

WorkBuddy has no Custom Mode, and it has no Option+Enter or Alt+Enter binding that pins a skill.

When this plugin is installed, \`hooks/hooks.json\` listens for \`UserPromptSubmit\`. A prompt that starts with \`${PLUGIN_NAME}:poteto-mode\` (or \`/poteto-mode\` on a manual copy) turns sticky mode on for that \`session_id\`. Every later prompt in the session gets this skill injected again until the user sends \`${PLUGIN_NAME}:poteto-mode off\` or \`exit poteto-mode\`. \`SessionStart\` repeats a short reminder when that session resumes.

A copied skill folder under \`~/.workbuddy/skills/\` does not load plugin hooks. There, the mode applies to the message that invoked it. Start the next task by invoking the skill again.

Do not invent a Custom Mode toggle, and do not invent an interaction-mode plugin. Tell the user which install path they are on.
`;

// Longer and more specific strings first.
const REPLACEMENTS = [
	[
		"Transcripts live at `~/.cursor/projects/<slug>/agent-transcripts/<uuid>/<uuid>.jsonl`, where `<slug>` is the workspace path with the leading slash dropped and each \"/\" turned into \"-\" (so `/Users/you/proj` becomes `Users-you-proj`). Every line is one chat message.",
		"WorkBuddy does not use Cursor's `agent-transcripts` slug layout. Use the `transcript_path` from the session when the pstack hook injected it. Do not invent a session directory. Do not read another workspace's sessions.",
		true,
	],
	[
		"~/.cursor/rules/pstack-models.mdc",
		"~/.workbuddy/pstack-models.md",
	],
	["the `pstack-models.mdc` rule", "the `pstack-models.md` rule"],
	["`pstack-models.mdc`", "`pstack-models.md`"],
	["pstack-models.mdc", "pstack-models.md"],
	["~/.cursor/skills/", "~/.workbuddy/skills/"],
	["~/.cursor/plugins/", "~/.workbuddy/plugins/"],
	["`~/.cursor/projects/*/`", "`a guessed session directory`"],
	[".cursor/skills/", ".workbuddy/skills/"],
	[".cursor-plugin/plugin.json", ".workbuddy-plugin/plugin.json"],
	// benny (automations pack) lives outside the skill roots and uses its own
	// Cursor paths. Order matters: the longer, more specific prefixes go first so
	// `.cursor/automations/benny/` is not left half-rewritten by a shorter rule.
	[".cursor/automations/benny/", ".workbuddy/automations/benny/"],
	[".cursor/settings.json", ".workbuddy/settings.json"],
	[".cursor/benny/", ".workbuddy/benny/"],
	["point cursor at", "point WorkBuddy at"],
	["two cursor automations", "two WorkBuddy automations"],
	["cursor automations", "WorkBuddy automations"],
	["pointing cursor at", "pointing WorkBuddy at"],
	["prefer_cursor_actions", "prefer_agent_actions"],
	[
		"since a hand-typed `myrepo-worktrees/x` misses one that lives at `.cursor/worktrees/myrepo/x`",
		"since a hand-typed path misses one that `git worktree list` would have returned",
	],
	["`AskQuestion`", "`AskUserQuestion`"],
	[/\bAskQuestion\b/g, "AskUserQuestion"],
	['subagent_type: "comment-sicko"', `subagent_type: "${PLUGIN_NAME}:comment-sicko"`],
	['subagent_type: "poteto-agent"', `subagent_type: "${PLUGIN_NAME}:poteto-agent"`],
	// ORDER MATTERS: these whole-sentence readonly rewrites must run BEFORE the
	// generic `generalPurpose` → `general-purpose` swap and before the blanket
	// `readonly:` fallbacks below. 3 of the 5 upstream sentences that carry
	// `readonly` already contain a `subagent_type:` clause, so a blind swap
	// produces two conflicting subagent_type values in one sentence. Matching on
	// the untouched upstream text is the only reliable anchor.
	// (Fixed in cat-pstack; see PORTING.md §"Fixes over the upstream port".)
	[
		"Every spawn is a Task subagent with `subagent_type: generalPurpose` and `readonly: true`.",
		'Every spawn is an Agent subagent with `subagent_type: "Explore"`. Upstream made these read-only; Explore is strictly read-only, which is that requirement.',
	],
	[
		"Each reviewer gets `subagent_type: generalPurpose`, `readonly: true`, and `model` set",
		'Each reviewer gets `subagent_type: "Explore"` (upstream made these read-only; Explore is strictly read-only) and `model` set',
	],
	[
		"`subagent_type: generalPurpose`, agent mode (`readonly: false`). Reviewers need MCP access",
		"`subagent_type: general-purpose` (upstream kept agent mode). Reviewers need MCP access",
	],
	[
		"`subagent_type: generalPurpose`, `model` from the `reflect judgment, divergent, synthesizer` line (default `claude-opus-5-5-xhigh`), agent mode (`readonly: false`).",
		"`subagent_type: general-purpose` (upstream kept agent mode), `model` from the `reflect judgment, divergent, synthesizer` line (default `claude-opus-5-5-xhigh`).",
	],
	["generalPurpose", "general-purpose"],
	[
		"Every spawn is a Task subagent",
		"Every spawn is an Agent subagent",
	],
	["Task subagent", "Agent subagent"],
	["the Task tool", "the Agent tool"],
	["Task tool", "Agent tool"],
	["`Task` calls", "`Agent` calls"],
	["`Task` call", "`Agent` call"],
	["`Task` prompt", "`Agent` prompt"],
	["`Task` response", "`Agent` response"],
	["Spawn `Task`", "Spawn `Agent`"],
	["every Task spawn", "every Agent spawn"],
	["omit Task `model`", "omit Agent `model`"],
	// Fallbacks for any future upstream sentence that carries `readonly`
	// without an existing subagent_type clause. The four sentences that DO
	// carry one are consumed by the ordered rewrites near the top of this table.
	["`readonly: true`", '`subagent_type: "Explore"`'],
	["`readonly: false`", '`subagent_type: "general-purpose"`'],
	[
		"and readonly strips MCPs",
		"and Explore is strictly read-only, so use general-purpose when the worker needs MCP",
		],
	[
		"agent mode (readonly strips MCP)",
		"agent mode (use general-purpose; Explore is strictly read-only and WorkBuddy does not document it keeping MCP)",
	],
	[
		"**Do not use readonly/Ask mode.** It strips MCP access, which disables the MCP-backed investigators and the synthesizer's citation spot-checks.",
		"**Do not use Explore when the worker needs MCP.** Explore is strictly read-only. WorkBuddy's ask interaction mode is also read-only, and it is not a subagent type. Use `general-purpose` and tell it not to edit. Investigators still shouldn't write anything.",
	],
	[
		"Spawn one readonly judge subagent",
		"Spawn one Explore judge subagent",
	],
	[
		"Use `environment: \"local\"` only when the worker needs access to something on the user's computer.",
		"Omit `isolation` when the worker needs access to something on the user's computer. WorkBuddy has no `environment` field. `isolation: \"worktree\"` is a local git worktree, not a Cursor cloud machine.",
		true,
	],
	['`environment: "cloud"`', '`isolation: "worktree"`'],
	[
		"When a worker must start from a non-default pushed branch, pass `cloud_base_branch`.",
		"When a worker must start from a non-default pushed branch, tell it to check out that branch. WorkBuddy has no `cloud_base_branch` parameter.",
		true,
	],
	[
		"Resume, message, or queue a follow-up on an existing subagent only when the new work strictly needs state that lives in that agent and is costly to move: its local checkout, its uncommitted changes, or a process it still runs, such as a dev server, a simulator, or a babysit watcher.",
		"WorkBuddy does not document a resume, message, or queue parameter on the Agent tool. Do not invent one. Spawn a fresh subagent and paste the prior report and branch. When the work needs a live process (a dev server, a simulator, a watcher) or uncommitted files in a checkout you cannot see, say that reattach is unavailable and continue from the files on disk.",
		true,
	],
	[
		"Cursor's built-in `create-skill` skill",
		"the **authoring-a-skill** playbook (WorkBuddy has no built-in `create-skill`)",
	],
	[
		"Cursor's built-in `create-skill`",
		"the **authoring-a-skill** playbook (WorkBuddy has no built-in `create-skill`)",
	],
	[
		"Use Cursor's built-in `create-skill` skill to author the skill.",
		"Follow the **authoring-a-skill** playbook to author the skill. WorkBuddy has no built-in `create-skill`.",
	],
	[
		"through Cursor's built-in `create-skill` flow",
		"through the **authoring-a-skill** playbook (WorkBuddy has no built-in `create-skill`)",
	],
	[
		"which routes through Cursor's built-in `create-skill`",
		"which routes through the **authoring-a-skill** playbook (WorkBuddy has no built-in `create-skill`)",
	],
	[
		"1. Use the **create-skill** skill (Cursor's built-in for authoring SKILL.md files).",
		"1. Use the **authoring-a-skill** playbook. WorkBuddy has no built-in `create-skill`.",
		true,
	],
	[
		"Agent-facing prose also follows the **create-skill** skill (Cursor's built-in for authoring SKILL.md files).",
		"Agent-facing prose also follows the **authoring-a-skill** playbook. WorkBuddy has no built-in `create-skill`.",
		true,
	],
	[
		"hand to Cursor's built-in `create-skill` skill and run its draft / test / iterate loop.",
		"follow the **authoring-a-skill** playbook (WorkBuddy has no built-in `create-skill`).",
	],
	[
		"using Cursor's `/loop` command (a built-in, not a pstack skill). An event to watch (CI, a merge, a ref advancing) gets a watcher subagent that wakes you on the event, with a long time-based heartbeat as fallback. No event gets a fixed-interval heartbeat sized to when the result is worth re-checking.",
		"using a finish-condition loop. WorkBuddy has no `/loop` command. `CronCreate` can schedule a later check, but it is not `/loop`. An event to watch (CI, a merge, a ref advancing) gets a watcher subagent that wakes you on the event, with a long time-based heartbeat as fallback. No event gets a fixed-interval heartbeat sized to when the result is worth re-checking.",
		true,
	],
	[
		"Drive a long or stubborn hunt with Cursor's `/loop` command.",
		"Drive a long or stubborn hunt by repeating the check (WorkBuddy has no `/loop` command).",
		true,
	],
	[
		"not Cursor's built-in babysit skill, whose description matches the same words.",
		"not a host babysit skill (WorkBuddy has no built-in babysit skill).",
		true,
	],
	[
		"This playbook replaces Cursor's built-in babysit skill for these requests, so do not route there even though its description matches the same words.",
		"This playbook is the babysit flow. WorkBuddy has no built-in babysit skill, so do not look for a host skill with the same description.",
		true,
	],
	[
		"Each owner is a Cursor cloud agent that builds,",
		"Each owner is an Agent subagent with `isolation: \"worktree\"` (WorkBuddy has no Cursor cloud agents) that builds,",
		true,
	],
	[
		"each a Cursor cloud agent,",
		"each an Agent subagent with `isolation: \"worktree\"` (WorkBuddy has no Cursor cloud agents),",
		true,
	],
	[
		"the cloud agent's status in the Cursor dashboard",
		"the worker's PR and branch (WorkBuddy has no Cursor cloud-agent dashboard)",
		true,
	],
	[
		"After a Cursor restart: local agents are dead, cloud work is not. Re-read the standing orders and `units.tsv`, recompute the frontier, reattach cloud work by PR and branch rather than agent id, respawn one sub-coordinator per track from its stored brief plus current state, drain, resume.",
		"After a WorkBuddy restart: in-process agents are dead. WorkBuddy has no Cursor cloud agents. Re-read the standing orders and `units.tsv`, recompute the frontier, reattach work by PR and branch rather than agent id, respawn one sub-coordinator per track from its stored brief plus current state, drain.",
		true,
	],
	["a Cursor restart", "a WorkBuddy restart"],
	["restart Cursor", "restart WorkBuddy"],
	[
		"Before spawning investigators, list the available MCPs from the Cursor environment. Use the available-tools map when present. Otherwise inspect the `mcps/` directory Cursor exposes for enabled MCP servers.",
		"Before spawning investigators, list the MCP servers this WorkBuddy session exposes. WorkBuddy does not document a Cursor-style `mcps/` directory. Skip a source whose server is absent and say so.",
		true,
	],
	[
		"Before commit → the `deslop` skill from the `cursor-team-kit` plugin (`/deslop`).",
		"Before commit → WorkBuddy has no cursor-team-kit and no `/deslop`. Review the diff for narrating comments, unsupported guards, and dead compatibility paths, then run the **no-comments** skill.",
		true,
	],
	[
		"runs `/deslop` on the diff before each commit",
		"reviews the diff for slop before each commit (WorkBuddy has no `/deslop`)",
	],
	[
		"`cursor-team-kit` plugin",
		"`cursor-team-kit` plugin, which WorkBuddy does not provide",
	],
	[
		"(such as `control-ui` or `control-cli` from `cursor-team-kit`)",
		"(WorkBuddy has no cursor-team-kit `control-ui` or `control-cli`; use a project `verify-*` skill when one exists)",
	],
	[
		"Open a todolist",
		"Open a checklist with `TaskCreate` (WorkBuddy has no todolist tool; if `TaskCreate` is absent, keep the list in the reply)",
	],
	[
		"tool call (Shell, Grep, MCP, etc.)",
		"tool call (Bash, Grep, MCP, etc.)",
	],
	["agent-transcripts/", "session transcripts (WorkBuddy does not document an agent-transcripts directory) /"],
	[
		"mention once that a Custom Mode keeps it on.",
		`mention once that the plugin hook keeps \`${PLUGIN_NAME}:poteto-mode\` on for the rest of the session until \`${PLUGIN_NAME}:poteto-mode off\`. WorkBuddy has no Custom Mode.`,
		true,
	],
	[
		"1. Install with `/add-plugin pstack` in chat, or from Customize in the sidebar.",
		"1. Install with `/plugin marketplace add pstack-pro/pstack-workbuddy`, then `/plugin install pstack@pstack-workbuddy`. Or copy `skills/` into `~/.workbuddy/skills/`. WorkBuddy has no `/add-plugin` command.",
		true,
	],
	[
		`pstack is built for Cursor, and it also installs in Claude Code with \`/plugin marketplace add cursor/plugins\`, then \`/plugin install pstack@cursor-plugins\`. There, each command takes a \`pstack:\` prefix, such as \`/pstack:poteto-mode\`. The [Claude Code adapter](../../docs/harness/claude-code.md) maps the Cursor names, and a step that needs a Cursor-only feature, such as Bugbot or Automations, is skipped with a one-line note.`,
		`This copy is the WorkBuddy port. Plugin commands take a \`${PLUGIN_NAME}:\` prefix, such as \`${PLUGIN_NAME}:poteto-mode\`. The [WorkBuddy adapter](../../docs/harness/workbuddy.md) maps what is left. A step that needs Bugbot or Cursor Automations is skipped with a one-line note. WorkBuddy has no Bugbot and no Cursor Automations.`,
		true,
	],
	[
		"Other tools can read the skills, because they use the Agent Skills format. But most workflow skills, including `/poteto-mode`, `/how`, `/why`, and `/teach`, spawn Cursor subagents with per-role models, and Custom Modes and `/loop` are Cursor features, so those parts may not work there.",
		`Manual copies of the skill folders still load, because they use the Agent Skills format. Workflow skills spawn WorkBuddy \`Agent\` subagents. WorkBuddy has no Custom Mode and no \`/loop\` command. The plugin hook is what keeps \`${PLUGIN_NAME}:poteto-mode\` on. See the adapter.`,
		true,
	],
	[
		"- Enter on `/poteto-mode` attaches the skill to one message. It fades as the chat moves on.\n- Option+Enter on Mac or Alt+Enter on Windows, or Use as Mode from the skill entry, makes it a Custom Mode. It stays in context every turn until the user exits the mode, and it stays out of casual turns.\n- Cursor's docs list Custom Modes in the Agents Window and the CLI. Elsewhere, start each new task with `/poteto-mode`.",
		`- Invoking the skill attaches it to that message.\n- With the plugin installed, a prompt that starts with \`${PLUGIN_NAME}:poteto-mode\` stays on for the session until \`${PLUGIN_NAME}:poteto-mode off\`. WorkBuddy has no Custom Mode.\n- A manual copy has no hook. Start each new task by invoking the skill again.`,
		true,
	],
	[
		"Link [Cursor's skills docs](https://cursor.com/docs/skills) when this comes up.",
		"Point at `docs/harness/workbuddy.md` when this comes up. WorkBuddy has no Custom Mode.",
		true,
	],
	[
		"- `/loop` and `/create-skill` are Cursor built-ins.",
		"- WorkBuddy has no `/loop` command and no built-in `create-skill`. Use the Autonomous run playbook and the authoring-a-skill playbook.",
		true,
	],
	[
		"Without `/poteto-mode`, a phrase such as \"babysit this pr\" can start Cursor's own skill for the same job instead.",
		"WorkBuddy has no built-in babysit skill. The Babysit playbook is the flow.",
		true,
	],
	[
		"pstack has no planning skill. Cursor's Plan Mode works alongside it.",
		"pstack has no planning skill. WorkBuddy's plan behavior is its built-in plan interaction mode. This plugin does not switch that mode. There is no separate Cursor Plan Mode product.",
		true,
	],
	[
		"| The mode stopped applying after a few turns | It was started with Enter. Start it as a Custom Mode, or start each task with `/poteto-mode`. |",
		`| The mode stopped applying after a few turns | The plugin hook is off, or this was a manual copy. Start the next task with \`${PLUGIN_NAME}:poteto-mode\`, or send that command at the start of a prompt. WorkBuddy has no Custom Mode. |`,
		true,
	],
	[
		"| Parallel agents overwrote each other | Give each agent its own worktree, or run them as cloud agents, which each get their own machine. |",
		"| Parallel agents overwrote each other | Give each agent its own worktree (`isolation: \"worktree\"` or `EnterWorktree`). WorkBuddy has no Cursor cloud agents. |",
		true,
	],
	[
		"| An overnight run moved but finished nothing | `/loop` needs a check that can pass or fail, not a duration. See [guide page 7](../../docs/guide/07-overnight.md). |",
		"| An overnight run moved but finished nothing | WorkBuddy has no `/loop` command. The finish condition still has to pass or fail, not be a duration. See [guide page 7](../../docs/guide/07-overnight.md). |",
		true,
	],
	[
		"or run them as cloud agents",
		"or give each one `isolation: \"worktree\"` (WorkBuddy has no Cursor cloud agents)",
	],
	[
		"https://github.com/cursor/plugins/blob/main/pstack/",
		"https://github.com/pstack-pro/pstack-workbuddy/blob/main/",
	],
	["[Claude Code adapter](../harness/claude-code.md)", "[WorkBuddy adapter](../harness/workbuddy.md)"],
	["[Claude Code adapter](../../docs/harness/claude-code.md)", "[WorkBuddy adapter](../../docs/harness/workbuddy.md)"],
];

const GUIDE_INSTALL_START = "## Install the plugin\n\n";
const GUIDE_INSTALL_END = "## Pick your models";
const GUIDE_INSTALL = `## Install the plugin

This guide is the WorkBuddy port. Plugin commands use the \`/${PLUGIN_NAME}:\` prefix. WorkBuddy has no \`/add-plugin\` command.

\`\`\`text
/plugin marketplace add pstack-pro/pstack-workbuddy
/plugin install pstack@pstack-workbuddy
\`\`\`

A manual copy of \`skills/\` into \`~/.workbuddy/skills/\` also loads. That copy has no \`${PLUGIN_NAME}:\` prefix and no sticky-mode hook. The [WorkBuddy adapter](../harness/workbuddy.md) covers the other differences. \`${PLUGIN_NAME}:setup-pstack\` writes \`~/.workbuddy/pstack-models.md\`. The session hook injects that file. WorkBuddy does not auto-load a rules directory for it.

`;

const CUSTOM_MODE_PARAGRAPH =
	"From here you can type normal follow-ups. To keep `/poteto-mode` on for the whole chat, pick it from the `/` menu with Option+Enter (Mac) or Alt+Enter (Windows) instead of Enter. That makes it a [Custom Mode](https://cursor.com/docs/skills#using-a-skill-as-a-custom-mode), which stays in context on every turn until you exit it. Custom Modes are available in the Agents Window and the CLI. Plain Enter attaches the skill to one message, and it fades as the chat moves on.";
const CUSTOM_MODE_REPLACEMENT =
	`From here you can type normal follow-ups. WorkBuddy has no Custom Mode. With the plugin installed, a later prompt stays in poteto-mode until you send \`${PLUGIN_NAME}:poteto-mode off\`. A manual skill copy applies the skill to one message. Invoke it again on the next task.`;

const SHORT_CUSTOM =
	"Short works because the playbook holds the structure, and a Custom Mode keeps `/poteto-mode` in context on every turn.";
const SHORT_CUSTOM_REPLACEMENT =
	`Short works because the playbook holds the structure, and the plugin hook keeps \`${PLUGIN_NAME}:poteto-mode\` in context on every turn. WorkBuddy has no Custom Mode.`;

const LOOP_BULLET =
	"- `/loop` is Cursor's built-in wake mechanism, not a pstack skill. The [Autonomous run playbook](../../skills/poteto-mode/playbooks/autonomous-run.md) uses it to re-check the finish condition on events or a heartbeat.";
const LOOP_BULLET_REPLACEMENT =
	"- WorkBuddy has no `/loop` command. The [Autonomous run playbook](../../skills/poteto-mode/playbooks/autonomous-run.md) re-checks the finish condition. `CronCreate` can schedule a later check. It is not `/loop`.";

const PROJECTS_PARAGRAPH =
	"A [Cursor Project](https://cursor.com/blog/projects) gives one coordinator agent a persistent thread. The coordinator doesn't write code. It directs subagents, which run in the cloud by default, so the work continues when your laptop is closed. That's the shape the Orchestrate playbook expects. Start your prompts to the coordinator with `/poteto-mode`, and the subagents it spawns follow the playbooks.";
const PROJECTS_REPLACEMENT =
	`WorkBuddy has no Cursor Project object and no cloud agents that keep running with the laptop closed. Orchestrate is a local coordinator chat plus subagents in git worktrees. Start the coordinator with \`${PLUGIN_NAME}:poteto-mode\`. The work stops when that session stops.`;

function transform(text) {
	let out = text;
	if (out.includes(GUIDE_INSTALL_START) && out.includes(GUIDE_INSTALL_END) && out.includes("/add-plugin pstack")) {
		const start = out.indexOf(GUIDE_INSTALL_START);
		const end = out.indexOf(GUIDE_INSTALL_END);
		if (start >= 0 && end > start) {
			out = out.slice(0, start) + GUIDE_INSTALL + out.slice(end);
			criticalHits.set("guide install block", (criticalHits.get("guide install block") || 0) + 1);
		} else criticalHits.set("guide install block", criticalHits.get("guide install block") || 0);
	}
	for (const [from, to, critical] of REPLACEMENTS) out = apply(out, from, to, critical);
	out = apply(out, CUSTOM_MODE_PARAGRAPH, CUSTOM_MODE_REPLACEMENT, false);
	out = apply(out, SHORT_CUSTOM, SHORT_CUSTOM_REPLACEMENT, false);
	out = apply(out, LOOP_BULLET, LOOP_BULLET_REPLACEMENT, false);
	out = apply(out, PROJECTS_PARAGRAPH, PROJECTS_REPLACEMENT, false);
	out = apply(
		out,
		"/loop until done. if you're truly stuck after a few hours, stop and write up why.",
		"keep going until done. WorkBuddy has no /loop command. if you're truly stuck after a few hours, stop and write up why.",
	);
	return out;
}

function skillNames() {
	return fs
		.readdirSync(path.join(src, "skills"))
		.filter((name) => fs.existsSync(path.join(src, "skills", name, "SKILL.md")))
		.sort((a, b) => b.length - a.length);
}

function prefixCommands(text, names) {
	const re = new RegExp(`(?<=^|[\\s\`(\\[\"'])/(${names.join("|")})(?![\\w/:-])`, "gm");
	return text.replace(re, `/${PLUGIN_NAME}:$1`);
}

function editFrontmatter(text, edit) {
	const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
	if (!match) return { text, stripped: [] };
	const lines = match[1].split("\n");
	const { lines: next, stripped } = edit(lines);
	return {
		text: `---\n${next.join("\n")}\n---\n${text.slice(match[0].length)}`,
		stripped,
	};
}

const SKILL_DROP = ["icon:", "color:", "paths:", "mode:", "reminder:"];

function skillFrontmatter(lines) {
	const stripped = [];
	const next = [];
	for (const line of lines) {
		if (SKILL_DROP.some((key) => line.startsWith(key))) {
			stripped.push(line);
			continue;
		}
		next.push(line);
	}
	return { lines: next, stripped };
}

function agentFrontmatter(lines) {
	const next = lines.map((line) => (line.startsWith("is_background:") ? "background: true" : line));
	return { lines: next, stripped: [] };
}

function injectNote(text) {
	if (text.includes("**WorkBuddy.**")) return text;
	if (!SOFT.some((re) => re.test(text))) return text;
	const heading = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n[\s\S]*?^# .+$/m);
	if (heading) {
		const at = heading.index + heading[0].length;
		return `${text.slice(0, at)}\n\n${NOTE}${text.slice(at)}`;
	}
	const h1 = text.match(/^# .+$/m);
	if (h1) {
		const at = h1.index + h1[0].length;
		return `${text.slice(0, at)}\n\n${NOTE}${text.slice(at)}`;
	}
	return `${NOTE}\n${text}`;
}

function walk(dir, fn) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, fn);
		else fn(full);
	}
}

function copyTree(from, to) {
	fs.rmSync(to, { recursive: true, force: true });
	fs.cpSync(from, to, {
		recursive: true,
		filter: (item) => !item.split(path.sep).includes("node_modules"),
	});
}

const names = skillNames();
copyTree(path.join(src, "skills"), path.join(root, "skills"));
copyTree(path.join(src, "agents"), path.join(root, "agents"));
copyTree(path.join(src, "docs", "guide"), path.join(root, "docs", "guide"));
// benny: the dormant Slack triage / repro automation pack. The upstream
// WorkBuddy port dropped this directory entirely (it is not a skill root, so a
// skills-only copy silently loses 12 files). cat-pstack restores it. Its
// WORKBUDDY.md capability matrix is preserved across regeneration below.
const bennyKeep = path.join(root, "automations", "benny", "WORKBUDDY.md");
const bennyKeepBody = fs.existsSync(bennyKeep) ? fs.readFileSync(bennyKeep, "utf8") : null;
copyTree(path.join(src, "automations", "benny"), path.join(root, "automations", "benny"));
if (bennyKeepBody !== null) fs.writeFileSync(bennyKeep, bennyKeepBody);

const SH_FROM = `# Transcripts dir: ~/.cursor/projects/<slugified-repo-path>/agent-transcripts.
slug=$(printf '%s' "$main_wt" | sed 's#^/##; s#/#-#g')
transcripts="$HOME/.cursor/projects/$slug/agent-transcripts"`;
const SH_TO = `# WorkBuddy does not use Cursor's slug/agent-transcripts layout.
# No session directory is confirmed for this script. LAST_CHAT stays "-".
transcripts=""`;

for (const dir of ["skills", "agents", "docs/guide", "automations/benny"]) {
	walk(path.join(root, dir), (file) => {
		if (file.endsWith(".md") || file.endsWith(".yaml") || file.endsWith(".yml")) {
			let text = prefixCommands(transform(fs.readFileSync(file, "utf8")), names);
			const rel = path.relative(root, file);
			if (rel.startsWith(`skills${path.sep}`) && rel.endsWith(`${path.sep}SKILL.md`)) {
				const edited = editFrontmatter(text, (lines) => {
					const folder = path.basename(path.dirname(file));
					const { lines: kept, stripped } = skillFrontmatter(lines);
					const renamed = kept.map((line) => (line.startsWith("name:") ? `name: ${folder}` : line));
					return { lines: renamed, stripped };
				});
				text = edited.text;
				if (edited.stripped.some((line) => line.startsWith("paths:"))) {
					text = text.replace(
						/^(# .+\n)/m,
						"$1\nWorkBuddy skill frontmatter has no `paths` field. Apply this skill when you read or edit `.ts` or `.tsx` files.\n",
					);
				}
			}
			if (rel.startsWith(`agents${path.sep}`) && rel.endsWith(".md")) {
				text = editFrontmatter(text, agentFrontmatter).text;
			}
			if (rel === path.join("skills", "poteto-mode", "SKILL.md")) text = `${text.trimEnd()}\n${STICKY}`;
			text = injectNote(text);
			fs.writeFileSync(file, text);
		} else if (file.endsWith(".sh")) {
			const text = fs.readFileSync(file, "utf8");
			const next = text.includes(SH_FROM) ? text.replace(SH_FROM, SH_TO) : text;
			if (file.endsWith("worktree-audit.sh")) {
				criticalHits.set("worktree-audit.sh transcripts", next.includes("transcripts=\"\"") ? 1 : 0);
			}
			fs.writeFileSync(file, next);
		}
	});
}

const overrides = path.join(root, "overrides");
if (fs.existsSync(overrides)) fs.cpSync(overrides, root, { recursive: true });

fs.copyFileSync(path.join(src, "LICENSE"), path.join(root, "LICENSE"));

function git(args) {
	return execFileSync("git", ["-C", src, ...args], { encoding: "utf8" }).trim();
}

const commit = git(["rev-parse", "HEAD"]);
const committedAt = git(["log", "-1", "--format=%cI"]);
const version = JSON.parse(fs.readFileSync(path.join(src, ".cursor-plugin", "plugin.json"), "utf8")).version;
fs.writeFileSync(
	path.join(root, "UPSTREAM.json"),
	`${JSON.stringify(
		{
			pstack: version,
			commit,
			committedAt,
			source: "https://github.com/cursor/plugins",
			path: "pstack/",
		},
		null,
		2,
	)}\n`,
);

function bump(file) {
	if (!fs.existsSync(file)) return;
	const json = JSON.parse(fs.readFileSync(file, "utf8"));
	if (typeof json.version === "string") json.version = version;
	if (Array.isArray(json.plugins)) {
		for (const plugin of json.plugins) {
			if (plugin && plugin.name === PLUGIN_NAME) plugin.version = version;
		}
	}
	fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}
bump(path.join(root, ".workbuddy-plugin", "plugin.json"));
bump(path.join(root, ".workbuddy-plugin", "marketplace.json"));

const HARD = [
	[/(?<![\w])AskQuestion\b/, "AskQuestion"],
	[/generalPurpose/, "generalPurpose"],
	[/(?<![\w.])\.cursor\//, ".cursor/"],
	[/pstack-models\.mdc/, "pstack-models.mdc"],
	[/\/add-plugin\b/, "/add-plugin"],
	[/is_background/, "is_background"],
	[/Option\+Enter/, "Option+Enter"],
	[/Alt\+Enter/, "Alt+Enter"],
	[/environment:\s*"cloud"/, 'environment: "cloud"'],
	[/environment:\s*"local"/, 'environment: "local"'],
];

function lineHits(text, re) {
	const hits = [];
	for (const line of text.split("\n")) {
		re.lastIndex = 0;
		if (!re.test(line)) continue;
		if (/\bno\b/i.test(line)) continue;
		hits.push(line.trim().slice(0, 140));
	}
	return hits;
}

const hardHits = [];
for (const dir of ["skills", "agents", "docs/guide", "automations/benny"]) {
	walk(path.join(root, dir), (file) => {
		if (!file.endsWith(".md") && !file.endsWith(".sh") && !file.endsWith(".yaml")) return;
		const text = fs.readFileSync(file, "utf8");
		for (const [re, label] of HARD) {
			for (const line of lineHits(text, re)) hardHits.push(`${path.relative(root, file)}: ${label}: ${line}`);
		}
	});
}

const missed = [...criticalHits.entries()].filter(([, count]) => count === 0).map(([key]) => key);
console.log(`ported pstack ${version} (${commit}) from ${src}`);
if (missed.length) {
	console.error("critical replacements did not match:");
	for (const item of missed) console.error(`  ${item}`);
}
if (hardHits.length) {
	console.error("hard Cursor leftovers:");
	for (const item of [...new Set(hardHits)]) console.error(`  ${item}`);
}
if (missed.length || hardHits.length) process.exit(1);
