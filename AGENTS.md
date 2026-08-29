# Repository Instructions

These instructions apply to the entire repository.

## Before changing implementation

1. Read `docs/design.md` completely.
2. Identify the active development checkpoint.
3. Inspect the current implementation, tests, and working tree.
4. Confirm that the proposed work belongs to the active checkpoint.

## Development rules

- Implement only the active checkpoint.
- Do not silently change a decision documented in `docs/design.md`.
- If implementation conflicts with the design, stop and explain the conflict before editing.
- Keep changes focused, buildable, and testable.
- Add or update relevant tests in the same change as the behavior they verify.
- Update documentation in the same change when behavior or a documented decision changes.
- Use the Node version in `.nvmrc` and npm workspaces from the repository root.
- Run the relevant focused checks while working and `npm run verify` before declaring a checkpoint complete.
- Do not implement future checkpoints merely because their supporting structure is convenient to add.
- Do not create a Git commit unless Darsh explicitly requests it.

## Code quality

- Keep TypeScript strict and avoid unsafe type assertions when a boundary can be modeled or validated.
- Keep GraphQL, service, and persistence responsibilities separated as described in `docs/design.md`.
- Prefer clear code and focused tests over unnecessary abstraction.
- Do not disable lint rules merely to make a check pass; document and justify any narrow exception.
