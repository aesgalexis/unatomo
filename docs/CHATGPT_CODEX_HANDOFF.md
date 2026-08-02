# ChatGPT to Codex Handoff

This document helps ChatGPT turn a conversation with the repository owner into
a precise implementation prompt for Codex. It is a prompt-writing guide, not a
replacement for `AGENTS.md` or the feature-specific documentation.

## Role

When asked to prepare work for Codex:

- Capture the owner's actual intent, decisions, priorities, and constraints.
- Produce a self-contained implementation brief that Codex can act on.
- Use repository access to verify relevant names, paths, and existing behavior.
- Do not prescribe an internal implementation when the repository should be
  inspected first. State the required behavior and acceptance criteria.
- Do not make repository changes unless the owner separately asks ChatGPT to do
  so. The normal output of this workflow is a prompt for Codex.

## Sources Of Truth

Before drafting the handoff, read:

1. `AGENTS.md` for durable repository operating rules.
2. `docs/REPO_MAP.md` when the task is broad or the affected area is unclear.
3. Only the feature documentation routed by those files and relevant to the
   requested work.

Do not copy all repository instructions into the handoff. Reference them and
repeat only constraints that are especially important for the task. If the
conversation conflicts with current repository documentation, identify the
conflict instead of silently choosing one version.

ChatGPT's connected repository may not contain local, uncommitted changes from
the owner's Codex workspace. Never claim that the connected branch is the exact
current working tree. Tell Codex to inspect the local status and current code
before editing.

## Drafting Workflow

1. Distill the conversation into one primary outcome.
2. Separate confirmed decisions from suggestions and unresolved questions.
3. Inspect the smallest useful repository scope to ground the brief.
4. Define observable acceptance criteria without inventing product behavior.
5. State explicit exclusions when they protect the task from scope creep.
6. Include proportional validation and any owner-only follow-up commands.
7. Ask the owner a question only when a missing choice would materially change
   the result and cannot be discovered safely from the repository.

Prefer concise prompts. Codex already has repository access and loads
`AGENTS.md`; it does not need large pasted files, speculative code, or a diary of
the conversation.

## Required Handoff Contents

Every Codex prompt should contain, when applicable:

- **Objective:** the outcome to achieve and why it matters.
- **User context:** relevant product intent or decisions from the conversation.
- **Scope:** behavior and areas that are included.
- **Out of scope:** adjacent changes that should not be made.
- **Acceptance criteria:** concrete, observable conditions for completion.
- **Repository guidance:** the specific documentation Codex should consult.
- **Safety constraints:** production data, permissions, ownership, secrets,
  localization, or compatibility concerns relevant to this task.
- **Validation:** targeted checks, tests, build, or visual review expected.
- **Handoff:** what Codex should report, including whether publish or deploy is
  required and the exact owner-run commands when applicable.

Tell Codex to preserve unrelated user changes and inspect before editing. Do not
request a commit, push, publish, deployment, production mutation, or destructive
operation unless the owner explicitly requested that action in the current
conversation.

## Model And Reasoning Recommendation

The normal execution target is GPT-5.6 Luna with `high` reasoning. Recommend
Luna with `xhigh` reasoning when the task is ambiguous, cross-cutting, involves
several interacting state flows, or needs substantial diagnosis before editing.

For high-risk security, authorization, ownership, production-data, or major
architectural work, flag that GPT-5.6 Sol may be the safer execution choice.
Model selection is a recommendation outside the prompt; do not assume that text
inside the handoff can change Codex's active model or reasoning level.

## Prompt Template

Use this structure and remove sections that add no value:

```md
Implement the following change in the Unatomo repository.

## Objective

[Single primary outcome and its purpose.]

## Context and confirmed decisions

- [Only conversation details that affect implementation.]

## Scope

- [Required behavior or affected surface.]

## Out of scope

- [Explicit exclusions, if needed.]

## Acceptance criteria

- [Observable completion condition.]

## Repository guidance and constraints

- Read `AGENTS.md` and [specific routed documentation].
- Inspect the current working tree and implementation before editing.
- Preserve unrelated user changes.
- [Task-specific safety, data, localization, or compatibility constraint.]

## Validation

- [Targeted checks appropriate to the risk and change size.]

## Final handoff

Report the outcome, relevant files changed, validation performed, and any
remaining risk. State whether publish/deploy is needed; do not run owner-only
publish/deploy steps unless explicitly requested.
```

Above the prompt, ChatGPT may add a short recommendation such as:

`Recommended execution: GPT-5.6 Luna, reasoning high.`

Keep that recommendation outside the copyable prompt when practical.

## Quality Check

Before returning the prompt, verify that it:

- Represents the latest owner decision rather than an earlier idea.
- Contains one coherent objective or clearly separated independent tasks.
- Distinguishes facts, assumptions, and open questions.
- Does not invent files, APIs, data models, tests, or current workspace state.
- Gives Codex room to choose an implementation based on current code.
- Defines what success looks like and how it should be checked.
- Does not authorize operations the owner did not request.

