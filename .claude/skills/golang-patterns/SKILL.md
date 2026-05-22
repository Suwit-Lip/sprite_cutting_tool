---
name: golang-patterns
description: Idiomatic Go patterns and best practices for building robust, efficient, and maintainable Go applications. Use when writing or reviewing Go code involving concurrency, error handling, interfaces, context propagation, or project structure.
---

# Golang Patterns

Apply these idiomatic Go patterns when writing or reviewing Go code in this project.

## Error handling
- Return errors as the last return value; never panic for expected failure paths.
- Wrap errors with `fmt.Errorf("doing X: %w", err)` to preserve the chain. Use `errors.Is` / `errors.As` to inspect.
- Define sentinel errors (`var ErrNotFound = errors.New(...)`) only when callers need to branch on them.
- Don't log-and-return — pick one. The top of the stack logs.

## Concurrency
- Pass `context.Context` as the first parameter for any function that does I/O, blocks, or may need cancellation.
- Never store a `context.Context` in a struct. Pass it explicitly.
- Use `sync.WaitGroup` or `errgroup.Group` for fan-out; close channels from the sender side only.
- Protect shared mutable state with `sync.Mutex` or channels — not both for the same data.
- Avoid `time.Sleep` for synchronization; use channels, `sync.Cond`, or contexts.

## Interfaces
- Define interfaces at the consumer, not the producer. Small interfaces (1–3 methods) compose better.
- Accept interfaces, return concrete types.
- `io.Reader`, `io.Writer`, `context.Context` should be your first reach before custom abstractions.

## Project structure
- `cmd/<binary>/main.go` for executables; keep `main` tiny — wire dependencies and call into packages.
- `internal/` for code that must not be imported by other modules.
- Avoid `util`, `common`, `helpers` packages — name by responsibility.

## Testing
- Table-driven tests with `t.Run(name, ...)` for subtests.
- Use `t.Helper()` in test helpers; `t.Cleanup()` instead of `defer` for teardown.
- Prefer the standard library `testing` package; reach for `testify` only for assertions, not mocks.

## Performance
- Preallocate slices when length is known: `make([]T, 0, n)`.
- Strings are immutable — use `strings.Builder` for repeated concatenation.
- Benchmark before optimizing; `go test -bench`.
