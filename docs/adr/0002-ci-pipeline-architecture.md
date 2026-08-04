# 0002: CI Pipeline Architecture with GitHub Actions

## Status
Accepted

## Context
As the codebase grows and more contributors join, we need automated feedback on pull requests without requiring everyone to have complex local toolchain configurations (Rust, WebAssembly, and specific Node.js versions) set up immediately. 

Specifically, we want to:
- Build and test both the Next.js frontend (Node/TypeScript) and the Cloudflare Worker backend (Rust/WASM).
- Ensure that CI builds use the exact same toolchains used in local development to avoid "works on my machine" issues.
- Speed up feedback loops and save GitHub Action runner minutes by only triggering backend jobs on backend changes, and frontend jobs on frontend changes.
- Provide a manual trigger (`workflow_dispatch`) for running both jobs on demand.

## Decision
We will set up a GitHub Actions workflow that:
1. **Uses a single orchestrator file (`.github/workflows/ci.yml`)** but splits work into parallel, isolated jobs: `frontend-ci` and `backend-ci`.
2. **Utilizes `dorny/paths-filter`** to dynamically check which paths (`frontend/**` or `backend/**`) have changed, skipping irrelevant jobs dynamically.
3. **Pins toolchains strictly**:
   - Rust toolchain is pinned to version `1.96.0` using `backend/rust-toolchain.toml`.
   - Node.js version is pinned to `24` using `frontend/.nvmrc`.
4. **Leverages caching aggressively**:
   - `actions/setup-node`'s built-in npm caching to speed up frontend package installation.
   - `Swatinem/rust-cache` to cache Rust compilation artifacts and target directory dependencies.
5. **Runs comprehensive quality checks**:
   - **Frontend**: Runs `npm ci`, `npm run lint` (ESLint), `npm run test` (Vitest), and `npm run build` (Next.js production build).
   - **Backend**: Runs `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, and finishes with `cargo install worker-build && worker-build --release` to verify compilation into WebAssembly matches what Cloudflare wrangler expects.

## Consequences
- **Developer Experience**: Fast, deterministic feedback on every PR.
- **Resource Efficiency**: Changes to only frontend files will not spin up the heavy Rust/WASM compilation runner, and vice-versa.
- **Maintainability**: Pinning compiler and runtime versions ensures CI checks remain consistent over time.
- **Advisory Status**: Neither status check will be initially marked as a required branch-protection block until we have proven the pipeline is fully stable and free of transient environment failures.
