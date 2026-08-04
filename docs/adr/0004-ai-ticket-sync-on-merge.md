# 0004: AI Ticket Sync on PR Merge

## Status
Accepted

## Context
Tickets (GitHub issues) currently have to be closed and annotated by hand after the PR implementing them merges, even though the AI review pipeline (ADR 0003) already resolves the ticket from the branch name and already produces a summary of the change. That's duplicated, manual effort for information the pipeline already has.

## Decision
A new, independent workflow (`.github/workflows/ticket-sync.yml`), triggered on `pull_request: closed` and gated on `merged == true`, closes the ticket a merged PR resolves and posts a comment on it summarizing the change. It reuses the branch-naming convention (`type/<issue-number>-slug`) already established for the review pipeline to resolve the ticket number, and reuses the AI review pipeline's existing summary comment (found via its `<!-- ai-review-pipeline -->` marker) as the comment content, rather than generating a second AI summary — this guarantees the ticket and the PR describe the change identically and avoids a second model call.

Several boundaries were deliberately drawn narrow:
- **Scope is PR-lifecycle events only** (open → no-op, merge → close+comment). Issue comments, CI status, and other events don't trigger this automation.
- **Wayfinder child tickets are skipped entirely.** Closing a wayfinder child also requires appending to its map issue's Decisions-so-far section (see `docs/agents/issue-tracker.md`), which means locating and editing another issue's body — a materially different and riskier operation than posting a comment and closing. Any ticket carrying a `wayfinder:*` label is left for the existing manual Resolve flow.
- **The issue body is never rewritten**, only commented on — an irreversible, AI-authored edit to the original requirements text is a much larger blast radius than an appended, auditable comment.
- **A missing summary comment does not block closing.** If the review pipeline didn't run or didn't post a summary (e.g. missing `GEMINI_API_KEY`), the ticket is still closed with a generic comment linking the PR, rather than leaving the ticket open just because the AI content is unavailable.
- **No opt-in label is required.** Every PR that matches the branch naming convention is synced automatically; the convention is already mandatory for the review pipeline, so adding a second required label would be pure friction for a single-maintainer repo.

## Consequences
- Merging a PR now has a side effect beyond the target branch: it closes and comments on a GitHub issue. This is intentional but should be remembered when merging PRs that don't actually fully resolve the linked ticket — the automation currently has no notion of "partially done."
- If the branch-naming convention is ever loosened or made optional, this workflow (and the review pipeline's Planner job) both silently degrade to "no ticket found" — a PR comment warns when that happens, but nothing blocks the merge.
- Extending this to wayfinder child tickets is a distinct, larger piece of work (resolving the child → map relationship, editing map body text) and should be scoped as its own decision if pursued.
