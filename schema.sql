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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_news_upvotes_created ON news(upvotes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_source ON news(source_id);
CREATE INDEX IF NOT EXISTS idx_clicks_news ON clicks(news_id);

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

CREATE INDEX IF NOT EXISTS idx_news_topics_topic ON news_topics(topic_id);
CREATE INDEX IF NOT EXISTS idx_topics_updated ON topics(updated_at DESC);
