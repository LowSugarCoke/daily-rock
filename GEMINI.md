# Project Guidelines & Agent Instructions

This file defines the workflows, rules, and standards for AI agents operating in this repository.

## Development Workflows

We follow **Test-Driven Development (TDD)** across the entire stack.

### 1. Rust / Backend (Practice Environment)
*   **Role**: Test Author & Solution Verifier (solutions are stored separately).
*   **Workflow**:
    1.  When a feature or endpoint is requested, the AI agent **must first write both the test cases and the complete, correct implementation**.
    2.  The AI agent runs `cargo test` to **empirically verify** that the tests and implementation compile and pass perfectly.
    3.  Once verified, the AI agent **moves the verified implementation to a separate solutions directory** (e.g., `backend/solutions/[feature_name].rs` or in `docs/solutions/`), keeping it hidden from the user's active workspace.
    4.  In the active working file (e.g., `backend/src/lib.rs`), the AI agent **replaces the implementation with a stub** (returning a dummy value to allow compilation) and provides step-by-step hints.
    5.  This guarantees that the challenge is 100% functional and solvable, while keeping the user's practice environment clean of spoilers.
*   **Goal**: The user practices Rust with the peace of mind that the tests are verified and a correct "cheat sheet" solution exists separately if they get stuck.

### 2. Frontend (Full Implementation)
*   **Role**: Full Developer (Author of both Tests and Implementation).
*   **Workflow**:
    1.  AI agent writes tests first to define the frontend component or utility behavior (following TDD).
    2.  AI agent then writes the complete, production-ready implementation of the frontend components/logic to make those tests pass.
*   **Goal**: Speed up frontend development using the AI agent, while maintaining high code quality through TDD.

---

## Technical Stack & Standards

### Backend (Rust)
*   **Platform**: Cloudflare Workers (via `worker-sandbox` or `worker` crate).
*   **Web Framework**: `axum` routing.
*   **Testing**: `tokio::test` with `axum-test` (TestServer).

### Frontend (TypeScript / Next.js)
*   **Framework**: Next.js (App Router).
*   **Testing**: Vitest + React Testing Library (configured in `frontend/vitest.config.mts`).
*   **Styling**: Vanilla CSS (or `page.module.css`). Avoid Tailwind unless requested.
