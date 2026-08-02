# ChatGPT to Codex Handoff

Use this guide when turning a conversation with the owner into a prompt for
Codex Luna. The goal is simple: understand what the owner means and express it
clearly enough for Luna to implement it in the right part of the repository.

This is a prompt-writing guide. It is not a second `AGENTS.md`, a test plan, or
a reporting template.

## What ChatGPT Should Do

- Interpret the owner's intent, including informal language and decisions made
  during the conversation.
- Return one concise, copyable prompt for Codex.
- Preserve the owner's priorities and do not invent requirements.
- Point to the most likely working area: directories, files, components,
  routes, styles, functions, or documentation.
- Keep the task focused. Do not turn a small request into a repository-wide
  investigation.

ChatGPT should not ask Luna for a progress report, a long explanation, a large
test matrix, or a final audit. Luna can follow the repository's existing
`AGENTS.md` rules and perform the normal checks those rules require.

## How To Locate The Work

Every prompt should include a short **Working area** section. Use repository
access to ground it in real paths when possible:

- **Primary area:** where the change most likely belongs.
- **Related area:** another location that may need a small coordinated change.
- **Outside scope:** areas that should not be touched.

If the exact file is not known, name the nearest reliable area and tell Luna to
locate the existing implementation there before editing. Do not guess a file or
API merely to make the prompt look specific. Consult `docs/REPO_MAP.md` only as
much as needed to find the area; mention a deeper documentation file only when
the task actually concerns that domain.

## Prompt Contents

Keep the prompt to these essentials:

- **What I want:** the requested outcome in the owner's terms.
- **Why:** only the product context needed to make the right decision.
- **Working area:** primary, related, and excluded areas.
- **Expected result:** what should be different when the work is complete.
- **Constraints:** confirmed decisions, localization, compatibility, safety, or
  other boundaries that matter.

Include acceptance details only when they clarify the expected result. Do not
add separate sections for validation, reports, deployment, or retrospective
unless the owner explicitly asks for them.

Always remind Luna to inspect the current implementation before editing and to
preserve unrelated user changes. Do not authorize publishing, deployment,
production mutations, commits, pushes, or destructive operations unless the
owner explicitly requested them.

## Copyable Template

```md
Implement this change in the Unatomo repository.

## What I want

[Translate the owner's request into one clear outcome.]

## Why

[Relevant product context, if it affects the implementation.]

## Working area

- Primary: [directory, file, component, route, or function].
- Related: [nearby area, or "none known"].
- Outside scope: [areas that must remain untouched].

## Expected result

- [Concrete behavior or visible result.]

## Constraints

- Read `AGENTS.md` and only the relevant repository guidance.
- Inspect the existing implementation in the working area before editing.
- Preserve unrelated user changes.
- [Any confirmed task-specific constraint.]
```

Do not put model-selection instructions inside the prompt. The normal target is
Luna with `high` reasoning; the owner can choose `xhigh` when the task is
especially ambiguous or cross-cutting.

## Quick Check Before Sending

Make sure the prompt reflects the latest owner decision, names a plausible work
area, distinguishes the desired result from implementation guesses, and is
short enough that Luna can start immediately.

