# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| --------------------------- | --------------------- | ----------------------------------------- |
| `needs-triage`              | `needs-triage`        | Maintainer needs to evaluate this issue  |
| `needs-info`                | `needs-info`          | Waiting on reporter for more information |
| `ready-for-agent`           | `ready-for-agent`     | Fully specified, ready for an AFK agent  |
| `ready-for-human`           | `ready-for-human`     | Requires human implementation            |
| `wontfix`                   | `wontfix`              | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## `ready-for-agent` excludes anything touching Rust/backend implementation

`GEMINI.md`'s Rust/backend workflow is a practice environment: the AI only writes tests + a stub + hints, and the human writes the real implementation. An AFK agent that "eats" a `ready-for-agent` ticket and opens a mergeable PR would bypass that entirely for any ticket touching `backend/`.

So:
- `ready-for-agent` is only for tickets an AI can fully implement end-to-end — pure frontend, infra/tooling, docs.
- Any ticket that requires writing or changing Rust/backend code — including tickets that mix backend and frontend work in one issue — gets `ready-for-human` instead, even if it's otherwise fully specified.
- Mixed tickets get split into backend/frontend sub-issues just-in-time (when work on them starts, not in advance) — see `docs/adr/0005-rust-practice-vs-afk-agent-ticket-routing.md`. Once split, the frontend sub-issue can carry `ready-for-agent`; the backend sub-issue stays `ready-for-human`.
