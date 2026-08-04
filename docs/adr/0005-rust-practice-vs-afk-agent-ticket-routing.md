# 0005: Rust Practice vs. AFK-Agent Ticket Routing

## Status
Accepted

## Context
`GEMINI.md` defines two different roles for AI on this codebase: on Rust/backend, the AI is a test author and solution verifier only — it writes tests, hides the correct implementation in `docs/solutions/`, and leaves a stub + hints in the active file so the human (a C++ developer learning Rust) writes the real implementation. On frontend, the AI is a full developer — it writes both tests and the complete implementation.

Separately, this repo's triage labels and its AI PR review / ticket-sync automation are built around an "AFK agent" model: a `ready-for-agent` ticket is fully specified and can be handed to an autonomous agent that writes the implementation and opens a mergeable PR. Every ticket in the tracker was labeled `ready-for-agent` uniformly, including backend tickets like #11 (`GET /api/songs/current`). If an AFK agent were pointed at the tracker as-is, it would fully implement Rust tickets end-to-end — which is exactly the outcome the Rust practice workflow exists to prevent.

## Decision
`ready-for-agent` is reserved for tickets an AI can fully implement without touching Rust/backend code — pure frontend, infra/tooling, docs. Any ticket that requires writing or changing backend code gets the existing `ready-for-human` label instead (see `docs/agents/triage-labels.md`); no new label was introduced, since "requires human implementation" already describes the Rust practice tickets accurately.

Tickets that mix backend and frontend work in a single issue (the majority of the remaining MVP tickets, #3–#9) are relabeled `ready-for-human` as a safe default and are **not** pre-split into backend/frontend sub-issues up front. Splitting happens just-in-time, when work on a given ticket actually starts — mirroring how MVP 01 (#2) was split into #10/#11/#12. Pre-splitting all seven now would mean guessing at a decomposition before the earlier tickets reveal what the real pattern should look like.

## Consequences
- Any future automation that walks `ready-for-agent` tickets (an AFK Gemini/Claude Code agent, or an extension of the existing AI review pipeline) is safe to run unattended against the tracker as it stands — it will never touch Rust code.
- Splitting a mixed ticket is a manual step each time one comes up; there's no tooling for it yet. If this happens often enough to be annoying, it's worth revisiting as its own ticket.
- The frontend sub-issue created by a future split can go straight to `ready-for-agent`; the backend sub-issue stays `ready-for-human`.
