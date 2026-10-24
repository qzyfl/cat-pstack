// Session sticky flag for /poteto-mode. Prefer WORKBUDDY_PLUGIN_DATA.
// Otherwise keep state under ~/.workbuddy, which is the desktop config root.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export function dataDir() {
	if (process.env.WORKBUDDY_PLUGIN_DATA) return process.env.WORKBUDDY_PLUGIN_DATA;
	const home = process.env.HOME || os.homedir();
	return path.join(home, ".workbuddy", "plugins", "data", "cat-pstack");
}

function statePath() {
	return path.join(dataDir(), "sticky-sessions.json");
}

export function readState() {
	try {
		const parsed = JSON.parse(fs.readFileSync(statePath(), "utf8"));
		return parsed && typeof parsed.sessions === "object" && parsed.sessions ? parsed.sessions : {};
	} catch {
		return {};
	}
}

export function writeState(sessions) {
	const now = Date.now();
	const kept = {};
	for (const [id, row] of Object.entries(sessions)) {
		if (!row || typeof row.updatedAt !== "number") continue;
		if (now - row.updatedAt > MAX_AGE_MS) continue;
		kept[id] = row;
	}
	fs.mkdirSync(dataDir(), { recursive: true });
	const file = statePath();
	const tmp = `${file}.${process.pid}.tmp`;
	fs.writeFileSync(tmp, `${JSON.stringify({ sessions: kept }, null, 2)}\n`);
	fs.renameSync(tmp, file);
	return kept;
}

export function isOn(sessionId) {
	if (!sessionId) return false;
	return readState()[sessionId]?.on === true;
}

export function setOn(sessionId, on) {
	if (!sessionId) return readState();
	const sessions = readState();
	sessions[sessionId] = { on: Boolean(on), updatedAt: Date.now() };
	return writeState(sessions);
}

// Only a prompt that starts with the slash command toggles the mode.
// `/cat-pstack:poteto-help what is /poteto-mode` must not turn it on.
export function commandAction(prompt) {
	const head = String(prompt ?? "").trim();
	const cmd = head.match(/^\/(?:cat-pstack:)?([a-z0-9-]+)\b([\s\S]*)$/i);
	if (cmd && cmd[1].toLowerCase() === "poteto-mode") {
		return /^off\b/i.test(cmd[2].trim()) ? "off" : "on";
	}
	if (/^(?:exit|leave|stop)\s+poteto-mode\b/i.test(head)) return "off";
	return null;
}

export function readStdin() {
	try {
		const raw = fs.readFileSync(0, "utf8");
		if (!raw.trim()) return {};
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

export function emit(eventName, additionalContext) {
	process.stdout.write(
		`${JSON.stringify({
			continue: true,
			hookSpecificOutput: {
				hookEventName: eventName,
				additionalContext,
			},
		})}\n`,
	);
}
