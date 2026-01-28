# Execution Checklist

Actionable task checklist for migrating Product Import Tool from UI-only MVP to production-ready system.

**How to Use This Checklist:**
- Work through phases sequentially (Phase 1 → Phase 2 → ...)
- Check off tasks as you complete them
- Run verification commands after each task
- Mark phase complete only when all acceptance criteria pass
- Update file paths if they differ from assumptions

---

## Current State Assumptions

Based on existing documentation, the app currently:

- **UI-only MVP**: No backend, no real APIs
- **State Management**: Zustand store (`lib/store.ts`) with localStorage persistence
- **Data**: Fake data generated via `lib/fake-data.ts` (deterministic)
- **Routes**: `/import` (dashboard), `/import/new` (search), `/import/new/[id]` (editor)
- **Product Statuses**: RAW → DRAFT → READY → PUSHED
- **No Authentication**: Single role (admin/reviewer), no auth guards
- **Storage**: localStorage key `product-import-store-v2`
- **Types**: Defined in `types/product.ts`
- **Available Scripts**: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npx tsc --noEmit`

---

## Phase 1: API Client & Types

**Duration:** 1 week  
**Priority:** Critical

### Tasks

- [ ] **Extract shared types to separate package/module**
  - **What:** Move `types/product.ts` to a shared location (e.g., `shared/types/product.ts` or keep in `types/` but ensure it matches API contract)
  - **Where:** `types/product.ts` → verify types match `docs/API_CONTRACT.md`
  - **Commands:** `npx tsc --noEmit` (verify no type errors)
  - **Acceptance:** Types compile, match API contract schema, no breaking changes in existing code

- [ ] **Create API client class structure**
  - **What:** Create `lib/api-client.ts` with class `ApiClient` and method stubs for all endpoints
  - **Where:** `lib/api-client.ts` (new file)
  - **Commands:** `npx tsc --noEmit` (verify class compiles)
  - **Acceptance:** File exists, class defined, methods match API contract endpoints

- [ ] **Implement `getProducts()` method**
  - **What:** Implement method to fetch products with filters (initially return mock data or call mock backend)
  - **Where:** `lib/api-client.ts`
  - **Commands:** `npm run build` (verify no build errors)
  - **Acceptance:** Method exists, accepts filters, returns `Promise<Product[]>`, handles errors

- [ ] **Implement `getProduct(id)` method**
  - **What:** Implement method to fetch single product by ID
  - **Where:** `lib/api-client.ts`
  - **Commands:** `npm run build`
  - **Acceptance:** Method exists, accepts `id: string`, returns `Promise<Product>`, handles 404

- [ ] **Implement `updateProduct(id, changes)` method**
  - **What:** Implement method to update product fields
  - **Where:** `lib/api-client.ts`
  - **Commands:** `npm run build`
  - **Acceptance:** Method exists, accepts `id` and `DraftChanges`, returns `Promise<Product>`, handles validation errors

- [ ] **Implement `updateProductStatus(id, status)` method**
  - **What:** Implement method to change product status
  - **Where:** `lib/api-client.ts`
  - **Commands:** `npm run build`
  - **Acceptance:** Method exists, accepts `id` and `ProductStatus`, returns `Promise<Product>`, handles invalid transitions

- [ ] **Implement `updateMultipleProductsStatus(ids, status)` method**
  - **What:** Implement bulk status update method
  - **Where:** `lib/api-client.ts`
  - **Commands:** `npm run build`
  - **Acceptance:** Method exists, accepts `ids: string[]` and `status`, returns `Promise<Product[]>`, handles partial failures

- [ ] **Implement `searchProducts(store, category, count)` method**
  - **What:** Implement method to trigger product search/import
  - **Where:** `lib/api-client.ts`
  - **Commands:** `npm run build`
  - **Acceptance:** Method exists, accepts store/category/count, returns `Promise<Product[]>`, handles errors

- [ ] **Implement `toggleVisibility(id)` method**
  - **What:** Implement method to toggle product visibility
  - **Where:** `lib/api-client.ts`
  - **Commands:** `npm run build`
  - **Acceptance:** Method exists, accepts `id`, returns `Promise<Product>`, toggles visibility field

- [ ] **Implement `runSourceCheck()` method**
  - **What:** Implement method to trigger source check for pushed products
  - **Where:** `lib/api-client.ts`
  - **Commands:** `npm run build`
  - **Acceptance:** Method exists, returns `Promise<SourceCheckResult>`, handles errors

- [ ] **Add loading state management to store**
  - **What:** Add `isLoading` and `error` states to Zustand store for API calls
  - **Where:** `lib/store.ts`
  - **Commands:** `npm run build`, `npx tsc --noEmit`
  - **Acceptance:** Store has loading/error state, components can access it

- [ ] **Add feature flag for API vs localStorage**
  - **What:** Add environment variable `NEXT_PUBLIC_USE_API` and conditional logic to use API client when enabled
  - **Where:** `lib/store.ts` (check env var, use API client or localStorage)
  - **Commands:** `npm run build`
  - **Acceptance:** App works with `NEXT_PUBLIC_USE_API=false` (localStorage) and `true` (API client)

- [ ] **Update store actions to use API client when flag enabled**
  - **What:** Modify `searchProducts`, `updateProduct`, `updateProductStatus`, etc. to call API client when flag is on
  - **Where:** `lib/store.ts`
  - **Commands:** `npm run build`, test with flag on/off
  - **Acceptance:** All store actions work with both localStorage and API (when mock backend available)

- [ ] **Add retry logic to API client**
  - **What:** Implement retry mechanism (3 retries with exponential backoff) for failed API calls
  - **Where:** `lib/api-client.ts`
  - **Commands:** `npm run build`
  - **Acceptance:** Failed requests retry automatically, errors logged after max retries

- [ ] **Implement optimistic updates in store**
  - **What:** Update UI immediately on API calls, rollback on error
  - **Where:** `lib/store.ts` (update state optimistically, revert on error)
  - **Commands:** `npm run build`
  - **Acceptance:** UI updates immediately, reverts if API call fails

### Phase 1 Acceptance Criteria

- [ ] All API client methods implemented and typed
- [ ] Store works with both localStorage (flag off) and API (flag on)
- [ ] UI remains functional with feature flag off (backward compatible)
- [ ] Loading states visible during API calls
- [ ] Error handling in place (toasts/errors displayed)
- [ ] TypeScript compiles without errors
- [ ] Build succeeds: `npm run build`
- [ ] Lint passes: `npm run lint`

---

## Phase 2: Database & Products Service

**Duration:** 2 weeks  
**Priority:** Critical

### Tasks

- [ ] **Provision PostgreSQL database instance**
  - **What:** Set up PostgreSQL database (local dev, staging, production)
  - **Where:** Infrastructure (AWS RDS, local Docker, etc.) - TBD after infrastructure decision
  - **Commands:** Database connection test: `psql $DATABASE_URL -c "SELECT version();"`
  - **Acceptance:** Database accessible, connection string works

- [ ] **Create database migration for products table**
  - **What:** Write SQL migration script to create `products` table per `docs/DATA_MODEL.md` schema
  - **Where:** `migrations/001_create_products_table.sql` (or use migration tool like Prisma/Drizzle)
  - **Commands:** Run migration, verify: `psql $DATABASE_URL -c "\d products"`
  - **Acceptance:** Table exists with all columns, constraints, indexes from schema

- [ ] **Set up database connection pooling**
  - **What:** Configure connection pool (e.g., pg-pool) with appropriate pool size
  - **Where:** Backend service (TBD: `server/db/pool.ts` or similar)
  - **Commands:** Test connection: backend health check endpoint
  - **Acceptance:** Pool configured, connections reused, no connection leaks

- [ ] **Create products service/controller**
  - **What:** Implement REST API endpoints for products (GET /api/products, GET /api/products/:id, etc.)
  - **Where:** Backend service (TBD: `server/routes/products.ts` or similar)
  - **Commands:** Test endpoints: `curl http://localhost:3001/api/products` (or test script)
  - **Acceptance:** All endpoints from `docs/API_CONTRACT.md` exist and return correct status codes

