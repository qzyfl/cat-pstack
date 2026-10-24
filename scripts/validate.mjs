#!/usr/bin/env node
// Checks the ported tree: skill frontmatter, unique names, and Cursor leftovers.
// Also runs the sticky-mode and session-start hooks against fixture stdin.
import { execFileSync, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];

const SKILL_KEYS = new Set([
	"name",
	"description",
	"allowed-tools",
	"disable-model-invocation",
	"user-invocable",
	"context",
	"agent",
	"model",
	"hooks",
	"disable",
]);
const AGENT_KEYS = new Set([
	"name",
	"description",
	"model",
	"effort",
	"maxTurns",
	"tools",
	"disallowedTools",
	"skills",
	"memory",
	"background",
	"isolation",
]);

function walk(dir, fn) {
	if (!fs.existsSync(dir)) return;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, fn);
		else fn(full);
	}
}

function parseFrontmatter(text) {
	const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
	if (!match) return null;
	const data = {};
	let key = null;
	let buf = [];
	let folding = false;
	const flush = () => {
		if (!key) return;
		data[key] = buf.join(" ").replace(/\s+/g, " ").trim().replace(/^['"]|['"]$/g, "");
		key = null;
		buf = [];
		folding = false;
	};
	for (const line of match[1].split("\n")) {
		if (folding && (line.startsWith(" ") || line.startsWith("\t") || line.trim() === "")) {
			buf.push(line.trim());
			continue;
		}
		flush();
		const found = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (!found) continue;
		key = found[1];
		const rest = found[2].trim();
		if (rest === ">-" || rest === ">" || rest === "|" || rest === "|-" || rest === "|+") {
			folding = true;
			buf = [];
		} else {
			folding = false;
			buf = [rest];
		}
	}
	flush();
	return data;
}

function checkMarkdown(kind, file, allowed, names) {
	const text = fs.readFileSync(file, "utf8");
	const rel = path.relative(root, file);
	const data = parseFrontmatter(text);
	if (!data) {
		problems.push(`${rel}: missing YAML frontmatter`);
		return;
	}
	if (!data.name) problems.push(`${rel}: frontmatter name is empty`);
	if (!data.description) problems.push(`${rel}: frontmatter description is empty`);
	for (const key of Object.keys(data)) {
		if (!allowed.has(key)) problems.push(`${rel}: frontmatter key ${key} is not a WorkBuddy ${kind} field`);
	}
	if (kind === "skill") {
		const folder = path.basename(path.dirname(file));
		if (data.name && data.name !== folder) problems.push(`${rel}: name ${data.name} does not match folder ${folder}`);
		if (data.name) {
			if (names.has(data.name)) problems.push(`${rel}: duplicate skill name ${data.name}`);
			names.add(data.name);
		}
	}
	if (kind === "agent" && data.name) {
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.name)) problems.push(`${rel}: agent name must be lowercase hyphenated`);
		if (names.has(data.name)) problems.push(`${rel}: duplicate agent name ${data.name}`);
		names.add(data.name);
	}
}

const skillNames = new Set();
const skillFiles = [];
walk(path.join(root, "skills"), (file) => {
	if (file.endsWith(`${path.sep}SKILL.md`)) skillFiles.push(file);
});
skillFiles.sort();
for (const file of skillFiles) checkMarkdown("skill", file, SKILL_KEYS, skillNames);

const agentNames = new Set();
walk(path.join(root, "agents"), (file) => {
	if (file.endsWith(".md")) checkMarkdown("agent", file, AGENT_KEYS, agentNames);
});

