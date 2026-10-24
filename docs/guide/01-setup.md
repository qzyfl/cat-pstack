# Set up pstack

> **WorkBuddy.** Read `docs/harness/workbuddy.md` (plugin root) before you follow the rest of this file.
> Cursor compound slugs (`claude-opus-*-xhigh`, `grok-*-xhigh-fast`, `cursor-grok-*`, `composer-*`) are not WorkBuddy model ids. Read `~/.workbuddy/pstack-models.md` and omit `model` when the role line is missing.
> WorkBuddy has no Custom Mode, no `/loop` command, no Bugbot, no cursor-team-kit, and no Cursor Automations or cloud agents. `-fast` is not a model-id suffix. Do not pass a field the Agent tool rejects.


In this page you install the plugin, pick which models pstack uses, and run your first task. Setup is one command plus a short conversation.

## Install the plugin

This guide is the WorkBuddy port. Plugin commands use the `/cat-pstack:` prefix. WorkBuddy has no `/add-plugin` command.

```text
/plugin marketplace add pstack-pro/pstack-workbuddy
/plugin install pstack@pstack-workbuddy
```

A manual copy of `skills/` into `~/.workbuddy/skills/` also loads. That copy has no `cat-pstack:` prefix and no sticky-mode hook. The [WorkBuddy adapter](../harness/workbuddy.md) covers the other differences. `cat-pstack:setup-pstack` writes `~/.workbuddy/pstack-models.md`. The session hook injects that file. WorkBuddy does not auto-load a rules directory for it.

## Pick your models

Run:

```text
/cat-pstack:setup-pstack
```

[`/cat-pstack:setup-pstack`](../../skills/setup-pstack/SKILL.md) detects the models you have access to, asks for a reasoning budget, shows you each role (code delegates, judgment, the review panels), and asks what you want. Answer the questions. It writes `~/.workbuddy/pstack-models.md`, a small rule every pstack skill reads.

The defaults run at `xhigh` reasoning, the same as the `large` budget. `unlimited` lifts each model to its highest tier, up to `max`. Opus goes to `max`. Grok tops out at `xhigh`, so it stays there. `medium` and `small` lower the reasoning and spend fewer tokens.

You only override what you care about. A role with no line in the rule keeps the skill's default. To restore a default, delete that role's line. A rerun of `/cat-pstack:setup-pstack` keeps any role whose model differs from the default. When a default changes, a rule written before the change still pins the old default, so delete those role lines, or delete the file, then run `/cat-pstack:setup-pstack` again.

You might be wondering what happens if you use Auto. Set a role to `inherit-parent` or `auto` and pstack omits the subagent `model` field, so the subagent inherits your parent chat model. Both values mean the same thing, and neither is a model slug. For a panel role the value is a list, and one subagent runs per entry, so the list length sets the panel size. Setup also configures `swarm workers`, the default model for every `/cat-pstack:swarm` worker unless a race names a model for each arm.

## Accept the verification offers, or don't

At the end of setup, `/cat-pstack:setup-pstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`/cat-pstack:create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `.workbuddy/skills/verify-<app>/`, a project-local skill that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `/cat-pstack:create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers it in depth.

If you're new to pstack, say yes. An agent that can check its own work keeps going until the check passes. An agent that can't hands every result back to you to check by hand. Of everything in this guide, the verification skill pays off the most.

Then setup offers once to generate a formal verification skill with [`/cat-pstack:create-formal-verification-skill`](../../skills/create-formal-verification-skill/SKILL.md), unless the project already has one. Tests check the cases someone thought to write. A formal verification skill checks one key property of your code, such as "a job never runs twice at once", in every case within a stated scope. Say yes when your code has concurrency, retries, a state machine, or a parser, where a bug is costly and tests rarely reach the case that breaks. Otherwise say no, and run it later if that changes. [Verify and ship](./06-verify-and-ship.md#prove-a-property-with-a-formal-verification-skill) covers it.

After setup, start a new chat. The model rule applies to new sessions.

## Keep the cost in check

pstack spends extra tokens on subagents and review panels. That's the price of the rigor. To spend fewer:

- Rerun `/cat-pstack:setup-pstack` and pick a smaller reasoning budget or cheaper models. A strong model in the main chat with cheaper, faster models in the code roles is a good split.
- Set a role to `auto` or `inherit-parent` so it runs on the chat's own model.
- Shorten a panel list. Each entry runs one subagent.
- Save `/cat-pstack:poteto-mode` for work that needs rigor. A small, obvious edit doesn't.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/cat-pstack:poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. Its first items are the matched playbook's steps copied in, the Feature playbook for this prompt. If `/cat-pstack:poteto-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

From here you can type normal follow-ups. WorkBuddy has no Custom Mode. With the plugin installed, a later prompt stays in poteto-mode until you send `cat-pstack:poteto-mode off`. A manual skill copy applies the skill to one message. Invoke it again on the next task.

Next: [Route work through `/cat-pstack:poteto-mode`](./02-poteto-mode.md).
