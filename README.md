# Event Feedback Hub

A local TypeScript application for collecting anonymous event feedback and displaying new responses in real time.

The repository is being developed as a sequence of focused, passing checkpoints. The current checkpoint establishes the typed workspace and quality gate; product functionality follows in later checkpoints.

## Prerequisites

- Node.js `24.20.0`
- npm `11.19.0`

With `nvm` installed:

```bash
nvm use
```

## Install

```bash
npm install
```

## Development

Run the web and server workspaces together:

```bash
npm run dev
```

The baseline web application uses Vite's default development port. The baseline server exposes `GET /health` on port `4000`.

## Verification

```bash
npm run verify
```

The verification gate checks formatting, linting, TypeScript, tests, and production builds. The same command runs in GitHub Actions.

Focused commands are also available:

```bash
npm run format
npm run format:check
npm run lint
npm run lint:fix
npm run typecheck
npm run test
npm run build
```

## Architecture

See [`docs/design.md`](docs/design.md) for the approved architecture, tradeoffs, validation boundaries, cache behavior, and testing strategy.