- [ ] **Implement GET /api/products endpoint**
  - **What:** List products with filters (status, store, search query, pagination)
  - **Where:** Backend service products route
  - **Commands:** Test: `curl "http://localhost:3001/api/products?status=PUSHED&limit=10"`
  - **Acceptance:** Returns products array, respects filters, supports pagination

- [ ] **Implement GET /api/products/:id endpoint**
  - **What:** Get single product by ID
  - **Where:** Backend service products route
  - **Commands:** Test: `curl "http://localhost:3001/api/products/product-id-123"`
  - **Acceptance:** Returns product, returns 404 if not found

- [ ] **Implement PATCH /api/products/:id endpoint**
  - **What:** Update product fields
  - **Where:** Backend service products route
  - **Commands:** Test: `curl -X PATCH "http://localhost:3001/api/products/product-id-123" -d '{"nameMn":"New Name"}'`
  - **Acceptance:** Updates product, returns updated product, validates input

- [ ] **Implement PATCH /api/products/:id/status endpoint**
  - **What:** Update product status
  - **Where:** Backend service products route
  - **Commands:** Test: `curl -X PATCH "http://localhost:3001/api/products/product-id-123/status" -d '{"status":"PUSHED"}'`
  - **Acceptance:** Updates status, validates state transitions, returns updated product

- [ ] **Implement POST /api/products/bulk-status endpoint**
  - **What:** Bulk update multiple products' status
  - **Where:** Backend service products route
  - **Commands:** Test: `curl -X POST "http://localhost:3001/api/products/bulk-status" -d '{"ids":["id1","id2"],"status":"DRAFT"}'`
  - **Acceptance:** Updates all products, returns results, handles partial failures

- [ ] **Implement PATCH /api/products/:id/visibility endpoint**
  - **What:** Toggle product visibility
  - **Where:** Backend service products route
  - **Commands:** Test: `curl -X PATCH "http://localhost:3001/api/products/product-id-123/visibility" -d '{"visibility":"hidden"}'`
  - **Acceptance:** Toggles visibility, returns updated product

- [ ] **Implement POST /api/import/search endpoint**
  - **What:** Trigger product search/import (initially returns mock data, later calls scraper)
  - **Where:** Backend service import route
  - **Commands:** Test: `curl -X POST "http://localhost:3001/api/import/search" -d '{"store":"gmarket","category":"Skincare","count":20}'`
  - **Acceptance:** Returns products array, matches request params

- [ ] **Implement POST /api/source-check endpoint**
  - **What:** Trigger source check for all pushed products
  - **Where:** Backend service source-check route
  - **Commands:** Test: `curl -X POST "http://localhost:3001/api/source-check"`
  - **Acceptance:** Returns check results summary, updates product flags

- [ ] **Add input validation middleware**
  - **What:** Validate all request bodies using Zod (or similar) per API contract
  - **Where:** Backend service middleware (TBD: `server/middleware/validation.ts`)
  - **Commands:** Test invalid request: `curl -X PATCH "http://localhost:3001/api/products/id" -d '{"priceMnt":-1}'` (should return 400)
  - **Acceptance:** Invalid inputs return 400 with error details, valid inputs pass through

