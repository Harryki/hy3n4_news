# Brutalist News Curation Project Plan

## 🎯 Tech Stack
- **Runtime:** Cloudflare Workers (TypeScript)
- **Database:** Cloudflare D1 (SQLite)
- **Frontend:** HTML + CSS (Brutalist, hacker news like small web style) + HTMX
- **Local Dev:** Docker (Node.js/Wrangler environment)

---

## 🏗️ Phase 1: 로컬 개발 환경 및 D1 스키마 구성
**Goal:** 로컬 호스트를 오염시키지 않고 Docker 위에서 Wrangler와 로컬 DB를 구동한다.

1. **디렉토리 셋업 & Docker화**
   - `Dockerfile` (Node.js + Wrangler 글로벌 설치) 작성.
   - `docker-compose.yml` 작성 (포트 8787 노출, 소스코드 및 `.wrangler` 디렉토리 볼륨 마운트).
   - `wrangler.toml` 초기화 및 D1 로컬 바인딩 설정.
2. **D1 스키마 정의 및 마이그레이션 (`schema.sql`)**
   - `sources` 테이블: `id`, `type` (rss, user_submit), `url`, `name`, `is_active`
   - `news` 테이블: `id`, `source_id` (FK), `title`, `url` (UNIQUE), `upvotes`, `created_at`
   - `users` 테이블: `id`, `username`, `email`
   - `votes` 테이블: `user_id`, `news_id`, `vote_type` (UNIQUE 제약 조건 필수)

**✅ Checkpoint 1:** - `docker-compose up -d` 후 컨테이너 접속 성공.
- `wrangler d1 execute news-db --local --file=./schema.sql` 명령어로 로컬 DB 테이블 생성 성공.

---

## 📡 Phase 2: RSS 수집 파이프라인 (Cron Trigger)
**Goal:** TypeScript 환경에서 주기적으로 외부 RSS를 긁어와 DB에 적재한다.

1. **RSS 파싱 로직 구현**
   - `fast-xml-parser` 등 가벼운 패키지를 설치하여 XML -> JSON 변환 유틸리티 작성.
2. **Worker `scheduled` 이벤트 핸들러 작성**
   - `sources` 테이블에서 `is_active=1`인 RSS URL 목록을 조회 (`SELECT`).
   - `Promise.allSettled`를 사용해 비동기적으로 여러 RSS를 동시에 fetch.
   - 파싱된 뉴스 데이터를 `news` 테이블에 `INSERT OR IGNORE` (중복 URL 방지)로 적재.

**✅ Checkpoint 2:**
- `curl "http://localhost:8787/__scheduled"` 로컬 호출 (Manual Trigger).
- D1 DB를 쿼리하여 `news` 테이블에 파싱된 기사들이 정상적으로 들어갔는지 확인.

---

## 🖥️ Phase 3: 웹 렌더링 & HTMX 연동 (Brutalist UI)
**Goal:** JS 번들 없이 서버에서 순수 HTML을 렌더링하고, 투표 기능을 위한 HTMX 뼈대를 잡는다.

1. **Worker `fetch` 라우터 구성**
   - `GET /`: `news` 테이블에서 Hacker News 알고리즘 (또는 최신순)으로 상위 50개 항목을 조회.
   - 템플릿 리터럴을 활용해 Brutalist 스타일의 HTML(텍스트 위주, 무채색, 기본 폰트)을 렌더링하여 Response 반환.
2. **HTMX 투표 버튼 UI 추가**
   - 리스트의 각 아이템에 투표 버튼 추가.
   - 속성: `hx-post="/vote/:news_id"`, `hx-target="#score-:news_id"`, `hx-swap="innerHTML"`.
3. **DESIGN color theme**
   - text: #2b2b2b
   - background: #f9e9da
   - secondary text: #4c393d
   - borders & dividers: #57352b
   - Accent & Interactive: #e5a657

**✅ Checkpoint 3:**
- 브라우저에서 `localhost:8787` 접속 시 투박한 디자인의 뉴스 리스트가 출력됨.
- 브라우저 네트워크 탭에서 무거운 JS 프레임워크가 로드되지 않는 것을 확인 (오직 `htmx.org` 스크립트만 로드).

---

## ⚙️ Phase 4: 상호작용 및 인증 기반 (Interactions & Auth)
**Goal:** HTMX 요청을 처리하여 DB를 업데이트하고, 임시 세션 관리를 적용한다.

1. **`POST /vote/:news_id` 엔드포인트 구현**
   - DB의 `votes` 테이블에 유저-뉴스 기록을 추가 (또는 토글).
   - 성공 시 `news` 테이블의 `upvotes`를 증가.
   - 업데이트된 새로운 점수(숫자)만 HTML String으로 반환 (HTMX가 화면을 교체하도록).
2. **간이 세션/유저 식별 (Mock Auth)**
   - 본격적인 OAuth 도입 전, 브라우저 쿠키에 임의의 `user_id`를 발급하여 중복 투표 방지 로직이 동작하는지 테스트.

**✅ Checkpoint 4:**
- 화면 새로고침 없이 투표 버튼 클릭 시 점수가 즉각적으로 올라감.
- 동일한 뉴스를 두 번 클릭했을 때 DB 제약 조건(UNIQUE)에 의해 막히거나 투표가 취소(Toggle)됨.

---

## 🚀 Phase 5: CI/CD 및 배포 (Cloudflare Deployment)
**Goal:** GitHub Actions를 통해 Cloudflare 프로덕션 환경에 자동 배포한다.

1. **프로덕션 환경 세팅**
   - Cloudflare 대시보드에서 D1 데이터베이스 생성.
   - `wrangler.toml`에 프로덕션 `database_id` 기입.
   - `wrangler d1 execute ... --remote`로 프로덕션 DB 스키마 생성.
2. **GitHub Actions Workflow (`.github/workflows/deploy.yml`)**
   - `main` 브랜치 Push 감지.
   - `cloudflare/wrangler-action`을 사용하여 자동 배포 파이프라인 구축.

**✅ Checkpoint 5:**
- GitHub 저장소 Push 후 Actions 통과 확인.
- `*.workers.dev` 주소로 접속하여 프로덕션 환경에서 정상 작동하는지 최종 테스트.