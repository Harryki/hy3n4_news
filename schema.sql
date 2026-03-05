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
  upvotes INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

-- Users: simple user records
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT
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

-- Index for ranking queries
CREATE INDEX IF NOT EXISTS idx_news_upvotes_created ON news(upvotes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_source ON news(source_id);
