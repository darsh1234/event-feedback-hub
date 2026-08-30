# Event Feedback Hub

A local TypeScript application for collecting anonymous event feedback and displaying new responses in real time.

The repository records the application as a sequence of focused, passing checkpoints. The completed experience includes searchable event selection, anonymous validated submissions, rating filters, stable cursor pagination, event-scoped live updates, buffered-response handling, and a responsive interface backed by SQLite.

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

The web application uses Vite's default development port. The server exposes `GET /health`, GraphQL over HTTP, and GraphQL subscriptions over WebSocket on port `4000`. Both GraphQL transports use the `/graphql` path.

The React application sends queries and mutations to `http://localhost:4000/graphql` and uses a lazy `graphql-ws` connection at `ws://localhost:4000/graphql` for event-scoped subscriptions. Its event selector is populated by the generated, typed `Events` operation rather than hardcoded client data. After an event is selected, the feedback form validates text and rating locally before using the typed `SubmitFeedback` mutation. Expected server validation errors remain beside the relevant field, input is preserved after failure, and the form clears only after a confirmed success. The persisted stream uses a typed feedback query with `cache-and-network`, keeps separate Apollo lists for each event and rating, and appends deduplicated older pages through the opaque server cursor. Matching live responses prepend immediately while the reader is at the top; otherwise they wait behind an **N new responses** control. Mutation and subscription results share an ID-based merge path, so the submitting browser sees one response while the oldest pagination cursor remains stable.

The GraphQL API can be exercised at `http://localhost:4000/graphql` with:

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

Committed feedback can be streamed for one event with:

```graphql
subscription FeedbackAdded($eventId: ID!) {
  feedbackAdded(eventId: $eventId) {
    id
    event {
      id
      name
    }
    text
    rating
    createdAt
  }
}
```

The server publishes only after SQLite persistence succeeds. The publisher is intentionally in-memory and single-process for the local take-home; rating filtering remains a client concern.

GraphQL resolver signatures and typed client operations are generated from the committed SDL and client documents:

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