- [ ] **Add audit logging for product changes**
  - **What:** Log all product updates (who, what, when) to audit table or log file
  - **Where:** Backend service (TBD: `server/middleware/audit.ts` or service layer)
  - **Commands:** Check logs after update: verify audit entry created
  - **Acceptance:** All product updates logged with timestamp, user (when auth added), changes

- [ ] **Create data migration script from localStorage**
  - **What:** Script to export localStorage data and import to database
  - **Where:** `scripts/migrate-localStorage-to-db.ts` (or similar)
  - **Commands:** Run script: `npm run migrate:localStorage`
  - **Acceptance:** All products from localStorage imported to database, data integrity verified

- [ ] **Update API client to use real backend URL**
  - **What:** Set `API_BASE_URL` environment variable and update API client base URL
  - **Where:** `lib/api-client.ts` (use `process.env.NEXT_PUBLIC_API_BASE_URL`)
  - **Commands:** Test: `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 npm run dev`, verify API calls work
  - **Acceptance:** API client calls real backend, not mock

### Phase 2 Acceptance Criteria

- [ ] Database schema deployed and matches `docs/DATA_MODEL.md`
- [ ] All products API endpoints working per `docs/API_CONTRACT.md`
- [ ] Input validation enforced on all endpoints
- [ ] Data migrated from localStorage to database
- [ ] API client connected to real backend
- [ ] Performance acceptable (<200ms p95 response time)
- [ ] Audit logging in place
- [ ] All endpoints return correct status codes and error formats

---

## Phase 3: Authentication & Authorization

**Duration:** 1 week  
**Priority:** High

### Tasks

- [ ] **Create users table migration**
  - **What:** Create database table for users (id, email, password_hash, role, created_at, etc.)
  - **Where:** `migrations/002_create_users_table.sql`
  - **Commands:** Run migration, verify: `psql $DATABASE_URL -c "\d users"`
  - **Acceptance:** Table exists with required columns, email unique constraint

- [ ] **Implement password hashing utility**
  - **What:** Create function to hash passwords using bcrypt (or similar)
  - **Where:** Backend service (TBD: `server/utils/password.ts`)
  - **Commands:** Test: hash password, verify hash matches
  - **Acceptance:** Passwords hashed securely, can verify passwords

- [ ] **Implement POST /api/auth/login endpoint**
  - **What:** Authenticate user, return JWT access token and refresh token
  - **Where:** Backend service auth route (TBD: `server/routes/auth.ts`)
  - **Commands:** Test: `curl -X POST "http://localhost:3001/api/auth/login" -d '{"email":"user@example.com","password":"pass"}'`
  - **Acceptance:** Returns tokens on valid credentials, returns 401 on invalid

- [ ] **Implement POST /api/auth/refresh endpoint**
  - **What:** Refresh access token using refresh token
  - **Where:** Backend service auth route
  - **Commands:** Test: `curl -X POST "http://localhost:3001/api/auth/refresh" -d '{"refreshToken":"..."}'`
  - **Acceptance:** Returns new access token, invalidates old refresh token

- [ ] **Implement JWT token generation**
  - **What:** Generate JWT tokens with user ID, role, expiration (15 min access, 7 days refresh)
  - **Where:** Backend service (TBD: `server/utils/jwt.ts`)
  - **Commands:** Test: generate token, verify payload
  - **Acceptance:** Tokens include required claims, expire correctly

- [ ] **Add authentication middleware**
  - **What:** Middleware to verify JWT token on protected routes
  - **Where:** Backend service (TBD: `server/middleware/auth.ts`)
  - **Commands:** Test: call protected endpoint without token (401), with token (200)
  - **Acceptance:** Unauthenticated requests rejected, authenticated requests pass through

- [ ] **Add RBAC middleware**
  - **What:** Middleware to check user role (admin vs reviewer) for route access
  - **Where:** Backend service (TBD: `server/middleware/rbac.ts`)
  - **Commands:** Test: reviewer accessing admin-only route (403), admin accessing (200)
  - **Acceptance:** Role-based access enforced, correct status codes returned

- [ ] **Protect all product endpoints with auth**
  - **What:** Add auth middleware to all product API routes
  - **Where:** Backend service products route
  - **Commands:** Test: all endpoints require valid token
  - **Acceptance:** Unauthenticated requests return 401

- [ ] **Enforce RBAC on admin-only endpoints**
  - **What:** Mark certain endpoints (e.g., bulk operations, source check) as admin-only
  - **Where:** Backend service routes
  - **Commands:** Test: reviewer accessing admin endpoint (403)
  - **Acceptance:** Admin-only endpoints return 403 for reviewers

- [ ] **Create login page in frontend**
  - **What:** Add `/login` route with email/password form
  - **Where:** `app/login/page.tsx` (new file)
  - **Commands:** `npm run build`, test login flow
  - **Acceptance:** Page exists, form submits, calls login API, stores tokens

- [ ] **Add auth context/provider in frontend**
  - **What:** Create React context to manage auth state (user, tokens, login/logout)
  - **Where:** `lib/auth-context.tsx` or `contexts/auth.tsx` (new file)
  - **Commands:** `npm run build`
  - **Acceptance:** Context provides user state, login/logout functions

- [ ] **Store tokens securely (HTTP-only cookies or secure storage)**
  - **What:** Store refresh token in HTTP-only cookie, access token in memory or secure storage
  - **Where:** Frontend auth context, backend sets cookies
  - **Commands:** Test: tokens not accessible via JavaScript (if HTTP-only)
  - **Acceptance:** Tokens stored securely, refresh token in HTTP-only cookie

