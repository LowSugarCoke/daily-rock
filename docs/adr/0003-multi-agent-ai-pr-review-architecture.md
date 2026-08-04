# 0003: Multi-Agent AI PR Review Pipeline with Gemini

## Status
Accepted

## Context
In a dual-stack codebase with strict development workflows (TDD, specific architectural layers, domain invariants), code reviews are vital. However, human review can be slow and error-prone, and traditional single-prompt AI reviewers often lack deep context, hallucinate, or hit token/resource limitations when reasoning over large diffs.

We need a systematic, multi-dimensional review system that:
- Understands both the Rust/axum/Cloudflare Worker backend and the Next.js/TypeScript frontend.
- Enforces strict domain terminology and business rules (e.g., proper usage of `Song`, `Daily Selection`, `Rating`, and `Listening History`).
- Evaluates specific disciplines (security, correctness, performance, testing, architecture, and business logic) in depth.
- Links pull requests to their originating GitHub issues via a standardized branch naming convention (`type/<issue-number>-slug`).

## Decision
We will port and implement a multi-agent AI PR Review pipeline modeled on `X-Talent-Frontend` and powered by Google Gemini. The architecture splits the evaluation process into three stages:

```
                  ┌───────────────┐
                  │ 1. PR Trigger │
                  └───────┬───────┘
                          │
                  ┌───────▼───────┐
                  │  2. Planner   │ (Fetches ticket context & maps files)
                  └───────┬───────┘
                          │
          ┌───────────────┼───────────────┬──────────────┐
          │               │               │              │
    ┌─────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐ ┌─────▼──────┐
    │  Security  │  │Correctness │  │  Business  │ │    ...     │ (7 Parallel Dimension Jobs)
    └─────┬──────┘  └─────┬──────┘  └─────┬──────┘ └─────┬──────┘
          │               │               │              │
          └───────────────┼───────────────┴──────────────┘
                          │
                  ┌───────▼───────┐
                  │  3. Summary   │ (Consolidates & posts single PR comment)
                  └───────────────┘
```

1. **Planner Job**: 
   - Extracted from the PR's branch name using the regex `^(?:feat|fix|chore|refactor|perf|docs|test)\/(\d+)-`.
   - Uses the GITHUB_TOKEN to fetch the originating GitHub Issue and comments to add full feature context.
   - Generates a custom review plan for the subsequent dimension agents.
2. **Parallel Dimension Jobs (7 parallel runners)**:
   - Evaluates specific code quality vectors: `security`, `correctness`, `business_logic`, `performance`, `testing`, `architecture`, and `review_guide`.
   - Uses localized project prompts: `project-context.md` (Next.js 16 + Rust/axum guidelines) and `business-rules.md` (Domain glossary invariants: Song, Daily Selection, Rating, Listening History).
3. **Summary & Posting Job**:
   - Gathers base64-encoded outputs from all parallel agents.
   - Summarizes findings into one cohesive markdown comment.
   - Posts the comment directly to the PR using same-repo GitHub issue/PR client integration.

## Consequences
- **High-Fidelity AI Review**: Specialized agents provide significantly deeper and more context-aware analysis than a generic, single-prompt AI.
- **Fast Execution**: Parallel GHA runners ensure the multi-agent reasoning completes quickly.
- **Ticket Continuity**: Enforcing the branch-naming convention guarantees every PR has its originating requirements visible to the AI reviewer.
- **Prerequisite Key**: A repository secret `GEMINI_API_KEY` is required. The pipeline will fail gracefully or warn if the token is not configured, preventing blocking contributor PRs.
- **Advisory Status**: To prevent false positives from blocking developer flow, the pipeline's status check will be purely advisory (not required for merge) initially.