const HARD = [
	[/(?<![\w])AskQuestion\b/g, "AskQuestion"],
	[/generalPurpose/g, "generalPurpose"],
	[/(?<![\w.])\.cursor\//g, ".cursor/"],
	[/pstack-models\.mdc/g, "pstack-models.mdc"],
	[/\/add-plugin\b/g, "/add-plugin"],
	[/is_background/g, "is_background"],
	[/Option\+Enter/g, "Option+Enter"],
	[/Alt\+Enter/g, "Alt+Enter"],
	[/environment:\s*"cloud"/g, 'environment: "cloud"'],
	[/environment:\s*"local"/g, 'environment: "local"'],
];

// Soft leftovers are allowed only when the file carries the port note.
const SOFT = [
	[/claude-(?:opus|sonnet|haiku)-\d/gi, "Cursor Claude model id"],
	[/\bgrok-\d/g, "Cursor Grok model id"],
	[/\bgpt-5\.\d-sol/g, "Cursor GPT model id"],
	[/cursor-grok-/g, "cursor-grok model id"],
	[/\bcomposer-/g, "composer model id"],
	[/\bBugbot\b/g, "Bugbot"],
	[/Custom Mode/g, "Custom Mode"],
	[/\/loop\b/g, "/loop"],
	[/cursor-team-kit/g, "cursor-team-kit"],
	[/update_state/g, "update_state"],
	[/api2\.cursor\.sh/g, "api2.cursor.sh"],
	[/SendToUser/g, "SendToUser"],
	[/-fast\b/g, "-fast"],
	[/\bCursor\b/g, "Cursor"],
	[/cloud_base_branch/g, "cloud_base_branch"],
	[/agent-transcripts/g, "agent-transcripts"],
];

const addressed = [];
function unaddressedHard(text, re) {
	const lines = [];
	for (const line of text.split("\n")) {
		re.lastIndex = 0;
		if (!re.test(line)) continue;
		if (/\bno\b/i.test(line)) continue;
		lines.push(line.trim().slice(0, 140));
	}
	return lines;
}

function scan(file) {
	if (!file.endsWith(".md") && !file.endsWith(".sh") && !file.endsWith(".mjs")) return;
	const text = fs.readFileSync(file, "utf8");
	const rel = path.relative(root, file);
	for (const [re, label] of HARD) {
		for (const line of unaddressedHard(text, re)) problems.push(`${rel}: unaddressed ${label}: ${line}`);
	}
	if (!file.endsWith(".md")) return;
	const noted = text.includes("**WorkBuddy.**");
	const body = text
		.split("\n")
		.filter((line) => !line.startsWith(">"))
		.join("\n");
	for (const [re, label] of SOFT) {
		re.lastIndex = 0;
		if (!re.test(body)) continue;
		if (!noted) problems.push(`${rel}: ${label} without a WorkBuddy note`);
		else addressed.push(`${rel}: ${label}`);
	}
}

for (const dir of ["skills", "agents", "docs/guide"]) walk(path.join(root, dir), scan);

const upstream = JSON.parse(fs.readFileSync(path.join(root, "UPSTREAM.json"), "utf8"));
if (!/^[0-9a-f]{40}$/.test(upstream.commit)) problems.push("UPSTREAM.json commit is not a full SHA");
if (!upstream.pstack) problems.push("UPSTREAM.json missing pstack version");
const license = fs.readFileSync(path.join(root, "LICENSE"), "utf8");
if (!license.includes("Copyright (c) 2026 Lauren Tan")) problems.push("LICENSE is not upstream Lauren Tan MIT text");
if (!fs.existsSync(path.join(root, "NOTICE"))) problems.push("NOTICE missing");
const manifestDir = path.join(root, ".workbuddy-plugin");
const plugin = JSON.parse(fs.readFileSync(path.join(manifestDir, "plugin.json"), "utf8"));
const PLUGIN_NAME = "cat-pstack";
if (plugin.name !== PLUGIN_NAME) problems.push(`plugin.json name must stay ${PLUGIN_NAME} so commands are /${PLUGIN_NAME}:<skill>`);
if (plugin.version !== upstream.pstack) problems.push(`plugin.json version ${plugin.version} != upstream ${upstream.pstack}`);
if (!fs.existsSync(path.join(manifestDir, "marketplace.json"))) problems.push("missing .workbuddy-plugin/marketplace.json");
const marketplace = JSON.parse(fs.readFileSync(path.join(manifestDir, "marketplace.json"), "utf8"));
if (marketplace.name !== PLUGIN_NAME) problems.push(`marketplace.json name must be ${PLUGIN_NAME}`);
const listed = (marketplace.plugins || []).map((item) => item && item.name);
if (!listed.includes(PLUGIN_NAME)) problems.push(`marketplace.json must list ${PLUGIN_NAME}`);
const banned = ["code", "buddy"].join("");
if (fs.existsSync(path.join(root, `.${banned}-plugin`))) problems.push("remove the extra manifest directory");

function walkMd(dir, fn) {
	if (!fs.existsSync(dir)) return;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walkMd(full, fn);
		else if (entry.name.endsWith(".md")) fn(full);
	}
}

function hook(script, input, env) {
	return spawnSync(process.execPath, [path.join(root, "hooks", script)], {
		input: JSON.stringify(input),
		encoding: "utf8",
		env: { ...process.env, ...env },
	});
}

