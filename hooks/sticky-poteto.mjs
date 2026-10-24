// Keep /poteto-mode in context on later turns. WorkBuddy has no Custom Mode.
// A prompt that starts with /cat-pstack:poteto-mode or /poteto-mode turns the session on.
// /cat-pstack:poteto-mode off, or "exit poteto-mode", turns it off.
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { commandAction, emit, isOn, readStdin, setOn } from "./state.mjs";

const root =
	process.env.WORKBUDDY_PLUGIN_ROOT ||
	process.env.CLAUDE_PLUGIN_ROOT ||
	path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKILL_CAP = 24000;

function skillBody() {
	const file = path.join(root, "skills", "poteto-mode", "SKILL.md");
	let text = "";
	try {
		text = fs.readFileSync(file, "utf8");
	} catch {
		return `Could not read ${file}. poteto-mode is still sticky. Say so.`;
	}
	const body = text.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
	if (body.length <= SKILL_CAP) return body;
	return `${body.slice(0, SKILL_CAP)}\n\n[truncated by the sticky hook. Read ${file} for the rest.]\n`;
}

try {
	const input = readStdin();
	const sessionId = input.session_id || "";
	const action = commandAction(input.prompt);
	if (!sessionId) {
		if (action) {
			emit(
				"UserPromptSubmit",
				"The UserPromptSubmit hook did not receive session_id, so poteto-mode cannot stay sticky. WorkBuddy has no Custom Mode. Re-invoke /cat-pstack:poteto-mode on the next task.",
			);
		} else {
			emit("UserPromptSubmit", "");
		}
		process.exit(0);
	}
	if (action === "off") setOn(sessionId, false);
	else if (action === "on") setOn(sessionId, true);

	if (!isOn(sessionId)) {
		const offNote =
			action === "off"
				? "poteto-mode is off for this session. Do not keep applying it. WorkBuddy has no Custom Mode."
				: "";
		emit("UserPromptSubmit", offNote);
		process.exit(0);
	}

	const context = [
		"pstack poteto-mode is sticky for this session.",
		"WorkBuddy has no Custom Mode. This hook re-injects the skill on every user prompt until the user sends `/cat-pstack:poteto-mode off` (or `exit poteto-mode`).",
		"Follow the skill below for this turn, including playbook selection. Spawn playbook delegates with subagent_type `cat-pstack:poteto-agent`.",
		"Cursor model ids are not WorkBuddy model ids. Use ~/.workbuddy/pstack-models.md when it exists, otherwise omit Agent `model`.",
		"<pstack_poteto_mode>",
		skillBody(),
		"</pstack_poteto_mode>",
	].join("\n\n");
	emit("UserPromptSubmit", context);
} catch (error) {
	process.stderr.write(`pstack sticky-poteto: ${error?.message || error}\n`);
	emit("UserPromptSubmit", "");
}
