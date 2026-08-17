# Project Guidelines & Agent Instructions

This file defines the workflows, rules, and standards for AI agents operating in this repository.

## Development Workflows

We follow **Test-Driven Development (TDD)** across the entire stack.

### 1. Rust / Backend (Practice Environment)
*   **Role**: Test Author & Solution Verifier (solutions are stored separately).
*   **Workflow**:
    1.  When a feature or endpoint is requested, the AI agent **must first write both the test cases and the complete, correct implementation**.
    2.  The AI agent runs `cargo test` to **empirically verify** that the tests and implementation compile and pass perfectly.
    3.  Once verified, the AI agent **moves the verified implementation to a mirrored directory structure inside `backend/solutions/`**. The solutions directory **must mirror the active workspace structure exactly**, matching file paths and file names (e.g., `backend/solutions/store/in_memory.rs` must correspond directly to `backend/src/store/in_memory.rs`), keeping it organized and 100% aligned with the active workspace to eliminate cognitive friction.
    4.  In the active working file (e.g., `backend/src/store/in_memory.rs`), the AI agent **replaces the implementation with a stub** (returning a dummy value to allow compilation) and provides step-by-step hints.
    5.  This guarantees that the challenge is 100% functional and solvable, while keeping the user's practice environment clean of spoilers.
*   **Goal**: The user practices Rust with the peace of mind that the tests are verified and a correct "cheat sheet" solution exists separately if they get stuck.
*   **User context**: The learner's daily language is C++, new to Rust.
*   **Hint calibration** (learned from the `/api/greet` challenge — the original hints only described behavior and the learner got stuck on unfamiliar syntax):
    *   Name the actual Rust method/syntax to use, not just the abstract behavior (e.g. say `.unwrap_or_else(|| ...)`, don't just say "handle the None case").
    *   Gloss any syntax with no direct C++ equivalent in one line — closures-as-arguments, `?`, `match`/`if let`, trait bounds. A C++ analogy helps when one exists (e.g. `Option::unwrap_or_else` ~ `std::optional::value_or`; `|| expr` ~ `[]() { return expr; }`).
    *   Don't hint something the stub's code shape already gives away (e.g. don't hint "wrap it in `Json(...)`" if the stub already shows `Json(GreetResponse { ... })` verbatim) — only hint what's genuinely new or undiscoverable.

### 2. Frontend (Full Implementation)
*   **Role**: Full Developer (Author of both Tests and Implementation).
*   **Workflow**:
    1.  AI agent writes tests first to define the frontend component or utility behavior (following TDD).
    2.  AI agent then writes the complete, production-ready implementation of the frontend components/logic to make those tests pass.
*   **Goal**: Speed up frontend development using the AI agent, while maintaining high code quality through TDD.

---

## Technical Stack & Standards

### Backend (Rust)
*   Platform: Cloudflare Workers (via `worker-sandbox` or `worker` crate).
*   Web Framework: `axum` routing.
*   Testing: `tokio::test` with `axum-test` (TestServer).
*   **Modular Architecture**: Avoid letting single files (like `store.rs`) grow excessively. When any backend module starts encompassing multiple distinct responsibilities (such as data definitions, in-memory simulations, and database implementations), refactor it into a modular subdirectory (e.g., `store/`).
    *   `models.rs` for shared structs, query structs, and types.
    *   `in_memory.rs` for in-memory store implementations, stubs, and practice guides.
    *   `d1.rs` for production Cloudflare D1 database operations.
    *   `mod.rs` to declare submodules, define primary interface traits, and re-export internal structures so that external imports (like `crate::store::*`) remain completely unchanged and backwards-compatible.

### Frontend (TypeScript / Next.js)
*   **Framework**: Next.js (App Router).
*   **Testing**: Vitest + React Testing Library (configured in `frontend/vitest.config.mts`).
*   **Styling**: Vanilla CSS (or `page.module.css`). Avoid Tailwind unless requested.