- [ ] **Add route protection in frontend**
  - **What:** Protect `/import/*` routes, redirect to `/login` if not authenticated
  - **Where:** `app/import/**/page.tsx` or middleware (TBD: `middleware.ts`)
  - **Commands:** Test: access `/import` without login (redirects), with login (allows)
  - **Acceptance:** Protected routes require authentication

- [ ] **Implement token refresh on frontend**
  - **What:** Automatically refresh access token when expired using refresh token
  - **Where:** Frontend auth context or API client interceptor
  - **Commands:** Test: let token expire, verify auto-refresh
  - **Acceptance:** Tokens refreshed automatically, user stays logged in

- [ ] **Add logout functionality**
  - **What:** Logout button/action that clears tokens and redirects to login
  - **Where:** Frontend (dashboard or header component)
  - **Commands:** Test: click logout, verify tokens cleared, redirected
  - **Acceptance:** Logout clears tokens, redirects to login

### Phase 3 Acceptance Criteria

- [ ] Users can register/login
- [ ] JWT tokens generated and validated
- [ ] All API endpoints protected (require auth)
- [ ] RBAC enforced (admin vs reviewer permissions)
- [ ] Frontend login page works
- [ ] Protected routes redirect to login
- [ ] Tokens refresh automatically
- [ ] Logout works correctly
- [ ] Security best practices followed (password hashing, secure token storage)

---

## Phase 4: Drafts Service

**Duration:** 1 week  
**Priority:** Medium

### Tasks

- [ ] **Create drafts table migration**
  - **What:** Create `drafts` table with fields: id, product_id, changes (JSONB), created_by, created_at, updated_at
  - **Where:** `migrations/003_create_drafts_table.sql`
  - **Commands:** Run migration, verify: `psql $DATABASE_URL -c "\d drafts"`
  - **Acceptance:** Table exists with required columns, foreign key to products

- [ ] **Implement GET /api/drafts endpoint**
  - **What:** List drafts with filters (product_id, user, status)
  - **Where:** Backend service drafts route (TBD: `server/routes/drafts.ts`)
  - **Commands:** Test: `curl "http://localhost:3001/api/drafts?product_id=123"`
  - **Acceptance:** Returns drafts array, respects filters

- [ ] **Implement POST /api/drafts endpoint**
  - **What:** Create new draft for product
  - **Where:** Backend service drafts route
  - **Commands:** Test: `curl -X POST "http://localhost:3001/api/drafts" -d '{"product_id":"123","changes":{...}}'`
  - **Acceptance:** Creates draft, returns draft object

- [ ] **Implement PATCH /api/drafts/:id endpoint**
  - **What:** Update draft changes
  - **Where:** Backend service drafts route
  - **Commands:** Test: `curl -X PATCH "http://localhost:3001/api/drafts/draft-id" -d '{"changes":{...}}'`
  - **Acceptance:** Updates draft, returns updated draft

- [ ] **Implement draft versioning/history**
  - **What:** Store draft history (each save creates new version or timestamped entry)
  - **Where:** Backend service (TBD: `draft_versions` table or history field)
  - **Commands:** Test: save draft multiple times, verify history
  - **Acceptance:** Draft history viewable, shows all versions

- [ ] **Add auto-save functionality**
  - **What:** Automatically save draft every 30 seconds (or on field blur) while editing
  - **Where:** Frontend product editor (`app/import/new/[id]/page.tsx`)
  - **Commands:** Test: edit product, wait 30s, verify draft saved
  - **Acceptance:** Drafts auto-saved, no data loss on page close

- [ ] **Add draft indicator in UI**
  - **What:** Show "Draft" badge or indicator on products with unsaved drafts
  - **Where:** Frontend (product cards, editor page)
  - **Commands:** `npm run build`, verify UI shows indicator
  - **Acceptance:** Draft indicator visible when draft exists

- [ ] **Implement draft history view**
  - **What:** UI to view draft history (list of versions with timestamps)
  - **Where:** Frontend (TBD: `app/import/new/[id]/history` or modal)
  - **Commands:** `npm run build`
  - **Acceptance:** History viewable, can restore previous version

- [ ] **Handle draft conflicts (multiple users editing)**
  - **What:** Detect when draft updated by another user, show conflict resolution UI
  - **Where:** Frontend editor, backend returns conflict error
  - **Commands:** Test: two users edit same product, verify conflict handling
  - **Acceptance:** Conflicts detected, user can choose which version to keep

### Phase 4 Acceptance Criteria

- [ ] Drafts table created and migrations run
- [ ] Drafts API endpoints working
- [ ] Auto-save functional (saves every 30s or on blur)
- [ ] Draft history viewable
- [ ] Conflicts handled gracefully
- [ ] UI shows draft indicators

---

## Phase 5: Scraper Service

**Duration:** 3 weeks  
**Priority:** High

### Tasks

- [ ] **Choose scraping framework**
  - **What:** Decide on framework (Scrapy, Playwright, Puppeteer) based on store requirements
  - **Where:** Decision document (TBD: `docs/SCRAPER_DECISION.md`)
  - **Commands:** N/A (decision only)
  - **Acceptance:** Framework chosen, rationale documented

- [ ] **Set up job queue system**
  - **What:** Set up queue (Redis + Bull, AWS SQS, or similar) for scraping jobs
  - **Where:** Infrastructure (TBD: queue service configuration)
  - **Commands:** Test: enqueue job, verify job in queue
  - **Acceptance:** Queue operational, jobs can be enqueued