function hookJson(result, label) {
	if (result.status !== 0) {
		problems.push(`${label} exited ${result.status}: ${result.stderr}`);
		return null;
	}
	try {
		return JSON.parse(result.stdout);
	} catch {
		problems.push(`${label} did not print JSON: ${result.stdout.slice(0, 200)}`);
		return null;
	}
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pstack-hooks-"));
const env = {
	HOME: tmp,
	WORKBUDDY_PLUGIN_ROOT: root,
	WORKBUDDY_PLUGIN_DATA: path.join(tmp, "data"),
};
fs.mkdirSync(path.join(tmp, ".workbuddy"), { recursive: true });
fs.writeFileSync(path.join(tmp, ".workbuddy", "pstack-models.md"), "# budget: large (xhigh)\nfeature, refactoring: inherit\n");

const started = hookJson(hook("session-start.mjs", { hook_event_name: "SessionStart", session_id: "s1", cwd: tmp, transcript_path: "/tmp/t.jsonl" }, env), "session-start");
const startText = started?.hookSpecificOutput?.additionalContext || "";
if (!startText.includes("docs/harness/workbuddy.md") && !startText.includes("not WorkBuddy model ids")) {
	problems.push("session-start did not inject the WorkBuddy harness");
}
if (!startText.includes("feature, refactoring: inherit")) problems.push("session-start did not inject the model rule");
if (!startText.includes("/tmp/t.jsonl")) problems.push("session-start did not pass transcript_path");

const help = hookJson(hook("sticky-poteto.mjs", { hook_event_name: "UserPromptSubmit", session_id: "s1", prompt: "/cat-pstack:poteto-help what is /poteto-mode" }, env), "sticky help");
if ((help?.hookSpecificOutput?.additionalContext || "").includes("<pstack_poteto_mode>")) {
	problems.push("a help prompt turned poteto-mode on");
}
const on = hookJson(hook("sticky-poteto.mjs", { hook_event_name: "UserPromptSubmit", session_id: "s1", prompt: "/cat-pstack:poteto-mode fix the bug" }, env), "sticky on");
if (!(on?.hookSpecificOutput?.additionalContext || "").includes("sticky")) problems.push("entering /cat-pstack:poteto-mode did not stick");
const later = hookJson(hook("sticky-poteto.mjs", { hook_event_name: "UserPromptSubmit", session_id: "s1", prompt: "keep going" }, env), "sticky later");
if (!(later?.hookSpecificOutput?.additionalContext || "").includes("<pstack_poteto_mode>")) {
	problems.push("a later turn did not re-inject poteto-mode");
}
const other = hookJson(hook("sticky-poteto.mjs", { hook_event_name: "UserPromptSubmit", session_id: "s2", prompt: "hello" }, env), "sticky other session");
if ((other?.hookSpecificOutput?.additionalContext || "").includes("<pstack_poteto_mode>")) {
	problems.push("sticky mode leaked into another session");
}
hook("sticky-poteto.mjs", { hook_event_name: "UserPromptSubmit", session_id: "s1", prompt: "/cat-pstack:poteto-mode off" }, env);
const after = hookJson(hook("sticky-poteto.mjs", { hook_event_name: "UserPromptSubmit", session_id: "s1", prompt: "hello again" }, env), "sticky off");
if ((after?.hookSpecificOutput?.additionalContext || "").includes("<pstack_poteto_mode>")) {
	problems.push("poteto-mode stayed on after off");
}
const manual = hookJson(hook("sticky-poteto.mjs", { hook_event_name: "UserPromptSubmit", session_id: "s3", prompt: "/poteto-mode investigate" }, env), "manual command");
if (!(manual?.hookSpecificOutput?.additionalContext || "").includes("sticky")) problems.push("/poteto-mode did not stick");

const counts = new Map();
for (const line of addressed) {
	const label = line.split(": ").slice(1).join(": ");
	counts.set(label, (counts.get(label) || 0) + 1);
}

function scanBanned(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") continue;
		const full = path.join(dir, entry.name);
		const rel = path.relative(root, full);
		if (rel === "PORTING.md") continue;
		if (entry.name.toLowerCase().includes(banned)) problems.push(`${rel}: name contains ${banned}`);
		if (entry.isDirectory()) {
			scanBanned(full);
			continue;
		}
		if (!entry.isFile() || /\.(png|jpe?g|gif|webp|pdf)$/i.test(entry.name)) continue;
		const body = fs.readFileSync(full, "utf8");
		if (!body.toLowerCase().includes(banned)) continue;
		const line = body.split("\n").find((item) => item.toLowerCase().includes(banned)) || "";
		problems.push(`${rel}: contains ${banned}: ${line.trim().slice(0, 140)}`);
	}
}
const BUNDLE_ALLOWED_EXT = new Set([".md", ".txt", ".json", ".ts", ".mjs", ".js", ".sh", ".py", ".yaml", ".yml"]);

