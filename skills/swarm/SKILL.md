---
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /cat-pstack:swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
---

# Swarm

> **WorkBuddy.** Read `docs/harness/workbuddy.md` (plugin root) before you follow the rest of this file.
> Cursor compound slugs (`claude-opus-*-xhigh`, `grok-*-xhigh-fast`, `cursor-grok-*`, `composer-*`) are not WorkBuddy model ids. Read `~/.workbuddy/pstack-models.md` and omit `model` when the role line is missing.
> WorkBuddy has no Custom Mode, no `/loop` command, no Bugbot, no cursor-team-kit, and no Cursor Automations or cloud agents. `-fast` is not a model-id suffix. Do not pass a field the Agent tool rejects.


## Start

Open a checklist with `TaskCreate` (WorkBuddy has no todolist tool; if `TaskCreate` is absent, keep the list in the reply) with one entry per phase before launching anything.

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Pick the worker model from the `swarm workers` line in `~/.workbuddy/pstack-models.md`. If the rule or that line is missing, use `grok-4.7-xhigh-fast`. For `auto` or `inherit-parent`, omit `model` so the workers run on the parent model. If the Agent tool rejects a slug, use the default and say so. If it rejects the default, use the closest valid slug of the same family from its error message. For a model race, name each arm's model up front. Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill.
4. Give each worker its own writable output when it writes. When workers verify or measure commits, each brief names the exact SHAs. A measurement brief also names the method (sample count, what one sample is, order). The worker records both in its result.

## Phase B: Fan out

Spawn all N workers in one message with `subagent_type: general-purpose`, `isolation: "worktree"`, `run_in_background: true`, and the step 3 model, left unset for `auto` or `inherit-parent`. Omit `isolation` when the worker needs access to something on the user's computer. WorkBuddy has no `environment` field. `isolation: "worktree"` is a local git worktree, not a Cursor cloud machine.

When a worker must start from a non-default pushed branch, tell it to check out that branch. WorkBuddy has no `cloud_base_branch` parameter.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence. A worker that can prove a defect reports `ISSUES` and lists every issue it can prove, not only the first.

If a worker drops out, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results. Drop a result that does not record the SHAs and method its brief names, and respawn that worker once. After a second miss, record a gap. A gap does not count as a pass. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

## Phase D: Report

Return one consolidated in-chat report with a result table, issue one-liners, gaps or dropouts, and the race rule when used.