- [ ] **Implement Gmarket scraper**
  - **What:** Create scraper to parse Gmarket product pages (name, price, images, description)
  - **Where:** Scraper service (TBD: `scrapers/gmarket.py` or `scrapers/gmarket.ts`)
  - **Commands:** Test: run scraper on sample Gmarket URL, verify data extracted
  - **Acceptance:** Extracts all required fields, handles errors gracefully

- [ ] **Implement Olive Young scraper**
  - **What:** Create scraper for Olive Young product pages
  - **Where:** Scraper service (TBD: `scrapers/oliveyoung.py` or similar)
  - **Commands:** Test: run scraper on sample Olive Young URL
  - **Acceptance:** Extracts all required fields

- [ ] **Implement Auction scraper**
  - **What:** Create scraper for Auction product pages
  - **Where:** Scraper service (TBD: `scrapers/auction.py` or similar)
  - **Commands:** Test: run scraper on sample Auction URL
  - **Acceptance:** Extracts all required fields

- [ ] **Add rate limiting to scrapers**
  - **What:** Implement delays between requests, respect robots.txt, rotate IPs if needed
  - **Where:** Scraper service (rate limiting middleware or config)
  - **Commands:** Test: run scraper, verify delays between requests
  - **Acceptance:** Rate limits respected, no IP bans

- [ ] **Handle dynamic content (JavaScript rendering)**
  - **What:** Use headless browser (Playwright/Puppeteer) for stores requiring JS execution
  - **Where:** Scraper service (browser automation setup)
  - **Commands:** Test: scrape JS-rendered page, verify data extracted
  - **Acceptance:** Dynamic content scraped correctly

- [ ] **Implement error handling and retries**
  - **What:** Retry failed scrapes (3 retries with exponential backoff), log errors
  - **Where:** Scraper service (retry logic)
  - **Commands:** Test: simulate failure, verify retry
  - **Acceptance:** Failed scrapes retried, errors logged

- [ ] **Add job status tracking**
  - **What:** Track job status (pending, running, completed, failed) in database or queue
  - **Where:** Backend service (TBD: `jobs` table or queue status)
  - **Commands:** Test: check job status after enqueue
  - **Acceptance:** Job status queryable, updates correctly

- [ ] **Integrate scraper with import/search endpoint**
  - **What:** Update `POST /api/import/search` to enqueue scraping job instead of returning mock data
  - **Where:** Backend service import route
  - **Commands:** Test: call search endpoint, verify job enqueued
  - **Acceptance:** Search endpoint enqueues job, returns job ID

- [ ] **Add webhook/callback for job completion**
  - **What:** When scraping job completes, update products in database, notify frontend
  - **Where:** Scraper service (callback on completion)
  - **Commands:** Test: complete job, verify products updated
  - **Acceptance:** Products updated on job completion, frontend notified

- [ ] **Validate scraped data quality**
  - **What:** Validate scraped data (required fields present, price format correct, etc.)
  - **Where:** Scraper service (validation step)
  - **Commands:** Test: scrape product, verify validation passes/fails correctly
  - **Acceptance:** Invalid data rejected, valid data accepted

- [ ] **Handle missing fields gracefully**
  - **What:** If field missing (e.g., brand, description), set to null/empty, don't fail entire scrape
  - **Where:** Scraper service (field extraction logic)
  - **Commands:** Test: scrape product with missing fields, verify handled
  - **Acceptance:** Missing fields don't cause scrape failure

- [ ] **Add monitoring dashboard for scraper**
  - **What:** Dashboard showing job queue status, success/failure rates, recent jobs
  - **Where:** Backend admin dashboard or monitoring tool
  - **Commands:** Test: view dashboard, verify metrics accurate
  - **Acceptance:** Dashboard shows queue status, job metrics

### Phase 5 Acceptance Criteria

- [ ] Can scrape products from all three stores (Gmarket, Olive Young, Auction)
- [ ] Rate limits respected (no IP bans)
- [ ] 95%+ success rate on scraping
- [ ] Failed jobs retried automatically
- [ ] Job status trackable
- [ ] Scraped data validated before saving
- [ ] Monitoring dashboard operational

---

## Phase 6: Translation Pipeline

**Duration:** 2 weeks  
**Priority:** High

### Tasks

- [ ] **Choose translation provider**
  - **What:** Decide on provider (Google Translate, DeepL, Vertex AI) based on cost/quality
  - **Where:** Decision document (TBD: `docs/TRANSLATION_DECISION.md`)
  - **Commands:** N/A (decision only)
  - **Acceptance:** Provider chosen, API key obtained

- [ ] **Implement translation service client**
  - **What:** Create client to call translation API (translate Korean/English to Mongolian)
  - **Where:** Backend service (TBD: `server/services/translation.ts`)
  - **Commands:** Test: translate sample text, verify result
  - **Acceptance:** Client calls API, returns translated text

- [ ] **Add translation job queue**
  - **What:** Set up queue for translation jobs (separate from scraping queue or same queue)
  - **Where:** Queue service (TBD: `translation-queue` or existing queue)
  - **Commands:** Test: enqueue translation job
  - **Acceptance:** Jobs can be enqueued

- [ ] **Implement translation worker**
  - **What:** Worker that processes translation jobs (calls translation API, saves result)
  - **Where:** Backend service (TBD: `workers/translation-worker.ts`)
  - **Commands:** Test: process translation job, verify translation saved
  - **Acceptance:** Worker processes jobs, translations saved to database

- [ ] **Add translation caching**
  - **What:** Cache translations in database (reuse for similar product names/descriptions)
  - **Where:** Backend service (TBD: `translations` table or cache layer)
  - **Commands:** Test: translate same text twice, verify cache hit
  - **Acceptance:** Cached translations reused, reduces API calls

