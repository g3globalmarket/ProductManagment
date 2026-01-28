# Production Plan

Step-by-step migration plan from UI-only MVP to production-ready system.

## Table of Contents

- [Overview](#overview)
- [Phase 1: API Client & Types](#phase-1-api-client--types)
- [Phase 2: Database & Products Service](#phase-2-database--products-service)
- [Phase 3: Authentication & Authorization](#phase-3-authentication--authorization)
- [Phase 4: Drafts Service](#phase-4-drafts-service)
- [Phase 5: Scraper Service](#phase-5-scraper-service)
- [Phase 6: Translation Pipeline](#phase-6-translation-pipeline)
- [Phase 7: Currency Conversion](#phase-7-currency-conversion)
- [Phase 8: Image Pipeline](#phase-8-image-pipeline)
- [Phase 9: Source Check Job](#phase-9-source-check-job)
- [Phase 10: Storefront Integration](#phase-10-storefront-integration)

---

## Overview

**Goal:** Transform UI-only MVP into production system with backend, database, and real data processing.

**Timeline:** 8-12 weeks (depending on team size)

**Approach:** Incremental migration, maintaining UI functionality at each phase.

---

## Phase 1: API Client & Types

**Duration:** 1 week  
**Priority:** Critical

### Objectives

- Extract shared types to package
- Create API client layer
- Replace Zustand store with API calls
- Maintain UI functionality

### Tasks

1. **Extract Types**
   - Move `types/product.ts` to shared package
   - Ensure types match API contract
   - Generate TypeScript types from API schema (OpenAPI)

2. **Create API Client**
   ```typescript
   // lib/api-client.ts
   class ApiClient {
     async getProducts(filters): Promise<Product[]>
     async getProduct(id): Promise<Product>
     async updateProduct(id, changes): Promise<Product>
     async updateProductStatus(id, status): Promise<Product>
     // ... etc
   }
   ```

3. **Update Store**
   - Replace localStorage with API calls
   - Add loading/error states
   - Implement optimistic updates
   - Add retry logic

4. **Backward Compatibility**
   - Keep localStorage as fallback
   - Migrate existing data to backend

### Deliverables

- [ ] Shared types package
- [ ] API client library
- [ ] Updated store with API integration
- [ ] Migration script for localStorage data

### Acceptance Criteria

- UI works with API (mock backend initially)
- All existing features functional
- Error handling in place
- Loading states implemented

### Risks

- Breaking changes in UI
- Performance degradation
- **Mitigation:** Feature flags, gradual rollout

---

## Phase 2: Database & Products Service

**Duration:** 2 weeks  
**Priority:** Critical

### Objectives

- Set up PostgreSQL database
- Create products service
- Implement CRUD operations
- Add data validation

### Tasks

1. **Database Setup**
   - Provision PostgreSQL instance
   - Run migrations (see DATA_MODEL.md)
   - Set up connection pooling
   - Configure backups

2. **Products Service**
   - Implement REST API endpoints
   - Add validation middleware
   - Implement pagination/filtering
   - Add audit logging

3. **Data Migration**
   - Export from localStorage
   - Import to database
   - Verify data integrity

### Deliverables

- [ ] Database schema deployed
- [ ] Products API endpoints
- [ ] Data migration completed
- [ ] API documentation updated

### Acceptance Criteria

- All products API endpoints working
- Data migrated successfully
- Performance acceptable (<200ms p95)
- Validation rules enforced

### Risks

- Data loss during migration
- Performance issues
- **Mitigation:** Backup before migration, load testing

---

## Phase 3: Authentication & Authorization

**Duration:** 1 week  
**Priority:** High

### Objectives

- Implement user authentication
- Add role-based access control (RBAC)
- Secure API endpoints
- Add session management

### Tasks

1. **User Management**
   - User registration/login
   - Password hashing (bcrypt)
   - JWT token generation
   - Refresh token mechanism

2. **RBAC**
   - Roles: `admin`, `reviewer`
   - Permissions per role
   - Middleware for route protection

3. **Frontend Integration**
   - Add login page
   - Store tokens securely
   - Add auth context
   - Protect routes

### Deliverables

- [ ] Auth API endpoints
- [ ] RBAC implementation
- [ ] Frontend auth flow
- [ ] Session management

### Acceptance Criteria

- Users can log in/out
- Routes protected by role
- Tokens refresh automatically
- Security best practices followed

### Risks

- Security vulnerabilities
- **Mitigation:** Security audit, penetration testing

---

## Phase 4: Drafts Service

**Duration:** 1 week  
**Priority:** Medium

### Objectives

- Separate draft management
- Add draft history/versioning
- Improve collaboration

### Tasks

1. **Drafts Table**
   - Schema design
   - Migration script
   - Indexes for performance

2. **Drafts API**
   - CRUD endpoints
   - Version history
   - Auto-save functionality

3. **UI Updates**
   - Draft indicator
   - Draft history view
   - Conflict resolution

### Deliverables

- [ ] Drafts database table
- [ ] Drafts API endpoints
- [ ] UI draft management
- [ ] Version history

### Acceptance Criteria

- Drafts saved automatically
- History viewable
- Conflicts handled gracefully

---

## Phase 5: Scraper Service

**Duration:** 3 weeks  
**Priority:** High

### Objectives

- Scrape products from store websites
- Handle rate limiting
- Parse product data
- Queue-based processing

### Tasks

1. **Scraper Implementation**
   - Choose framework (Scrapy/Playwright)
   - Implement parsers per store
   - Handle dynamic content
   - Error handling and retries

2. **Queue Integration**
   - Job queue setup
   - Worker deployment
   - Job status tracking
   - Failure handling

3. **Rate Limiting**
   - Respect robots.txt
   - Implement delays
   - Rotate IPs/proxies if needed
   - Monitor request rates

4. **Data Quality**
   - Validation of scraped data
   - Handle missing fields
   - Data cleaning/normalization

### Deliverables

- [ ] Scraper service deployed
- [ ] Queue system operational
- [ ] Parsers for all stores
- [ ] Monitoring dashboard

### Acceptance Criteria

- Can scrape products from all stores
- Rate limits respected
- 95%+ success rate
- Failed jobs retried automatically

### Risks

- Store website changes break scrapers
- Legal/compliance issues
- **Mitigation:** Versioned parsers, legal review, terms of service compliance

---

## Phase 6: Translation Pipeline

**Duration:** 2 weeks  
**Priority:** High

### Objectives

- Automate translation of product names/descriptions
- Support multiple translation providers
- Cache translations
- Handle failures gracefully

### Tasks

1. **Translation Service**
   - Choose provider (Google/DeepL/Vertex)
   - Implement translation API client
   - Add retry logic
   - Rate limit handling

2. **Queue Integration**
   - Translation job queue
   - Worker deployment
   - Batch processing
   - Priority queue for urgent translations

3. **Caching**
   - Cache translations in database
   - Reuse for similar products
   - Cache invalidation strategy

4. **Quality Control**
   - Manual review workflow
   - Translation quality metrics
   - Fallback to manual translation

### Deliverables

- [ ] Translation service
- [ ] Queue integration
- [ ] Caching layer
- [ ] Quality review UI

### Acceptance Criteria

- Products auto-translated on import
- Translation quality acceptable
- Failed translations handled
- Manual override available

### Risks

- Translation quality issues
- API costs
- **Mitigation:** Quality review, cost monitoring, fallback options

---

## Phase 7: Currency Conversion

**Duration:** 1 week  
**Priority:** Medium

### Objectives

- Real-time currency conversion (KRW → MNT)
- Cache exchange rates
- Handle API failures

### Tasks

1. **Currency Service**
   - Choose API (ExchangeRate-API/Fixer)
   - Implement conversion logic
   - Add caching (update daily)
   - Fallback rates

2. **Integration**
   - Update products on import
   - Recalculate on rate updates
   - Manual override capability

### Deliverables

- [ ] Currency service
- [ ] Rate caching
- [ ] Auto-conversion on import
- [ ] Manual override UI

### Acceptance Criteria

- Accurate conversions
- Rates updated daily
- Fallback on API failure
- Manual override works

---

## Phase 8: Image Pipeline

**Duration:** 2 weeks  
**Priority:** High

### Objectives

- Download images from source URLs
- Process and optimize images
- Upload to S3
- Generate thumbnails

### Tasks

1. **Image Service**
   - Download from URLs
   - Validate format/size
   - Resize and optimize
   - Generate thumbnails

2. **S3 Integration**
   - S3 bucket setup
   - Upload logic
   - CDN configuration (CloudFront)
   - Access control

3. **Queue Integration**
   - Image processing queue
   - Worker deployment
   - Progress tracking
   - Failure handling

4. **UI Updates**
   - Show upload progress
   - Display S3 URLs
   - Image preview/management

### Deliverables

- [ ] Image processing service
- [ ] S3 buckets configured
- [ ] CDN setup
- [ ] UI image management

### Acceptance Criteria

- Images downloaded and processed
- Uploaded to S3 successfully
- CDN serving images
- UI shows progress

### Risks

- Large image files
- Storage costs
- **Mitigation:** Compression, lifecycle policies, cost monitoring

---

## Phase 9: Source Check Job

**Duration:** 2 weeks  
**Priority:** Medium

### Objectives

- Scheduled job to check source websites
- Detect price/stock changes
- Send notifications
- Update product flags

### Tasks

1. **Scheduled Job**
   - Cron job or queue scheduler
   - Daily execution
   - Process all PUSHED products
   - Handle failures

2. **Change Detection**
   - Compare prices
   - Check stock status
   - Update flags
   - Record history

3. **Notifications**
   - Email alerts
   - Slack integration
   - In-app notifications
   - Configurable thresholds

4. **UI Updates**
   - Show check status
   - Display change history
   - Filter by flags

### Deliverables

- [ ] Scheduled job
- [ ] Change detection logic
- [ ] Notification system
- [ ] History tracking

### Acceptance Criteria

- Job runs daily
- Changes detected accurately
- Notifications sent
- History viewable

---

## Phase 10: Storefront Integration

**Duration:** 2 weeks  
**Priority:** Medium

### Objectives

- Sync products to storefront
- Handle visibility changes
- Real-time updates
- Storefront API integration

### Tasks

1. **Sync Service**
   - Storefront API client
   - Product sync logic
   - Handle conflicts
   - Retry on failure

2. **Event-Driven Updates**
   - Webhook on product push
   - Real-time sync
   - Batch updates
   - Status tracking

3. **Visibility Management**
   - Hide/unhide sync
   - Immediate effect
   - Audit logging

### Deliverables

- [ ] Storefront sync service
- [ ] Real-time updates
- [ ] Visibility sync
- [ ] Status dashboard

### Acceptance Criteria

- Products sync on push
- Visibility changes immediate
- Conflicts resolved
- Status trackable

---

## Migration Checklist

### Pre-Migration

- [ ] Backup all localStorage data
- [ ] Document current behavior
- [ ] Set up staging environment
- [ ] Create rollback plan

### During Migration

- [ ] Phase 1: API client (Week 1)
- [ ] Phase 2: Database (Weeks 2-3)
- [ ] Phase 3: Auth (Week 4)
- [ ] Phase 4: Drafts (Week 5)
- [ ] Phase 5: Scraper (Weeks 6-8)
- [ ] Phase 6: Translation (Weeks 9-10)
- [ ] Phase 7: Currency (Week 11)
- [ ] Phase 8: Images (Weeks 12-13)
- [ ] Phase 9: Source Check (Weeks 14-15)
- [ ] Phase 10: Storefront (Weeks 16-17)

### Post-Migration

- [ ] Performance testing
- [ ] Security audit
- [ ] User acceptance testing
- [ ] Documentation update
- [ ] Training materials

---

## Risk Mitigation

### Technical Risks

1. **Data Loss**
   - Mitigation: Regular backups, migration scripts with validation

2. **Performance Issues**
   - Mitigation: Load testing, caching, database optimization

3. **Service Failures**
   - Mitigation: Retry logic, fallbacks, monitoring

### Business Risks

1. **Timeline Delays**
   - Mitigation: Phased approach, MVP for each phase

2. **Cost Overruns**
   - Mitigation: Cost monitoring, budget alerts

3. **Legal/Compliance**
   - Mitigation: Legal review, terms of service compliance

---

## Success Metrics

- **Functionality:** All MVP features working in production
- **Performance:** <200ms API response time (p95)
- **Reliability:** 99.9% uptime
- **Data Quality:** <1% error rate in scraping
- **User Satisfaction:** Positive feedback from reviewers

---

## File Reference

- Current Implementation: `lib/store.ts`
- Types: `types/product.ts`
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- API Contract: [API_CONTRACT.md](./API_CONTRACT.md)

