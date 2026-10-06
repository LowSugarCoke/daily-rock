# Rust learning plan

Six weeks, about two hours a week. Each exercise adds a feature you can see in the app, and each one lives on its own `practice/*` branch because its tests fail until you finish it.

## Weekly rhythm

| Session | Time | What you do |
|---|---|---|
| A. Prepare | 30 min | Read the Rust Book chapters for the week, then read the exercise's tests and guess which syntax you need. |
| B. Build | 60 min | Write the code until `cargo test` passes. Stuck for more than 20 minutes: ask for one hint. |
| C. Wrap up | 30 min | Run `cargo clippy`, compare with `backend/solutions/`, then merge. |

## Exercises

| Week | Exercise | Rust you practise | What the app gains | Read first (Rust Book) |
|---|---|---|---|---|
| 1 | `era_progress` | structs, borrowing a slice, iterators, `Vec` | Songs heard per decade | Ch 4, 5, 8.1, 13.2 |
| 2 | `GET /api/progress` | trait methods, `Result` and `?`, in-memory and D1 stores | Decade progress on History | Ch 9, 10.2 |
| 3 | `PUT /api/ratings/:id` | `Path` extractor, `Option` for partial updates, validation, D1 `UPDATE` | Edit a past rating or note | Ch 6 |
| 4 | `AppError` | enums, implementing traits, `From` with `?` | Consistent API errors | Ch 9.2, 10.2 |
| 5 | Genre stats | `HashMap` counting, `sort_by`, closures | Genre counts from the backend | Ch 8.3, 13.1 |
| 6 | Cloudflare Access JWT check | external crates, headers, signatures | Backend confirms it's you | Ch 7 |

## Scaffolding comes off gradually

- Weeks 1-2: the tests and function signatures are written; you write the body.
- Weeks 3-4: only the tests are written; you design the structs and signatures.
- Week 5: you get the requirement and write the tests too; they get reviewed.
- Week 6: you do all of it; the result gets a code review.

## Rules

- Don't open `solutions/` before your tests pass. A hint teaches more than the answer.
- Type the code yourself instead of pasting it.
- Treat every clippy warning as a small lesson: look it up, then fix it.
- If a week runs long, take another week. Later exercises build on earlier ones.

## Latest practice

2026-10-06: Exercise 4 (`AppError`) implemented with guided instruction; all 41 tests pass. See [practice log](rust-practice-log.md) for concepts covered, assistance provided, and verification.

Next session: briefly review error conversion and tuple destructuring, then prepare exercise 5 (Genre stats). Independent recall of exercise 4 has not yet been checked.