- [ ] **Auto-translate on product import**
  - **What:** When product scraped, automatically enqueue translation job for name/description
  - **Where:** Backend service (after scraping completes)
  - **Commands:** Test: import product, verify translation job enqueued
  - **Acceptance:** Translation jobs enqueued automatically

- [ ] **Handle translation failures gracefully**
  - **What:** If translation fails, mark product for manual review, don't block import
  - **Where:** Backend service (error handling)
  - **Commands:** Test: simulate translation failure, verify handled
  - **Acceptance:** Failures don't block import, products marked for review

- [ ] **Add manual translation override**
  - **What:** Allow users to manually edit translations in product editor
  - **Where:** Frontend product editor (already exists, verify works with API)
  - **Commands:** `npm run build`, test manual edit
  - **Acceptance:** Users can edit translations manually

- [ ] **Add translation quality review workflow**
  - **What:** UI to review and approve/reject translations (optional)
  - **Where:** Frontend (TBD: `app/import/translations` or similar)
  - **Commands:** `npm run build`
  - **Acceptance:** Review UI exists, can approve/reject translations

- [ ] **Implement batch translation**
  - **What:** Translate multiple products in batch (for efficiency)
  - **Where:** Backend service (batch job)
  - **Commands:** Test: batch translate 10 products
  - **Acceptance:** Batch translation works, all products translated

- [ ] **Add rate limit handling for translation API**
  - **What:** Handle API rate limits (queue jobs, retry with backoff)
  - **Where:** Translation service client
  - **Commands:** Test: exceed rate limit, verify handling
  - **Acceptance:** Rate limits handled, jobs retried

### Phase 6 Acceptance Criteria

- [ ] Products auto-translated on import
- [ ] Translation quality acceptable (manual review available)
- [ ] Failed translations handled (marked for review)
- [ ] Manual override available
- [ ] Caching reduces API costs
- [ ] Batch translation functional

---

## Phase 7: Currency Conversion

**Duration:** 1 week  
**Priority:** Medium

### Tasks

- [ ] **Choose currency API provider**
  - **What:** Decide on provider (ExchangeRate-API, Fixer.io, etc.) based on cost/accuracy
  - **Where:** Decision document (TBD: `docs/CURRENCY_DECISION.md`)
  - **Commands:** N/A (decision only)
  - **Acceptance:** Provider chosen, API key obtained

- [ ] **Implement currency service**
  - **What:** Create service to fetch KRW → MNT exchange rate and convert prices
  - **Where:** Backend service (TBD: `server/services/currency.ts`)
  - **Commands:** Test: convert 10000 KRW to MNT, verify result
  - **Acceptance:** Conversion accurate, handles API errors

- [ ] **Add exchange rate caching**
  - **What:** Cache exchange rates (update daily, use cached rate if API fails)
  - **Where:** Backend service (TBD: `exchange_rates` table or cache)
  - **Commands:** Test: fetch rate, verify cached, test API failure (uses cache)
  - **Acceptance:** Rates cached, fallback to cache on API failure

- [ ] **Auto-convert on product import**
  - **What:** When product imported, automatically convert priceKrw to priceMnt
  - **Where:** Backend service (after scraping, before saving product)
  - **Commands:** Test: import product, verify priceMnt calculated
  - **Acceptance:** Prices converted automatically

- [ ] **Add scheduled job to update rates daily**
  - **What:** Cron job or scheduled task to fetch latest exchange rate daily
  - **Where:** Backend service (TBD: cron job or queue scheduler)
  - **Commands:** Test: run job, verify rate updated
  - **Acceptance:** Rates updated daily automatically

- [ ] **Add manual override in UI**
  - **What:** Allow users to manually set priceMnt in product editor (override auto-conversion)
  - **Where:** Frontend product editor (already exists, verify works)
  - **Commands:** `npm run build`, test manual price edit
  - **Acceptance:** Users can override converted price

- [ ] **Recalculate prices on rate update**
  - **What:** When rate updates, optionally recalculate priceMnt for products (if not manually overridden)
  - **Where:** Backend service (after rate update job)
  - **Commands:** Test: update rate, verify prices recalculated (if enabled)
  - **Acceptance:** Prices recalculated when rate updates (optional feature)

### Phase 7 Acceptance Criteria

- [ ] Accurate currency conversions (KRW → MNT)
- [ ] Rates updated daily automatically
- [ ] Fallback to cached rate on API failure
- [ ] Manual override available
- [ ] Auto-conversion on import works

---

## Phase 8: Image Pipeline

**Duration:** 2 weeks  
**Priority:** High

### Tasks

- [ ] **Set up S3 bucket**
  - **What:** Create S3 bucket for product images, configure access policies
  - **Where:** AWS (or similar cloud storage) - TBD after infrastructure decision
  - **Commands:** Test: upload test file to S3, verify accessible
  - **Acceptance:** Bucket exists, upload/download works

- [ ] **Configure CDN (CloudFront or similar)**
  - **What:** Set up CDN in front of S3 for fast image delivery
  - **Where:** AWS CloudFront (or similar) - TBD
  - **Commands:** Test: access image via CDN URL, verify fast delivery
  - **Acceptance:** CDN operational, images served via CDN

- [ ] **Implement image download service**
  - **What:** Download images from source URLs (from scraped products)
  - **Where:** Backend service (TBD: `server/services/image-download.ts`)
  - **Commands:** Test: download image from URL, verify file saved
  - **Acceptance:** Images downloaded successfully

- [ ] **Implement image processing**
  - **What:** Resize images to standard sizes, optimize (compress), generate thumbnails
  - **Where:** Backend service (TBD: `server/services/image-process.ts`, use Sharp or similar)
  - **Commands:** Test: process image, verify resized/optimized versions created
  - **Acceptance:** Images resized, optimized, thumbnails generated

