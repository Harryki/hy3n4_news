-- Initial RSS sources: 조선일보, 경향신문, 연합뉴스
INSERT OR IGNORE INTO sources (type, url, name) VALUES
  ('rss', 'https://www.chosun.com/arc/outboundfeeds/rss/?outputType=xml', '조선일보'),
  ('rss', 'https://www.khan.co.kr/rss/rssdata/total_news.xml', '경향신문'),
  ('rss', 'https://www.yna.co.kr/rss/news.xml', '연합뉴스'),
  ('rss', 'https://news-ex.jtbc.co.kr/v1/get/rss/newsflesh', 'JTBC'),
  ('rss', 'https://rss.donga.com/total.xml', '동아일보');
