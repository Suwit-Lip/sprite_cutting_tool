---
name: go-style
description: Idiomatic Go style, naming conventions, formatting with gofmt/goimports, and linting configuration. Use when questions arise about Go naming, code organization, interface design conventions, or when setting up golangci-lint.
---

# Go Style

## Formatting
- Always run `gofmt` / `goimports`. Tabs for indentation, no debate.
- Group imports: stdlib, then third-party, then internal — separated by blank lines.

## Naming
- Package names: short, lowercase, single-word, no underscores. Match the directory name.
- Exported: `MixedCaps`. Unexported: `mixedCaps`. Never `snake_case`.
- Initialisms stay in one case: `userID`, `HTTPServer`, `JSONParser` (not `UserId`, `HttpServer`).
- Receiver names: 1–2 lowercase letters, consistent across methods on the same type (`u *User`, not sometimes `user`, sometimes `u`).
- Avoid `Get` prefix on getters: `u.Name()`, not `u.GetName()`. `Set` prefix on setters is fine.
- Interface names: single-method interfaces end in `-er` (`Reader`, `Stringer`).

## Code organization
- Keep functions short. If you need to scroll, split it.
- Order in a file: package doc, imports, constants, vars, types, then funcs (constructors near their type).
- One concept per file when the package gets large; don't shard prematurely.

## Comments
- Exported identifiers need a doc comment that starts with the identifier name: `// User represents ...`.
- Don't restate the code. Comment the *why*, not the *what*.

## Linting
- Use `golangci-lint` with at minimum: `govet`, `staticcheck`, `errcheck`, `ineffassign`, `unused`, `gofmt`, `goimports`.
- Pin the version in CI; don't let lints drift.
