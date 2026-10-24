# benny on WorkBuddy

> **WorkBuddy.** Read `docs/harness/workbuddy.md` (plugin root) before you follow the rest of this file.
> Cursor compound slugs (`claude-opus-*-xhigh`, `grok-*-xhigh-fast`, `cursor-grok-*`, `composer-*`) are not WorkBuddy model ids. Read `~/.workbuddy/pstack-models.md` and omit `model` when the role line is missing.
> WorkBuddy has no Custom Mode, no `/loop` command, no Bugbot, no cursor-team-kit, and no Cursor Automations or cloud agents. `-fast` is not a model-id suffix. Do not pass a field the Agent tool rejects.


benny ships inside cat-pstack as a **dormant automation pack**. This file states
what actually works on WorkBuddy, what degrades, and what is unavailable, so
nobody mistakes a copied workflow for a running automation.

The pack was dropped entirely by the upstream WorkBuddy port (`pstack-pro/pstack-workbuddy`).
cat-pstack restores it and adapts it. Paths are rewritten from the upstream
Cursor location to the WorkBuddy equivalent.

## What benny is

Two cooperating automations around a Slack issue channel:

| Automation | Trigger | Outcome |
| --- | --- | --- |
| `triage-issue-reports` | A new top-level report in the configured source channel | Exactly one reply in the original thread with a verdict and `[benny:bug]` / `[benny:performance]` / `[benny:other]`, plus a tracker URL when one exists |
| `reproduce-and-fix-issues` | The same report, after a trusted triage marker appears | Evidence and a verified result in the thread, plus an optional **draft** pull request |

Both keep the source channel and root-thread coordinates immutable for the whole
run. Neither ever posts a root message in the source channel.

## Capability matrix on WorkBuddy

| Need | WorkBuddy | Status |
| --- | --- | --- |
| Scheduled / recurring runs | Built-in automations (one-time and recurring) | **Available.** This is the replacement for Cursor Automations. |
| Event trigger on a new Slack message | No native Slack event webhook | **Degraded.** Use a polling schedule instead of an event push; latency becomes the poll interval, not seconds. |
| Read a Slack thread, reply in-thread | Only through a connected Slack/IM connector or CLI | **Depends on your connectors.** If none is bound, benny cannot read or reply. Check before enabling. |
| Tracker (Linear / Jira / GitHub Issues) | Through the tracker's MCP connector or `gh` | **Depends.** GitHub Issues works via `gh` today; others need a connector. |
| Reproduce through the real UI | `ego-browser` / `playwright-cli` skills | **Available**, and this is stronger than the Cursor original because the browser is real and inspectable. |
| Draft pull request | `gh pr create --draft` | **Available.** |
| Control adapter (drive the app) | Per-project; you write it | **Manual.** The reference adapter is a template, not a working driver for your app. |
| Secret handling | Environment variables or connector credentials | **Manual.** Never put secrets in the pack, prompts, or committed config. |

## What is deliberately not reproduced

- **Event-push latency.** Cursor's automation wakes on a webhook. WorkBuddy has no
  equivalent Slack event source in this pack. Polling is the honest substitute; do
  not describe a poll as real-time.
- **`api2.cursor.sh/automations` webhooks, routine wakes, `SendToUser` secret
  requests, `update_state` routine calls.** None of these exist here. Steps that
  need them are skipped with a one-line note, per `docs/harness/workbuddy.md`.
- **A managed cloud runner.** Runs happen on this machine, in your session. If the
  session stops, the run stops. There is no laptop-closed execution.

## Setup, adapted

The upstream flow tells you to point Cursor at `FOR_AGENTS.md` and let it copy the
pack into `.workbuddy/automations/benny/`. On WorkBuddy:

1. Point the agent at this file, or at `FOR_AGENTS.md`, and name the target repository.
2. Let it copy the pack to `<target-repository>/.workbuddy/automations/benny/`,
   preserving destination-only files and never overwriting user-owned config.
3. Keep user-owned configuration outside the copied pack, for example in
   `<target-repository>/.workbuddy/benny/`. Adapt `templates/configuration.example.yaml`.
4. **Do not** create the two automations until the user explicitly asks. When they
   do, create them through the built-in automation tool with a schedule, not a
   webhook, and record the poll interval in the config.
5. Send one harmless test report and verify that every reply stays in the original
   thread before trusting either automation.

## Honest verification status

Nothing in this pack has been run end-to-end on WorkBuddy. The files are a faithful
adaptation of the upstream workflows, not proof that the automations work against
your Slack workspace, your tracker, or your app.

Before enabling either automation, prove these four things on a harmless test report:

1. The connector can read the source thread and reply **in that thread**.
2. The tracker lookup returns a real duplicate check, not a stub.
3. The control adapter can drive the app and capture a screenshot.
4. The poll interval is short enough for your response-time expectation, and you
   accept that it is a poll.

If any of the four fails, keep the automation off. A triage automation that silently
cannot read the thread is worse than no automation.
