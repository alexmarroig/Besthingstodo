CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS experience_embeddings (
  experience_id TEXT PRIMARY KEY,
  embedding vector(1536),
  model_version TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_embeddings (
  user_id TEXT PRIMARY KEY,
  embedding vector(1536),
  model_version TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
