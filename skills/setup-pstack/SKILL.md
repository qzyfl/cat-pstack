---
name: setup-pstack
description: Configure which WorkBuddy models pstack uses per role and at what reasoning effort. Reads ~/.workbuddy/models.json when it exists and writes ~/.workbuddy/pstack-models.md, which the session hook injects. Use for /cat-pstack:setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack (WorkBuddy)

> **WorkBuddy.** Read `docs/harness/workbuddy.md` before you follow this skill. Cursor model ids are not WorkBuddy model ids.

Write `~/.workbuddy/pstack-models.md`. The plugin's `SessionStart` hook reads that file and injects it. WorkBuddy's desktop config root does not ship a rules directory, and this skill does not create one. Do not write the role table into a project memory file.

Upstream Cursor defaults, which are not WorkBuddy model ids, were `grok-4.7-xhigh-fast` for code roles and `claude-opus-5-5-xhigh` for judgment roles. Use those only as intent labels (a faster code model, a stronger judgment model) while you pick from models confirmed in this session.

Documented effort values used by this file are `minimal`, `low`, `medium`, `high`, `xhigh`, and `max`. Effort is not encoded in the model id. There is no `-fast` suffix.

## Steps

### 1. Detect available models

Confirm model ids before you write them. In order:

1. Read `~/.workbuddy/models.json` when the file exists. Parse the JSON.
   - If the value is an object with a `models` array, take each element's string `id`.
   - If the value is an array, take each element's string `id`.
   - `name` is a display label. Do not pass `name` as Agent `model`.
   - Do not read, copy, or repeat `apiKey`, tokens, URLs, or headers. If you already saw one, do not put it in the file or the reply.
   - If the file is missing, unreadable, or has no `id` strings, say so and continue.
2. The model ids the `Agent` tool schema accepts in this session. When both that list and the `id` values from `models.json` exist, keep the intersection. When the schema is not visible, the `id` values from `models.json` are the confirmed set.
3. Otherwise ask the user to paste the ids shown in the model picker.

Never write a real id you have not confirmed. `inherit` and `auto` are always valid. Both mean omit Agent `model` so the subagent runs on the parent chat model. `default` means the same thing.

If you cannot confirm any id, stop after the user pastes ids or chooses all-`inherit`. Do not guess slugs.

### 2. Load current state

If `~/.workbuddy/pstack-models.md` exists, read its `# budget` line, its `# effort` line, and its role values. Otherwise start from the shape in step 5, with every role set to `inherit` and budget `large`. Drop a role that is not in step 5.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer `AskUserQuestion`. Offer these labels. Name the current budget when the file has one. With no file, say `large` matches the upstream default effort (`xhigh`).

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Set `# effort` to `max`, `xhigh`, `high`, or `medium`. Do not rewrite model ids to bake the effort in. `inherit` and `auto` stay as they are. On a re-run, keep a role the user already set to a confirmed id.

**(c) Show the roles and confirm.** Group the confirmed ids into a code bucket and a judgment bucket when you can tell them apart. Put a code id on `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `how explorer`, `why investigators`, `reflect tooling`, and `swarm workers`. Put a judgment id on `judgment and prose`, `hardest tasks`, `how explainer`, `why synthesizer`, and `reflect judgment, divergent, synthesizer`. Panel roles (`arena runners`, `arena cross-judge pool`, `architect runners`, `interrogate reviewers`) are lists. Prefer two confirmed ids from different families so the cross-check is real. If only one family is confirmed, use one entry and say the cross-model check is weaker than upstream's two-family panel.

Prefer `AskUserQuestion`. Offer the confirmed ids plus `inherit` and `auto`. One subagent runs per panel entry. `arena cross-judge pool` is a list, and Arena picks one value whose family differs from the parent when it can.

### 4. Validate

Every real id in the file must be in the confirmed set. `inherit` and `auto` always pass. If a chosen id is not confirmed, stop and ask again.

### 5. Write the file

Create `~/.workbuddy/` if needed. Overwrite `~/.workbuddy/pstack-models.md` so re-runs stay idempotent. Shape:

```
---
description: pstack per-role model choices
---
# pstack model configuration. One line per role. Delete a line to omit model for that role.
# `inherit` or `auto`: omit Agent `model` so the role runs on the parent chat model.
# Panel lines are lists. One subagent runs per entry.
# The session hook injects this file. It is not a rules-directory entry.
# effort: xhigh
# budget: large (xhigh)
# Cursor defaults were not WorkBuddy model ids (code: grok-4.7-xhigh-fast, judgment: claude-opus-5-5-xhigh).
feature, refactoring: inherit
bug-fix: inherit
perf-issue: inherit
hillclimb: inherit
judgment and prose: inherit
hardest tasks: inherit
how explorer: inherit
how explainer: inherit
why investigators: inherit
why synthesizer: inherit
reflect tooling: inherit
reflect judgment, divergent, synthesizer: inherit
arena runners: inherit
arena cross-judge pool: inherit
swarm workers: inherit
architect runners: inherit
interrogate reviewers: inherit
```

Replace each `inherit` with the confirmed choice. Keep the `# effort` and `# budget` lines in sync with step 3.

### 6. Confirm

Tell the user the absolute path you wrote. The hook injects the file on the next session start. A session that is already open needs a restart or a new chat before the hook runs again. Re-running this skill updates the file.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /cat-pstack:create-verification-skill." On yes, run that skill. It writes `.workbuddy/skills/verify-<app>/`. On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /cat-pstack:create-formal-verification-skill." On yes, run that skill. On no, move on without pushing.
