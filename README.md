# Event Feedback Hub

A local TypeScript application for collecting anonymous event feedback and displaying new responses in real time.

The repository is being developed as a sequence of focused, passing checkpoints. The current checkpoint exposes seeded events, validated anonymous submissions, and filtered cursor-paginated feedback through a typed GraphQL API backed by SQLite.

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

Create or reset the local SQLite database from the committed schema and seed files:

```bash
npm run setup
```

This replaces `apps/server/data/event-feedback.db` with a deterministic demonstration database. Fixed seed ULIDs and their canonical UTC submission timestamps remain aligned, while the generated database stays local and is ignored by Git.

Then run the web and server workspaces together:

```bash
npm run dev
```

The web application uses Vite's default development port. The server exposes `GET /health` and `POST /graphql` on port `4000`.

The current GraphQL capability can be exercised at `http://localhost:4000/graphql` with:

```graphql
query Events {
  events {
    id
    name
  }
}
```

Anonymous feedback can be persisted with:

```graphql
mutation SubmitFeedback {
  submitFeedback(
    input: {
      eventId: "E-01JGFJJZ000JX0K3SAK84YSW4T"
      text: "Clear and useful session."
      rating: 5
    }
  ) {
    feedback {
      id
      event {
        id
        name
      }
      text
      rating
      createdAt
    }
    errors {
      field
      code
      message
    }
  }
}
```

Expected validation failures are returned in the payload's `errors` array. Unexpected execution or database failures remain top-level GraphQL errors.

Persisted feedback can be read newest first with an optional rating filter:

```graphql
query Feedback($eventId: ID!, $rating: Int, $after: String) {
  feedback(eventId: $eventId, rating: $rating, first: 20, after: $after) {
    items {
      id
      text
      rating
      createdAt
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
}
```

Pass the returned `endCursor` as `after` to load older feedback. Cursors are opaque to clients; `first` accepts values from 1 through 50 and defaults to 20.

GraphQL resolver signatures are generated from the committed SDL:

```bash
npm run codegen
```

## Verification

```bash
npm run verify
```

The verification gate regenerates GraphQL types, then checks formatting, linting, TypeScript, tests, and production builds. The same command runs in GitHub Actions.

Focused commands are also available:

```bash
npm run format
npm run format:check
npm run lint
npm run lint:fix
npm run codegen
npm run typecheck
npm run test
npm run build
```

## Architecture

See [`docs/design.md`](docs/design.md) for the approved architecture, tradeoffs, validation boundaries, cache behavior, and testing strategy.