function scanBundleZip() {
	const zipPath = path.join(root, "dist", `${PLUGIN_NAME}-${upstream.pstack}.zip`);
	if (!fs.existsSync(zipPath)) {
		problems.push("bundle zip was not written");
		return;
	}
	const listed = execFileSync("zipinfo", ["-1", zipPath], { encoding: "utf8" })
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line && !line.endsWith("/"));
	const unpacked = fs.mkdtempSync(path.join(os.tmpdir(), "pstack-bundle-scan-"));
	try {
		execFileSync("unzip", ["-q", zipPath, "-d", unpacked]);
		for (const name of listed) {
			const ext = path.posix.extname(path.posix.basename(name)).toLowerCase();
			if (!BUNDLE_ALLOWED_EXT.has(ext)) problems.push(`bundle extension not on the SkillHub allowlist: ${name}`);
			const body = fs.readFileSync(path.join(unpacked, name));
			if (body.includes(0)) problems.push(`bundle binary content: ${name}`);
		}
	} finally {
		fs.rmSync(unpacked, { recursive: true, force: true });
	}
}

const bundled = spawnSync(process.execPath, [path.join(root, "scripts", "bundle.mjs"), "--check"], {
	cwd: root,
	stdio: "inherit",
});
if (bundled.status !== 0) problems.push("SkillHub bundle check failed");
else scanBundleZip();

// ---------------------------------------------------------------------------
// Regression guards for defects found in the upstream WorkBuddy port
// (pstack-pro/pstack-workbuddy @ aabc358). Each one is a bug that shipped.
// ---------------------------------------------------------------------------

// 1. A sentence must never carry two conflicting subagent_type values. The
//    upstream port's blind `readonly: true` -> `subagent_type: "Explore"` swap
//    produced exactly this in how/ and interrogate/.
{
	const offenders = [];
	walkMd(path.join(root, "skills"), (file) => {
		const text = fs.readFileSync(file, "utf8");
		for (const line of text.split("\n")) {
			const hits = line.match(/subagent_type\s*:\s*[`"']?[\w:-]+[`"']?/gu) || [];
			if (hits.length > 1) {
				const unique = new Set(hits.map((hit) => hit.replace(/[`"']/gu, "")));
				if (unique.size > 1) offenders.push(`${path.relative(root, file)}: ${line.trim().slice(0, 90)}`);
			}
		}
	});
	for (const item of offenders) problems.push(`conflicting subagent_type in one sentence: ${item}`);
}

// 2. Command prefixes must all use the plugin's own namespace. A stray
//    `/pstack:` would silently point at a skill that does not exist here.
{
	const stale = [];
	for (const dir of ["skills", "docs/guide", "automations/benny"]) {
		const abs = path.join(root, dir);
		if (!fs.existsSync(abs)) continue;
		walkMd(abs, (file) => {
			const text = fs.readFileSync(file, "utf8");
			const matches = text.match(/(?<!cat-)\/pstack:/gu) || [];
			if (matches.length) stale.push(`${path.relative(root, file)} (${matches.length})`);
		});
	}
	for (const item of stale) problems.push(`stale /pstack: prefix, expected /${PLUGIN_NAME}:: ${item}`);
}

// 3. The benny automation pack must survive. The upstream port dropped all 12
//    of its files because only skills/agents/docs were copied.
{
	const benny = path.join(root, "automations", "benny");
	const required = [
		"FOR_AGENTS.md",
		"README.md",
		"WORKBUDDY.md",
		"skills/setup-benny/SKILL.md",
		"skills/triage-issue-reports/SKILL.md",
		"skills/reproduce-and-fix-issues/SKILL.md",
		"templates/configuration.example.yaml",
	];
	if (!fs.existsSync(benny)) problems.push("automations/benny is missing (dropped pack)");
	else {
		for (const rel of required) {
			if (!fs.existsSync(path.join(benny, rel))) problems.push(`automations/benny missing ${rel}`);
		}
	}
}

scanBanned(root);

if (problems.length) {
	for (const problem of problems) console.error(`FAIL ${problem}`);
	process.exit(1);
}

console.log(`ok ${skillNames.size} skills, ${agentNames.size} agents, pstack ${upstream.pstack} @ ${upstream.commit.slice(0, 12)}`);
console.log("intentionally kept Cursor references (each file carries the WorkBuddy note):");
for (const [label, count] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
	console.log(`  ${count}\t${label}`);
}