- [ ] **Implement S3 upload service**
  - **What:** Upload processed images to S3, return CDN URLs
  - **Where:** Backend service (TBD: `server/services/s3-upload.ts`)
  - **Commands:** Test: upload image to S3, verify URL returned
  - **Acceptance:** Images uploaded, URLs returned

- [ ] **Add image processing queue**
  - **What:** Set up queue for image processing jobs
  - **Where:** Queue service (TBD: `image-queue` or existing queue)
  - **Commands:** Test: enqueue image job
  - **Acceptance:** Jobs can be enqueued

- [ ] **Implement image processing worker**
  - **What:** Worker that downloads, processes, and uploads images
  - **Where:** Backend service (TBD: `workers/image-worker.ts`)
  - **Commands:** Test: process image job, verify image in S3
  - **Acceptance:** Worker processes jobs, images in S3

- [ ] **Auto-process images on product import**
  - **What:** When product imported, enqueue image processing jobs for all product images
  - **Where:** Backend service (after scraping completes)
  - **Commands:** Test: import product, verify image jobs enqueued
  - **Acceptance:** Image jobs enqueued automatically

- [ ] **Add progress tracking for image processing**
  - **What:** Track job progress (downloading, processing, uploading) and update product imagesFinal field
  - **Where:** Backend service (update product as images processed)
  - **Commands:** Test: process images, verify progress tracked
  - **Acceptance:** Progress trackable, product updated when complete

- [ ] **Add image validation**
  - **What:** Validate image format, size, dimensions before processing
  - **Where:** Backend service (validation step)
  - **Commands:** Test: upload invalid image, verify rejected
  - **Acceptance:** Invalid images rejected, valid images processed

- [ ] **Handle image processing failures**
  - **What:** Retry failed image downloads/processing, log errors, mark product if all images fail
  - **Where:** Backend service (error handling)
  - **Commands:** Test: simulate failure, verify retry
  - **Acceptance:** Failures retried, errors logged

- [ ] **Update UI to show image upload progress**
  - **What:** Show progress indicator in product editor when images processing
  - **Where:** Frontend product editor (`app/import/new/[id]/page.tsx`)
  - **Commands:** `npm run build`, test progress display
  - **Acceptance:** Progress visible in UI

- [ ] **Update UI to display S3/CDN image URLs**
  - **What:** Show images from CDN URLs in product cards and editor
  - **Where:** Frontend (product cards, editor)
  - **Commands:** `npm run build`, verify images load from CDN
  - **Acceptance:** Images load from CDN URLs

### Phase 8 Acceptance Criteria

- [ ] Images downloaded from source URLs
- [ ] Images processed (resized, optimized, thumbnails)
- [ ] Images uploaded to S3
- [ ] CDN serving images
- [ ] Progress trackable in UI
- [ ] Failures handled gracefully

---

## Phase 9: Source Check Job

**Duration:** 2 weeks  
**Priority:** Medium

### Tasks

- [ ] **Set up scheduled job system**
  - **What:** Configure cron job or queue scheduler to run daily
  - **Where:** Infrastructure (TBD: cron, AWS EventBridge, or queue scheduler)
  - **Commands:** Test: trigger job manually, verify runs
  - **Acceptance:** Job can be scheduled and triggered

- [ ] **Implement source check scraper**
  - **What:** Scraper to check current price and stock status on source websites for PUSHED products
  - **Where:** Scraper service (TBD: `scrapers/source-check.ts` or reuse existing scrapers)
  - **Commands:** Test: check source for sample product, verify price/stock extracted
  - **Acceptance:** Price and stock status extracted correctly

- [ ] **Implement change detection logic**
  - **What:** Compare current price/stock with baseline, update flags (sourcePriceChanged, sourceOutOfStock)
  - **Where:** Backend service (TBD: `server/services/source-check.ts`)
  - **Commands:** Test: detect price change, verify flags updated
  - **Acceptance:** Changes detected, flags updated correctly

- [ ] **Update product flags on change detection**
  - **What:** Update sourcePriceChanged, sourceOutOfStock, sourceLastCheckedAt fields in database
  - **Where:** Backend service (update products table)
  - **Commands:** Test: run check, verify flags updated in database
  - **Acceptance:** Flags updated in database

- [ ] **Add change history tracking**
  - **What:** Store history of price/stock changes (optional: `product_changes` table)
  - **Where:** Backend service (TBD: `product_changes` table or log)
  - **Commands:** Test: track multiple changes, verify history
  - **Acceptance:** Change history viewable

- [ ] **Implement notification system**
  - **What:** Send email/Slack notifications when price changes or product out of stock
  - **Where:** Backend service (TBD: `server/services/notifications.ts`)
  - **Commands:** Test: trigger notification, verify sent
  - **Acceptance:** Notifications sent on changes

- [ ] **Add configurable thresholds**
  - **What:** Only notify if price change exceeds threshold (e.g., >5%) or product out of stock
  - **Where:** Backend service (config or database settings)
  - **Commands:** Test: small change (no notification), large change (notification)
  - **Acceptance:** Thresholds respected

- [ ] **Update UI to show check status**
  - **What:** Show "Last checked: X hours ago" and change badges in dashboard
  - **Where:** Frontend dashboard (`app/import/page.tsx`)
  - **Commands:** `npm run build`, verify status displayed
  - **Acceptance:** Check status visible in UI

