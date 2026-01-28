# Roadmap

Prioritized feature backlog and development roadmap.

## Table of Contents

- [Current Status (MVP)](#current-status-mvp)
- [MVP2 - Production Foundation](#mvp2---production-foundation)
- [MVP3 - Advanced Features](#mvp3---advanced-features)
- [Future Enhancements](#future-enhancements)
- [Metrics & Success Criteria](#metrics--success-criteria)

---

## Current Status (MVP)

**Version:** 1.0 (UI-Only MVP)  
**Status:** ✅ Complete

### Features Delivered

- ✅ Dashboard with summary cards
- ✅ Products in database table
- ✅ Import search (fake data)
- ✅ Product editor with validation
- ✅ Status workflow (RAW → DRAFT → READY → PUSHED)
- ✅ Bulk actions
- ✅ Source check simulation
- ✅ Visibility toggle
- ✅ LocalStorage persistence

### Limitations

- ❌ No backend API
- ❌ No real scraping
- ❌ No translation
- ❌ No currency conversion
- ❌ No authentication
- ❌ No image processing

---

## MVP2 - Production Foundation

**Timeline:** 8-12 weeks  
**Priority:** Must-Have

### Phase 1: Backend API (Weeks 1-4)

**Goal:** Replace localStorage with real API

**Features:**
- [ ] REST API server
- [ ] PostgreSQL database
- [ ] Products CRUD endpoints
- [ ] Authentication & authorization
- [ ] API client in frontend
- [ ] Data migration from localStorage

**Success Criteria:**
- All UI features work with API
- Performance acceptable (<200ms p95)
- Zero data loss during migration

### Phase 2: Scraping (Weeks 5-7)

**Goal:** Real product scraping from stores

**Features:**
- [ ] Scraper service (Python/Node.js)
- [ ] Parsers for Gmarket, Olive Young, Auction
- [ ] Job queue system
- [ ] Rate limiting & retries
- [ ] Error handling

**Success Criteria:**
- 95%+ scraping success rate
- Respects rate limits
- Handles website changes gracefully

### Phase 3: Translation (Weeks 8-9)

**Goal:** Automated translation pipeline

**Features:**
- [ ] Translation service integration
- [ ] Queue-based processing
- [ ] Translation caching
- [ ] Manual review workflow

**Success Criteria:**
- Products auto-translated on import
- Translation quality acceptable
- Manual override available

### Phase 4: Image Pipeline (Weeks 10-11)

**Goal:** Download, process, and store images

**Features:**
- [ ] Image download service
- [ ] Image optimization
- [ ] S3 upload
- [ ] CDN integration
- [ ] Thumbnail generation

**Success Criteria:**
- Images processed and stored
- CDN serving images
- UI shows upload progress

### Phase 5: Source Check (Week 12)

**Goal:** Real source website monitoring

**Features:**
- [ ] Scheduled source check job
- [ ] Price/stock change detection
- [ ] Notification system
- [ ] Change history

**Success Criteria:**
- Daily source checks running
- Changes detected accurately
- Notifications sent

---

## MVP3 - Advanced Features

**Timeline:** 4-6 weeks after MVP2  
**Priority:** High

### Features

1. **Advanced Filtering**
   - [ ] Price range filter
   - [ ] Date range filter
   - [ ] Multi-store filter
   - [ ] Saved filter presets

2. **Bulk Editing**
   - [ ] Edit multiple products at once
   - [ ] Apply changes to selected
   - [ ] Template-based editing

3. **Product Comparison**
   - [ ] Side-by-side comparison
   - [ ] Diff highlighting
   - [ ] Version history

4. **Analytics Dashboard**
   - [ ] Import statistics
   - [ ] Review time metrics
   - [ ] Status distribution charts
   - [ ] Source check accuracy

5. **Export/Import**
   - [ ] Export products to CSV/JSON
   - [ ] Import from file
   - [ ] Backup/restore functionality

6. **Search Improvements**
   - [ ] Full-text search
   - [ ] Search highlighting
   - [ ] Search history
   - [ ] Advanced search operators

---

## Future Enhancements

**Timeline:** Ongoing  
**Priority:** Nice-to-Have

### User Experience

1. **Keyboard Navigation**
   - [ ] Arrow keys for product cards
   - [ ] Quick actions (keyboard shortcuts)
   - [ ] Command palette

2. **Undo/Redo**
   - [ ] Undo last action
   - [ ] Redo support
   - [ ] Action history

3. **Product Templates**
   - [ ] Save common edits as templates
   - [ ] Apply template to products
   - [ ] Template library

4. **Collaboration**
   - [ ] Comments on products
   - [ ] @mentions
   - [ ] Activity feed

### Automation

1. **Auto-Translation**
   - [ ] ML-based quality scoring
   - [ ] Auto-approve high-quality translations
   - [ ] Translation suggestions

2. **Smart Categorization**
   - [ ] Auto-categorize products
   - [ ] Category suggestions
   - [ ] ML-based classification

3. **Price Optimization**
   - [ ] Competitor price analysis
   - [ ] Price recommendation
   - [ ] Margin calculations

### Integration

1. **Storefront Sync**
   - [ ] Real-time sync
   - [ ] Webhook integration
   - [ ] Conflict resolution

2. **Inventory Management**
   - [ ] Stock tracking
   - [ ] Low stock alerts
   - [ ] Reorder points

3. **Analytics Integration**
   - [ ] Google Analytics
   - [ ] Custom event tracking
   - [ ] Conversion tracking

### Mobile

1. **Mobile App**
   - [ ] React Native app
   - [ ] Push notifications
   - [ ] Offline support

2. **Mobile Web**
   - [ ] Responsive improvements
   - [ ] Touch gestures
   - [ ] Mobile-optimized UI

---

## Metrics & Success Criteria

### Key Metrics

#### Business Metrics

1. **Import Success Rate**
   - Target: >95%
   - Measure: Successful imports / Total imports

2. **Review Time**
   - Target: <5 minutes per product
   - Measure: Average time from import to push

3. **Translation Quality**
   - Target: >90% acceptable
   - Measure: Manual review approval rate

4. **Source Check Accuracy**
   - Target: >98%
   - Measure: Verified price/stock changes

#### Technical Metrics

1. **API Performance**
   - Target: <200ms p95
   - Measure: Response time distribution

2. **Uptime**
   - Target: 99.9%
   - Measure: Service availability

3. **Error Rate**
   - Target: <1%
   - Measure: Failed requests / Total requests

4. **Job Success Rate**
   - Target: >95%
   - Measure: Successful jobs / Total jobs

### Success Criteria by Phase

#### MVP2 Success

- [ ] All MVP features working in production
- [ ] Real scraping operational
- [ ] Translation pipeline working
- [ ] Images processed and stored
- [ ] Source checks running daily
- [ ] Performance targets met
- [ ] Zero critical bugs

#### MVP3 Success

- [ ] Advanced filtering implemented
- [ ] Bulk editing functional
- [ ] Analytics dashboard operational
- [ ] User satisfaction >4/5
- [ ] Review time <5 minutes

---

## Prioritization Framework

### Must-Have (P0)

- Backend API
- Database
- Authentication
- Real scraping
- Translation
- Image pipeline

### High Priority (P1)

- Source check job
- Advanced filtering
- Bulk editing
- Analytics dashboard
- Export/import

### Medium Priority (P2)

- Product comparison
- Search improvements
- Keyboard navigation
- Undo/redo
- Templates

### Low Priority (P3)

- Mobile app
- Collaboration features
- ML features
- Advanced analytics

---

## Release Schedule

### Q1 2024
- ✅ MVP (UI-only) - Complete
- 🚧 MVP2 Phase 1-2 (Backend + Scraping) - In Progress

### Q2 2024
- 📅 MVP2 Phase 3-5 (Translation, Images, Source Check)
- 📅 MVP2 Complete

### Q3 2024
- 📅 MVP3 (Advanced Features)

### Q4 2024
- 📅 Future Enhancements
- 📅 Mobile App (if needed)

---

## Feature Requests

### From Users

Track feature requests and prioritize based on:
- User impact
- Business value
- Technical feasibility
- Development effort

### Process

1. Collect requests (GitHub Issues, User feedback)
2. Evaluate and prioritize
3. Add to roadmap
4. Communicate timeline

---

## File Reference

- Current Features: [FEATURES_AND_FLOWS.md](./FEATURES_AND_FLOWS.md)
- Production Plan: [PRODUCTION_PLAN.md](./PRODUCTION_PLAN.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)

