# Prompts worth copying

> **WorkBuddy.** Read `docs/harness/workbuddy.md` (plugin root) before you follow the rest of this file.
> Cursor compound slugs (`claude-opus-*-xhigh`, `grok-*-xhigh-fast`, `cursor-grok-*`, `composer-*`) are not WorkBuddy model ids. Read `~/.workbuddy/pstack-models.md` and omit `model` when the role line is missing.
> WorkBuddy has no Custom Mode, no `/loop` command, no Bugbot, no cursor-team-kit, and no Cursor Automations or cloud agents. `-fast` is not a model-id suffix. Do not pass a field the Agent tool rejects.


Swap in the real paths, skills, and done checks. Informal wording works.

## Understand

- `/cat-pstack:poteto-mode read <thread>. restate the underlying issue in your own words, in plain english.`
- `/cat-pstack:in-your-own-words <long or messy ask>`
- `/cat-pstack:sharpen <the prompt you're about to send>`
- `/cat-pstack:poteto-mode investigate why <symptom>. give me what we know, what data you used, and your best hypotheses. don't change any code yet.`
- `use /cat-pstack:how to understand <subsystem>. then use /cat-pstack:why to find out why it broke recently.`
- `/cat-pstack:recall my work on <topic> from last week, then read <issue>.`
- `/cat-pstack:teach me why you implemented it this way and not <other way>. what did you trade off?`
- `/cat-pstack:poteto-mode take over this branch. read the decision log, find what's done, and continue. don't redo finished work.`

## Build

- Bug: `/cat-pstack:poteto-mode <symptom>. repro first, then fix and verify.`
- Bug in an app: `/cat-pstack:poteto-mode repro this with /verify-<app>. if it repros on main, fix it and show me a video as proof.`
- Bug with a cheap test: `/cat-pstack:poteto-mode repro <bug> first. if there's a cheap test path, /cat-pstack:tdd it. then fix and rerun.`
- Feature: `/cat-pstack:poteto-mode add <behavior>. <current output> stays byte-identical. verify both.`
- Refactor: `/cat-pstack:poteto-mode move <code> into one module, zero behavior change. record the current output first and prove it's unchanged after.`
- Perf: `/cat-pstack:poteto-mode <operation> takes <time> on <fixture>. trace it, fix the measured cause, show me before and after.`

## Design and plan

- `/cat-pstack:poteto-mode prototype a few options for <feature>. take screenshots or videos for me to compare.`
- `/cat-pstack:poteto-mode we need <feature>. /cat-pstack:architect it first, and answer open questions with prototypes. let me review before proceeding.`
- `/cat-pstack:poteto-mode write a tutorial for how i would use <new package> first. then /cat-pstack:teach me why it beats the current one.`
- `ask /cat-pstack:arena for a second opinion on this thread and our approach.`
- `/cat-pstack:poteto-mode turn this design into a plan. small verifiable PRs, each with its own verification steps.`
- `/cat-pstack:poteto-mode plan the migration of <library> to <target>. small verifiable PRs. the result must match the original exactly, bugs included.`

## Review and ship

- `/cat-pstack:interrogate the whole branch, but skeptically. don't change anything yet. no nitpicks unless it's a real bug or regression.` Read the dismissals too.
- `/cat-pstack:create-formal-verification-skill prove <property> holds in <module>, even when <steps> interleave or retry.` After merges or refactors in that code: `/cat-pstack:maintain-formal-verification-skill`.
- `/cat-pstack:swarm check every package under <dir> against its check script. one worker per package. one report.`
- `/cat-pstack:poteto-mode open the pr. small ordered commits, evidence in the description.`
- `/cat-pstack:poteto-mode babysit this pr. get it green.` For status only: `/cat-pstack:poteto-mode check on pr <number>. anything outstanding?`
- `/cat-pstack:poteto-mode land the stack.`

## Away and back

- `/cat-pstack:poteto-mode im going to bed. <goal> in a fresh worktree off <base>. done means <checks>. keep a decision log. don't ask me before committing. keep going until done. WorkBuddy has no /loop command. if you're truly stuck after a few hours, stop and write up why.`
- `/cat-pstack:show-me-your-work catch me up on what you did last night.` Read its Attention section first.
- `/cat-pstack:ketchup` catches you up on this chat since your last message and lists every call that waits on you.
- `/cat-pstack:poteto-mode full autopilot on this queue. each item is independent.`
- `/cat-pstack:poteto-mode autopilot these changes but stack them, don't ship. i'll land the stack.`
- `/cat-pstack:reflect capture what we learned so the next run doesn't repeat it.` Approve only edits that change a future decision.
- `/cat-pstack:bro` restates the last reply in plain words.
