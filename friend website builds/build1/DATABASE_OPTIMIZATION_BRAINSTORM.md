# Database Optimization Brainstorm - Neon.com Free Tier

## Current Issues Identified

### 🔴 Critical Issues
1. **61 separate PrismaClient instances** - Each API route creates `new PrismaClient()`, potentially creating 61 connection pools
2. **Frequent database writes:**
   - Presence updates (every few seconds per active user)
   - Activity tracking (on every watch page navigation)
   - Search tracking (every search query)
   - Profile views (every profile view)
   - API request logging (every API call)
3. **N+1 query problems** - Multiple queries in loops (e.g., profile views fetching viewer info)
4. **No caching** - Every request hits the database
5. **Large growing tables:**
   - `Search` - Every search logged
   - `ProfileView` - Every profile view logged
   - `ApiRequestLog` - Every API call logged
   - `Presence` - Updated very frequently

---

## Optimization Strategies

### 1. **Single PrismaClient Instance (HIGH IMPACT)**
**Problem:** 61 separate `new PrismaClient()` instances = potential connection pool exhaustion

**Solution:** Create a singleton PrismaClient
- Create `src/lib/prisma.ts` with a single shared instance
- Import from there instead of creating new instances
- Configure connection pooling in the DATABASE_URL

**Impact:** Reduces connection overhead significantly
**Effort:** Low (30-60 min)
**Risk:** Low

---

### 2. **Implement Caching Layer (HIGH IMPACT)**
**Problem:** Every request hits the database, even for static/semi-static data

**Solutions:**

#### A. **Next.js Built-in Caching**
- Use `unstable_cache` for API routes
- Cache user profiles, stats, ratings (5-10 min TTL)
- Cache admin stats (1-5 min TTL)

#### B. **In-Memory Cache (Simple)**
- Use a Map/object for frequently accessed data
- Cache user lookups, role checks
- TTL-based expiration

#### C. **Redis (If needed later)**
- For more advanced caching needs
- But adds complexity and potentially another service

**Impact:** Reduces database queries by 50-80% for read-heavy endpoints
**Effort:** Medium (2-4 hours)
**Risk:** Low-Medium

---

### 3. **Reduce Frequent Writes (HIGH IMPACT)**

#### A. **Debounce/Throttle Presence Updates**
- Current: Updates every few seconds per user
- Solution: Batch updates or only update if changed significantly
- Use client-side debouncing (wait 10-30 seconds before sending)
- Or batch on server-side (collect updates, write every 30 seconds)

#### B. **Make Search Tracking Optional/Async**
- Current: Every search writes to DB immediately
- Solution: 
  - Make it optional (only for logged-in users)
  - Or batch writes (collect searches, write in batches)
  - Or use a queue/background job

#### C. **Reduce Profile View Tracking**
- Current: Every profile view creates a record
- Solution:
  - Only track unique views per user (already doing this, but can optimize)
  - Or limit to last 100 views per profile (delete old ones)
  - Or aggregate views (count per day instead of individual records)

#### D. **Reduce API Request Logging**
- Current: Every API call logged
- Solution:
  - Only log errors or slow requests
  - Or sample logging (log 1 in 10 requests)
  - Or log to file/separate service instead of DB

**Impact:** Reduces write operations by 60-90%
**Effort:** Medium (3-5 hours)
**Risk:** Low (can be done incrementally)

---

### 4. **Optimize Queries (MEDIUM IMPACT)**

#### A. **Fix N+1 Queries**
- Profile views: Use `include` or `select` with relations instead of loops
- Example: `prisma.profileView.findMany({ include: { viewer: true } })`

#### B. **Add Database Indexes**
- Check if indexes exist for frequently queried fields
- Add indexes for: `userId`, `createdAt`, `status`, etc.

#### C. **Use `select` Instead of Full Objects**
- Only fetch fields you need
- Reduces data transfer and memory

**Impact:** Reduces query time and connection usage
**Effort:** Low-Medium (1-3 hours)
**Risk:** Low

---

### 5. **Data Cleanup & Archiving (MEDIUM IMPACT)**

#### A. **Archive Old Data**
- Move old `Search` records (>30 days) to archive table or delete
- Move old `ProfileView` records (>90 days) or keep only last 100 per profile
- Move old `ApiRequestLog` records (>7 days) or delete
- Keep `Presence` records only for active users (delete inactive after 7 days)

#### B. **Regular Cleanup Job**
- Create a cron job or scheduled task
- Run daily/weekly to clean up old data
- Can use Vercel Cron Jobs or external service

**Impact:** Reduces database size and query time
**Effort:** Medium (2-4 hours)
**Risk:** Low (can test on staging first)

---

### 6. **Connection Pooling Configuration (MEDIUM IMPACT)**

**Problem:** Neon free tier has connection limits