- [ ] **Add manual trigger for source check**
  - **What:** Allow users to manually trigger source check from dashboard (already exists, verify works with API)
  - **Where:** Frontend dashboard (button calls API)
  - **Commands:** `npm run build`, test manual trigger
  - **Acceptance:** Manual trigger works

- [ ] **Handle rate limiting for source checks**
  - **What:** Rate limit checks per store to avoid IP bans
  - **Where:** Scraper service (rate limiting)
  - **Commands:** Test: run checks, verify rate limits respected
  - **Acceptance:** Rate limits respected, no IP bans

### Phase 9 Acceptance Criteria

- [ ] Job runs daily (or on schedule)
- [ ] Changes detected accurately (price, stock)
- [ ] Product flags updated
- [ ] Notifications sent on significant changes
- [ ] Change history trackable
- [ ] UI shows check status and badges

---

## Phase 10: Storefront Integration

**Duration:** 2 weeks  
**Priority:** Medium

### Tasks

- [ ] **Get storefront API credentials**
  - **What:** Obtain API credentials and documentation for storefront system
  - **Where:** External (storefront team/docs) - TBD
  - **Commands:** N/A (setup only)
  - **Acceptance:** Credentials obtained, API documented

- [ ] **Implement storefront API client**
  - **What:** Create client to call storefront API (create/update products, manage visibility)
  - **Where:** Backend service (TBD: `server/services/storefront-client.ts`)
  - **Commands:** Test: call storefront API, verify connection
  - **Acceptance:** Client connects to storefront API

- [ ] **Implement product sync on push**
  - **What:** When product status changes to PUSHED, sync to storefront (create/update product)
  - **Where:** Backend service (after status update to PUSHED)
  - **Commands:** Test: push product, verify synced to storefront
  - **Acceptance:** Products synced on push

- [ ] **Handle sync conflicts**
  - **What:** If product exists in storefront, handle update vs create logic
  - **Where:** Backend service (sync logic)
  - **Commands:** Test: push product that exists, verify handled
  - **Acceptance:** Conflicts resolved correctly

- [ ] **Implement visibility sync**
  - **What:** When product visibility toggled, update in storefront immediately
  - **Where:** Backend service (on visibility toggle)
  - **Commands:** Test: toggle visibility, verify storefront updated
  - **Acceptance:** Visibility synced immediately

- [ ] **Add retry logic for failed syncs**
  - **What:** Retry failed storefront API calls (3 retries with exponential backoff)
  - **Where:** Backend service (retry logic)
  - **Commands:** Test: simulate failure, verify retry
  - **Acceptance:** Failed syncs retried

- [ ] **Add sync status tracking**
  - **What:** Track sync status (synced, failed, pending) in database or product metadata
  - **Where:** Backend service (TBD: `product_sync_status` field or table)
  - **Commands:** Test: check sync status after push
  - **Acceptance:** Sync status queryable

- [ ] **Implement webhook for storefront updates**
  - **What:** If storefront sends webhook on product update, handle it (optional)
  - **Where:** Backend service (TBD: webhook endpoint)
  - **Commands:** Test: receive webhook, verify handled
  - **Acceptance:** Webhooks processed (if implemented)

- [ ] **Add sync status dashboard**
  - **What:** UI to view sync status for products (synced, failed, last synced time)
  - **Where:** Frontend (TBD: `app/import/sync-status` or dashboard section)
  - **Commands:** `npm run build`
  - **Acceptance:** Sync status visible in UI

- [ ] **Add manual sync trigger**
  - **What:** Allow users to manually trigger sync for product
  - **Where:** Frontend (button in product editor or dashboard)
  - **Commands:** `npm run build`, test manual sync
  - **Acceptance:** Manual sync works

### Phase 10 Acceptance Criteria

- [ ] Products sync to storefront on push
- [ ] Visibility changes synced immediately
- [ ] Sync conflicts resolved
- [ ] Failed syncs retried
- [ ] Sync status trackable
- [ ] UI shows sync status

---

## General Tasks (Apply to All Phases)

- [ ] **Write unit tests for new code**
  - **What:** Add unit tests for new functions/services (minimum 60% coverage)
  - **Where:** Test files (TBD: `__tests__/` or `*.test.ts`)
  - **Commands:** Run tests: `npm test` (if test script exists) or test framework command
  - **Acceptance:** Tests pass, coverage meets target

- [ ] **Update API documentation**
  - **What:** Update `docs/API_CONTRACT.md` if endpoints change
  - **Where:** `docs/API_CONTRACT.md`
  - **Commands:** N/A (documentation update)
  - **Acceptance:** API docs accurate

- [ ] **Update architecture documentation**
  - **What:** Update `docs/ARCHITECTURE.md` if system design changes
  - **Where:** `docs/ARCHITECTURE.md`
  - **Commands:** N/A (documentation update)
  - **Acceptance:** Architecture docs accurate

- [ ] **Deploy to staging environment**
  - **What:** Deploy changes to staging, run smoke tests
  - **Where:** Staging environment (TBD: staging URL)
  - **Commands:** Deploy script or CI/CD pipeline
  - **Acceptance:** Staging deployment successful, smoke tests pass

- [ ] **Run integration tests**
  - **What:** Run integration tests for new features
  - **Where:** Test suite (TBD: `tests/integration/`)
  - **Commands:** Run integration tests
  - **Acceptance:** Integration tests pass

---

## Completion Checklist

- [ ] All 10 phases completed
- [ ] All acceptance criteria met
- [ ] Performance targets met (<200ms p95 API response)
- [ ] Security audit passed
- [ ] User acceptance testing completed
- [ ] Documentation updated
- [ ] Production deployment successful
- [ ] Monitoring and alerting operational

---

**Last Updated:** 2024  
**Status:** Ready for execution

