-- Sources: RSS feed definitions
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'rss',
  url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- News: collected articles
CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  description TEXT,
  upvotes INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

-- Users: Google OAuth based
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  email TEXT
);

-- Sessions: token-based session management
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Votes: one vote per user per news item
CREATE TABLE IF NOT EXISTS votes (
  user_id INTEGER NOT NULL,
  news_id INTEGER NOT NULL,
  vote_type INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, news_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (news_id) REFERENCES news(id)
);

-- Click tracking
CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  news_id INTEGER NOT NULL,
  clicked_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (news_id) REFERENCES news(id)
);

-- Clustering: Topics
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  keywords TEXT,  -- LLM generated tags
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1
);

-- Clustering: M:N Mapping between news and topics
CREATE TABLE IF NOT EXISTS news_topics (
  news_id INTEGER NOT NULL,
  topic_id INTEGER NOT NULL,
  similarity_score REAL,
  PRIMARY KEY (news_id, topic_id),
  FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- -- Indexes

-- Handles the Main Feed (WHERE published_at / ORDER BY created_at)
CREATE INDEX IF NOT EXISTS idx_news_feed_composite ON news(published_at DESC, created_at DESC);

-- Handles the Keyword Search sort (ORDER BY COALESCE)
-- This is a functional index supported by D1 (SQLite)
CREATE INDEX IF NOT EXISTS idx_news_coalesce_sort ON news(COALESCE(published_at, created_at) DESC);

-- Covering Index for Topic Aggregation (The "Top 10" query)
CREATE INDEX IF NOT EXISTS idx_news_topics_topic_news ON news_topics(topic_id, news_id);

-- Covering Index for Keyword Subqueries (The group_concat part)
CREATE INDEX IF NOT EXISTS idx_news_topics_news_topic ON news_topics(news_id, topic_id);

-- Covering Index for Topic Discovery (WHERE updated_at / SELECT id, title)
CREATE INDEX IF NOT EXISTS idx_topics_recent_full ON topics(updated_at DESC, id, title);

-- Existing essentials to keep
CREATE INDEX IF NOT EXISTS idx_news_upvotes_created ON news(upvotes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_source ON news(source_id);
CREATE INDEX IF NOT EXISTS idx_clicks_news ON clicks(news_id);