**Solution:** Optimize DATABASE_URL connection string
```
postgresql://user:pass@host/db?connection_limit=5&pool_timeout=10
```

- Set `connection_limit` to match your needs (5-10 for free tier)
- Set `pool_timeout` to prevent hanging connections
- Use Prisma's connection pooling features

**Impact:** Better connection management
**Effort:** Low (15-30 min)
**Risk:** Low

---

### 7. **Move Non-Critical Data Out of Database (LOW-MEDIUM IMPACT)**

#### A. **File-Based Logging**
- Move `ApiRequestLog` to file system or external logging service
- Use services like Logtail, Axiom, or just file rotation

#### B. **External Analytics**
- Use Google Analytics, Plausible, or similar for search tracking
- Or use a lightweight analytics service

#### C. **Session Storage**
- Store some session data in cookies/JWT instead of DB
- Reduce presence update frequency

**Impact:** Reduces database writes
**Effort:** Medium-High (4-8 hours)
**Risk:** Medium (requires testing)

---

### 8. **Lazy Loading & Pagination (LOW-MEDIUM IMPACT)**

**Problem:** Loading too much data at once

**Solutions:**
- Paginate profile views, comments, search results
- Lazy load non-critical data
- Use infinite scroll or "load more" buttons

**Impact:** Reduces query size and time
**Effort:** Medium (2-4 hours)
**Risk:** Low

---

### 9. **Read Replicas (NOT APPLICABLE FOR FREE TIER)**
- Neon free tier doesn't support read replicas
- Would need paid tier

---

### 10. **Alternative: Hybrid Approach**

#### A. **Use SQLite for Some Data**
- Use SQLite for local/cache data
- Keep PostgreSQL for critical user data
- More complex but could work

#### B. **Use Edge Functions/Serverless DB**
- Some operations could use edge-compatible databases
- But Neon is already serverless

---

## Recommended Implementation Order

### Phase 1: Quick Wins (1-2 hours)
1. ✅ **Single PrismaClient instance** - Biggest impact, easiest fix
2. ✅ **Connection pooling configuration** - Quick config change
3. ✅ **Fix N+1 queries** - Simple query optimization

### Phase 2: Medium Impact (4-6 hours)
4. ✅ **Debounce presence updates** - Client-side throttling
5. ✅ **Add caching for read-heavy endpoints** - Next.js cache
6. ✅ **Reduce search/profile view logging** - Make optional or batch

### Phase 3: Data Management (2-4 hours)
7. ✅ **Data cleanup job** - Archive/delete old records
8. ✅ **Optimize indexes** - Ensure proper indexing

### Phase 4: Advanced (if still needed)
9. ⚠️ **Move logging to external service** - More complex
10. ⚠️ **Advanced caching with Redis** - Only if needed

---

## Estimated Impact

### Before Optimization:
- ~100-500 database operations per active user per hour
- Connection pool exhaustion risk
- High compute hours usage

### After Phase 1-2:
- ~20-50 database operations per active user per hour (60-80% reduction)
- Better connection management
- 50-70% reduction in compute hours

### After Phase 3:
- ~10-30 database operations per active user per hour (80-90% reduction)
- Smaller database = faster queries
- 70-85% reduction in compute hours

---

## Monitoring & Measurement

### Track These Metrics:
1. **Database connection count** - Should stay low
2. **Query count per endpoint** - Should decrease
3. **Write operations per hour** - Should decrease significantly
4. **Database size** - Should stabilize or decrease
5. **Neon compute hours usage** - Should decrease

### Tools:
- Neon dashboard (connection metrics)
- Prisma query logging (enable in dev)
- Vercel analytics (API route performance)

---

## Questions to Consider

1. **How many active users do you have?**
   - More users = more impact from optimizations

2. **What's your current compute hours usage?**
   - Helps prioritize which optimizations are most critical

3. **Which features are most important?**
   - Can we disable/limit some tracking features?

4. **Can we batch some operations?**
   - Presence updates, search tracking, etc.

5. **What's acceptable data retention?**
   - How long do we need to keep search logs, profile views, etc.?

---

## Next Steps

1. **Review this document** - Decide which optimizations make sense
2. **Start with Phase 1** - Quick wins with high impact
3. **Monitor results** - Check Neon dashboard after each change
4. **Iterate** - Continue with Phase 2-3 if needed

---

## Notes

- **Neon Free Tier Limits:**
  - Compute hours: Limited (varies by plan)
  - Connections: Limited
  - Storage: 0.5 GB (usually not the issue)
  - The main issue is **compute hours** from frequent queries

- **Trade-offs:**
  - Less logging = less analytics data
  - Caching = slightly stale data (usually acceptable)
  - Debouncing = slightly delayed updates (usually acceptable)

- **Testing:**
  - Test each optimization in development first
  - Monitor production after deployment
  - Can roll back if issues occur

