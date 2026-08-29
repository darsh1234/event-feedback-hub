-- Type-prefixed ULIDs keep entity identity and lexical ordering visible.
CREATE TABLE events (
  id TEXT PRIMARY KEY
    CHECK (length(id) = 28 AND substr(id, 1, 2) = 'E-'),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE feedback (
  id TEXT PRIMARY KEY
    CHECK (length(id) = 28 AND substr(id, 1, 2) = 'F-'),
  event_id TEXT NOT NULL REFERENCES events(id),
  text TEXT NOT NULL
    CHECK (length(trim(text)) BETWEEN 1 AND 1000),
  rating INTEGER NOT NULL
    CHECK (rating BETWEEN 1 AND 5),
  -- Store one canonical server-authored UTC value for display and debugging.
  created_at TEXT NOT NULL
    CHECK (
      strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS NOT NULL
      AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) = created_at
    )
);

-- Match the unfiltered and rating-filtered newest-first query paths.
CREATE INDEX feedback_event_id_idx
ON feedback(event_id, id DESC);

CREATE INDEX feedback_event_rating_id_idx
ON feedback(event_id, rating, id DESC);
