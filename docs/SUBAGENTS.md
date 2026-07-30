# Subagent Playbook

Updated: 2026-07-28

## Purpose

Subagents are optional and off by default. There is no per-task requirement to
assess delegation or to read this document. Use it only when the user requests
delegation or when a clearly independent, high-risk review is worth the extra
context and token cost.

A delegated task must produce a useful independent result or keep substantial
noisy exploration out of the main thread. Speed alone is not a reason to
delegate.

## When Delegation Is Useful

Delegate when at least one of these conditions applies:

- A read-heavy repository survey can return a concise map of relevant files,
  dependencies, invariants, or risks.
- A change benefits from an independent review for regressions, security,
  permissions, accessibility, responsive behavior, or bilingual coverage.
- The task has genuinely separate domains, such as UI, Firebase/data flow, and
  validation.
- Tests, logs, documentation research, or external-source review would add
  substantial noise to the main thread.
- Two plausible approaches need independent evaluation before the primary
  agent chooses one.
- Production-sensitive NFC work would benefit from a second check of the
  applicable model documents, rules, Functions, and client behavior.

Do not delegate when:

- One short file read or one routine check is enough.
- The subagent would need the same full context and repeat the same work.
- Multiple agents would edit the same files or tightly coupled code.
- The task is a simple clarification, status report, or tiny mechanical edit.
- The delegation exists only to increase agent count.
- The subtask would independently publish, deploy, delete data, change
  ownership, or make another externally consequential decision. Those actions
  remain with the primary agent and still require the normal authorization.

## Default Team Shape

- Start with one focused subagent when an independent result would help.
- Use two when there are two orthogonal concerns, for example implementation
  mapping plus regression/security review.
- Use three only for a broad task with three demonstrably independent
  boundaries. More agents increase duplicated context and synthesis cost.
- Prefer read-only subagents. Keep one owner for every edited file.
- The primary agent owns requirements, integration, final edits, validation,
  and the final answer.
- Reuse an existing subagent with a follow-up when its context remains useful.
  Create a new one only when a genuinely independent perspective is valuable.
- Avoid delegation chains unless a subagent discovers a new, bounded task whose
  value clearly exceeds its context and token cost.
- Do not fork the full conversation history by default. Pass only the recent
  turns or a concise task-specific context package needed for the subtask.

## Model And Reasoning Guide

Always check which model overrides the current orchestration tool actually
exposes. Product-level model availability and subagent override availability
are not necessarily identical.

| Work type | Preferred setup | Typical agent count |
| --- | --- | ---: |
| File discovery, inventory, routine docs or test-log scan | Luna low/medium when exposed; otherwise Terra low/medium | 1 |
| Well-specified, bounded implementation with an exclusive file set | Terra medium | 1 |
| Independent regression, architecture, permissions, or accessibility review | Sol high | 1 |
| UI plus Firebase/data-flow change | Terra medium for mapping or bounded implementation; Sol high for independent review | 2 |
| Ambiguous design decision or broad refactor | Sol high or xhigh, split by alternative or layer | 1-2 |
| Security, ownership, roles, Tag ID, or production-sensitive Firebase work | Sol high; xhigh only when the uncertainty justifies it | 1 reviewer |
| External research with clear extraction criteria | Luna or Terra medium; Sol high when sources conflict or judgment is central | 1 |

Selection principles:

- **Luna**: clear, repeatable, structured, or high-volume work such as
  extraction, classification, transformation, and concise summaries. Use it as
  a subagent only when the current tool advertises or verifies support.
- **Terra**: repository orientation, read-heavy scans, routine validation,
  documentation review, and bounded implementation with clear acceptance
  criteria.
- **Sol**: ambiguous or high-impact implementation, architecture, security,
  difficult debugging, trade-off analysis, and critical independent review.
- **Low**: short, deterministic discovery.
- **Medium**: the normal starting point for bounded work.
- **High**: complex logic, edge cases, sensitive domains, or independent
  review requiring judgment.
- **xhigh**, **max**, or **ultra**: reserve for unusually difficult reasoning;
  never select them by inertia.

Use the lowest-cost setup that is still likely to produce trustworthy evidence.
Token economy means matching capability to uncertainty and impact, not always
choosing the cheapest model.

## Delegation Contract

Every subagent prompt should state:

1. The concrete objective and why it is independent.
2. The allowed scope: paths, domain, and whether it is read-only or may edit.
3. The relevant repository documents and constraints.
4. The expected output, including file references and evidence.
5. The completion condition and validations, if applicable.
6. Any explicit prohibition on publishing, deploying, or touching live data.

Do not ask two agents to "solve the problem" without partitioning their work.
Separate exploration, implementation, and review into distinct responsibilities.

## Editing And Verification

- One agent owns each editable file set. Review agents remain read-only unless
  the primary agent deliberately transfers ownership.
- An implementing subagent reports modified files, assumptions, validations,
  and uncovered risks.
- A reviewing subagent checks the actual requirement and applicable repository
  model documents, not just code style.
- For Firebase, roles, ownership, admin links, Tag ID, or QR cleanup, the
  reviewer must compare the client, callable Functions, and rules where
  relevant after reading `docs/FIREBASE_MODEL.md`.
- The primary agent inspects the combined diff, resolves disagreements, runs
  proportional local validation, and confirms bilingual UI coverage.
- Subagent conclusions are evidence for the primary agent, not automatic
  instructions.

## Luna Availability Note

OpenAI documents `gpt-5.6-luna` as part of the GPT-5.6 family and exposes it in
Codex's advanced model selection for clear, repeatable, lower-cost work.
However, the subagent orchestration tool available on 2026-07-28 advertised
only `gpt-5.6-sol` and `gpt-5.6-terra` as explicit spawn overrides. This means
Luna was available in Codex generally but was not exposed or verified as a
subagent override in that runtime.

Future agents should re-check the callable model list rather than preserve this
session-specific limitation as a permanent assumption. Until Luna is exposed
for spawning, use Terra for the lighter supporting role.

Official references:

- [Codex models](https://learn.chatgpt.com/docs/models)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [GPT-5.6 Luna model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
